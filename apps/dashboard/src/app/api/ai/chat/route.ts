import { type ModelMessage, stepCountIs, streamText } from "ai";
import { type NextRequest, NextResponse } from "next/server";

import {
  estimateModelCostMicroUsd,
  formatMicroUsd,
  tokenCounts,
  usageToRecord,
} from "@/lib/ai/cost";
import {
  createLanguageModel,
  getModelConfig,
  normalizeModelSelection,
  providerHasApiKey,
} from "@/lib/ai/models";
import {
  addConversationUsage,
  appendMessage,
  appendToolCalls,
  type ChatMessage,
  createConversation,
  getConversation,
  listMessages,
  renameConversation,
  type ToolCallInsert,
} from "@/lib/ai/store";
import { createPortfolioTools } from "@/lib/ai/tools";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  conversationId?: number | null;
  provider: string;
  model: string;
  message: string;
}

type StreamEvent =
  | { type: "status"; label: string }
  | { type: "text-delta"; text: string }
  | { type: "source"; source: unknown }
  | {
      type: "tool";
      id: string;
      status: "input" | "running" | "done" | "error";
      toolName: string;
      input?: unknown;
      output?: unknown;
      error?: string;
    }
  | { type: "finish" }
  | { type: "error"; error: string };

const SYSTEM_PROMPT = `You are a read-only portfolio AI agent for a personal investment dashboard.
Use the provided tools for portfolio facts; never claim direct database access and never ask for SQL.
For current market, company, economic, or social context, use search tools and cite sources in the answer.
Be concise, numeric, and explicit about uncertainty. Do not provide financial advice as a directive; frame tradeoffs and observations.`;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeBody(body: unknown): ChatRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Partial<ChatRequestBody>;
  if (typeof b.provider !== "string") return null;
  if (typeof b.model !== "string") return null;
  if (typeof b.message !== "string" || b.message.trim().length === 0) {
    return null;
  }
  return {
    conversationId:
      typeof b.conversationId === "number" ? b.conversationId : null,
    provider: b.provider,
    model: b.model,
    message: b.message.trim().slice(0, 8_000),
  };
}

function toModelMessages(messages: ChatMessage[]) {
  const chatMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
  return chatMessages.slice(-30).map((message) => {
    if (message.role === "user") {
      return { role: "user", content: message.content } satisfies ModelMessage;
    }
    return {
      role: "assistant",
      content: message.content,
    } satisfies ModelMessage;
  });
}

function collectToolCalls(
  event: {
    steps: Array<{
      model: { provider: string; modelId: string };
      toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        input?: unknown;
      }>;
      toolResults: Array<{
        toolCallId: string;
        output?: unknown;
      }>;
    }>;
  },
  conversationId: number,
) {
  const calls: ToolCallInsert[] = [];
  for (const step of event.steps) {
    const resultsById = new Map(
      step.toolResults.map((result) => [result.toolCallId, result]),
    );
    for (const call of step.toolCalls) {
      const result = resultsById.get(call.toolCallId);
      calls.push({
        conversationId,
        toolName: call.toolName,
        provider: step.model.provider,
        model: step.model.modelId,
        input: "input" in call ? call.input : null,
        output: result && "output" in result ? result.output : null,
      });
    }
  }
  return calls;
}

function safePayload(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function ndjson(event: StreamEvent) {
  return JSON.stringify(event) + "\n";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return badRequest("Unauthorized", 401);

  let body: ChatRequestBody | null;
  try {
    body = sanitizeBody(await request.json());
  } catch {
    return badRequest("Invalid JSON");
  }
  if (!body) return badRequest("Invalid chat request");

  const selection = normalizeModelSelection(body.provider, body.model, {
    allowRetired: Boolean(body.conversationId),
  });
  const modelConfig = getModelConfig(selection.model);
  if (!modelConfig || modelConfig.provider !== selection.provider) {
    return badRequest("Unsupported model");
  }
  if (!providerHasApiKey(selection.provider)) {
    return badRequest(`Missing API key for ${selection.provider}`, 400);
  }

  const isNewConversation = !body.conversationId;
  const conversation = body.conversationId
    ? await getConversation(session.uid, body.conversationId)
    : await createConversation(
        session.uid,
        selection.provider,
        selection.model,
      );
  if (!conversation) return badRequest("Conversation not found", 404);
  const priorMessages = await listMessages(session.uid, conversation.id);
  if (
    (isNewConversation || conversation.title === "New chat") &&
    priorMessages.length === 0
  ) {
    await renameConversation(session.uid, conversation.id, body.message);
  }

  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: body.message,
  });

  const messages = toModelMessages([
    ...priorMessages,
    ...(await listMessages(session.uid, conversation.id)).slice(-1),
  ]);
  const toolLogs: ToolCallInsert[] = [];
  const tools = createPortfolioTools({
    conversationId: conversation.id,
    toolLogs,
  });

  const result = streamText({
    model: createLanguageModel(selection.provider, selection.model),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(8),
    providerOptions:
      selection.provider === "openai"
        ? { openai: { store: false, parallelToolCalls: true } }
        : undefined,
    onFinish: async (event) => {
      const usage = usageToRecord(event.totalUsage);
      const mainCost = estimateModelCostMicroUsd(
        selection.model,
        event.totalUsage,
      );
      const nestedToolCost = toolLogs.reduce(
        (sum, call) => sum + (call.costMicroUsd ?? 0),
        0,
      );
      const costMicroUsd = mainCost + nestedToolCost;
      const sources = [
        ...event.sources,
        ...toolLogs.flatMap((log) => {
          const output = log.output as { sources?: unknown } | null | undefined;
          return Array.isArray(output?.sources) ? output.sources : [];
        }),
      ];
      const assistant = await appendMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: event.text,
        provider: selection.provider,
        model: selection.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costMicroUsd,
        rawUsage: usage.rawUsage,
        sources,
      });
      await appendToolCalls([
        ...collectToolCalls(event, conversation.id).map((call) => ({
          ...call,
          messageId: assistant.id,
        })),
        ...toolLogs.map((call) => ({ ...call, messageId: assistant.id })),
      ]);
      const counts = tokenCounts(event.totalUsage);
      await addConversationUsage({
        conversationId: conversation.id,
        inputTokens: counts.inputTokens,
        outputTokens: counts.outputTokens,
        costMicroUsd,
      });
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(ndjson(event)));
      };

      send({ type: "status", label: "Starting agent" });
      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case "start-step":
              send({ type: "status", label: "Thinking" });
              break;
            case "text-delta":
              send({ type: "text-delta", text: part.text });
              break;
            case "source":
              send({ type: "source", source: safePayload(part) });
              break;
            case "tool-input-start":
              send({
                type: "tool",
                id: part.id,
                status: "input",
                toolName: part.toolName,
              });
              break;
            case "tool-call":
              send({
                type: "tool",
                id: part.toolCallId,
                status: "running",
                toolName: part.toolName,
                input: safePayload("input" in part ? part.input : null),
              });
              break;
            case "tool-result":
              send({
                type: "tool",
                id: part.toolCallId,
                status: "done",
                toolName: part.toolName,
                output: safePayload("output" in part ? part.output : null),
              });
              break;
            case "tool-error":
              send({
                type: "tool",
                id: part.toolCallId,
                status: "error",
                toolName: part.toolName,
                error: String(part.error),
              });
              break;
            case "finish-step":
              send({ type: "status", label: "Composing answer" });
              break;
            case "finish":
              send({ type: "finish" });
              break;
            case "error":
              send({
                type: "error",
                error:
                  part.error instanceof Error
                    ? part.error.message
                    : String(part.error),
              });
              break;
          }
        }
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "AI request failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Conversation-Id": String(conversation.id),
      "X-Model": selection.model,
      "X-Provider": selection.provider,
      "X-Estimated-Unit": formatMicroUsd(0),
    },
  });
}
