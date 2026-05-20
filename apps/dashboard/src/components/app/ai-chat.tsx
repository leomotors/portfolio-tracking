"use client";

import {
  ChevronDown,
  History,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  deleteChatConversation,
  getChatBootstrap,
  loadChatMessages,
  updateChatConversationModel,
} from "@/lib/ai/actions";
import { cn } from "@/lib/utils";

type Bootstrap = Awaited<ReturnType<typeof getChatBootstrap>>;

interface ModelOption {
  id: string;
  provider: "openai" | "anthropic" | "xai";
  label: string;
  available: boolean;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  provider: "openai" | "anthropic" | "xai" | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  sources: unknown;
  createdAt: Date;
}

interface ToolCall {
  id: number;
  messageId: number | null;
  toolName: string;
  provider: string | null;
  model: string | null;
  input: unknown;
  output: unknown;
  costMicroUsd: number;
}

interface LiveToolCall {
  id: string;
  toolName: string;
  status: "input" | "running" | "done" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
}

type StreamEvent =
  | { type: "status"; label: string }
  | { type: "text-delta"; text: string }
  | { type: "source"; source: unknown }
  | LiveToolCallEvent
  | { type: "finish" }
  | { type: "error"; error: string };

type LiveToolCallEvent = {
  type: "tool";
  id: string;
  toolName: string;
  status: "input" | "running" | "done" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
};

const fmtCost = (microUsd: number) =>
  (microUsd / 1_000_000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });

const fmtTimestamp = (value: Date | string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtModelRate = (usdPerMillion: number) =>
  usdPerMillion.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });

function modelKey(model: ModelOption) {
  return `${model.provider}:${model.id}`;
}

function messageSources(sources: unknown) {
  if (!Array.isArray(sources)) return [];
  const seen = new Set<string>();
  const deduped = sources
    .map((source) => {
      if (!source || typeof source !== "object") return null;
      const s = source as { url?: unknown; title?: unknown };
      if (typeof s.url !== "string") return null;
      return {
        url: s.url,
        title: typeof s.title === "string" && s.title ? s.title : s.url,
      };
    })
    .filter((source): source is { url: string; title: string } =>
      Boolean(source),
    );
  return deduped
    .filter((source) => {
      const key = source.url + "\n" + source.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function summarize(value: unknown) {
  if (value == null) return "No output";
  if (typeof value === "string") return value.slice(0, 240);
  try {
    return JSON.stringify(value, null, 2).slice(0, 600);
  } catch {
    return String(value).slice(0, 240);
  }
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent-pri)] underline underline-offset-2"
          />
        ),
        code: ({ className, children, ...props }) => {
          const inline = !className;
          return inline ? (
            <code
              {...props}
              className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[0.9em]"
            >
              {children}
            </code>
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
        ol: (props) => (
          <ol {...props} className="ml-4 list-decimal space-y-1" />
        ),
        ul: (props) => <ul {...props} className="ml-4 list-disc space-y-1" />,
        p: (props) => <p {...props} className="mb-2 last:mb-0" />,
        pre: (props) => (
          <pre
            {...props}
            className="overflow-x-auto rounded-md bg-[var(--surface-2)] p-2 font-mono text-xs"
          />
        ),
        table: (props) => (
          <div className="overflow-x-auto">
            <table
              {...props}
              className="w-full border-collapse text-left text-xs"
            />
          </div>
        ),
        td: (props) => (
          <td
            {...props}
            className="border border-[var(--hairline)] px-2 py-1"
          />
        ),
        th: (props) => (
          <th
            {...props}
            className="border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AiChat({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [streamingStatus, setStreamingStatus] = useState("");
  const [liveToolCalls, setLiveToolCalls] = useState<LiveToolCall[]>([]);
  const [streamingSources, setStreamingSources] = useState<unknown[]>([]);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [error, setError] = useState<string | null>(null);
  const [draftModel, setDraftModel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => boot?.conversations.find((c) => c.id === activeId) ?? null,
    [activeId, boot],
  );
  const availableModels: ModelOption[] = boot?.models ?? [];
  const selectedModel = activeConversation
    ? `${activeConversation.defaultProvider}:${activeConversation.defaultModel}`
    : (draftModel ??
      modelKey(
        availableModels.find((m) => m.available) ??
          availableModels[0] ?? {
            provider: "openai",
            id: "gpt-5.4",
            label: "GPT-5.4",
            available: false,
            inputUsdPerMillion: 0,
            outputUsdPerMillion: 0,
          },
      ));
  const modelLocked = messages.length > 0 || isSending;

  const toolCallsByMessage = useMemo(() => {
    const map = new Map<number, ToolCall[]>();
    for (const call of toolCalls) {
      if (!call.messageId) continue;
      map.set(call.messageId, [...(map.get(call.messageId) ?? []), call]);
    }
    return map;
  }, [toolCalls]);

  const refreshBootstrap = () => {
    startTransition(async () => {
      const next = await getChatBootstrap();
      setBoot(next);
    });
  };

  useEffect(() => {
    if (open && !boot) refreshBootstrap();
  }, [open, boot]);

  useEffect(() => {
    if (!activeId) return;
    startTransition(async () => {
      const thread = await loadChatMessages(activeId);
      setMessages(thread.messages as Message[]);
      setToolCalls(thread.toolCalls as ToolCall[]);
    });
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streamingText, liveToolCalls, streamingStatus, open]);

  if (!open) return null;

  const startNewConversation = () => {
    setActiveId(null);
    setMessages([]);
    setToolCalls([]);
    setDraft("");
    setStreamingText("");
    setStreamingStatus("");
    setLiveToolCalls([]);
    setStreamingSources([]);
    setError(null);
    setView("chat");
  };

  const removeConversation = async (id: number) => {
    await deleteChatConversation(id);
    const next = await getChatBootstrap();
    setBoot(next);
    const fallback =
      activeId === id ? (next.conversations[0]?.id ?? null) : activeId;
    setActiveId(fallback);
    if (!fallback) {
      setMessages([]);
      setToolCalls([]);
      return;
    }
    const thread = await loadChatMessages(fallback);
    setMessages(thread.messages as Message[]);
    setToolCalls(thread.toolCalls as ToolCall[]);
  };

  const openConversation = async (id: number) => {
    setActiveId(id);
    setDraftModel(null);
    setView("chat");
    const thread = await loadChatMessages(id);
    setMessages(thread.messages as Message[]);
    setToolCalls(thread.toolCalls as ToolCall[]);
  };

  const changeModel = async (value: string) => {
    if (modelLocked) return;
    const [provider, model] = value.split(":");
    if (!provider || !model) return;
    if (!activeId) {
      setDraftModel(value);
      return;
    }
    const updated = await updateChatConversationModel(
      activeId,
      provider,
      model,
    );
    if (!updated) return;
    setBoot((current) =>
      current
        ? {
            ...current,
            conversations: [
              updated,
              ...current.conversations.filter((c) => c.id !== updated.id),
            ],
          }
        : current,
    );
  };

  const refreshAfterSend = async (conversationId: number | null) => {
    const next = await getChatBootstrap();
    setBoot(next);
    const id = conversationId ?? next.conversations[0]?.id ?? null;
    setActiveId(id);
    if (!id) {
      setMessages([]);
      setToolCalls([]);
      return;
    }
    const thread = await loadChatMessages(id);
    setMessages(thread.messages as Message[]);
    setToolCalls(thread.toolCalls as ToolCall[]);
  };

  const applyStreamEvent = (event: StreamEvent) => {
    switch (event.type) {
      case "status":
        setStreamingStatus(event.label);
        break;
      case "text-delta":
        setStreamingText((current) => current + event.text);
        setStreamingStatus("");
        break;
      case "source":
        setStreamingSources((current) => [...current, event.source]);
        break;
      case "tool":
        setLiveToolCalls((current) => {
          const nextCall = {
            id: event.id,
            toolName: event.toolName,
            status: event.status,
            input: event.input,
            output: event.output,
            error: event.error,
          } satisfies LiveToolCall;
          const existing = current.findIndex((call) => call.id === event.id);
          if (existing === -1) return [...current, nextCall];
          return current.map((call, index) =>
            index === existing ? { ...call, ...nextCall } : call,
          );
        });
        setStreamingStatus(
          event.status === "done"
            ? `${event.toolName} finished`
            : event.status === "error"
              ? `${event.toolName} failed`
              : `Waiting for ${event.toolName}`,
        );
        break;
      case "error":
        setError(event.error);
        break;
      case "finish":
        setStreamingStatus("");
        break;
    }
  };

  const parseStreamLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent;
    applyStreamEvent(event);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    setError(null);
    setStreamingText("");
    setStreamingStatus("Starting agent");
    setLiveToolCalls([]);
    setStreamingSources([]);
    setIsSending(true);

    const selected = availableModels.find((m) => modelKey(m) === selectedModel);
    const provider = activeConversation?.defaultProvider ?? selected?.provider;
    const model = activeConversation?.defaultModel ?? selected?.id;
    if (!provider || !model) {
      setError("No model is available. Add an API key and try again.");
      setIsSending(false);
      return;
    }

    const tempUser = {
      id: -Date.now(),
      conversationId: activeId ?? -1,
      role: "user",
      content: text,
      provider: null,
      model: null,
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
      sources: null,
      createdAt: new Date(),
    } satisfies Message;
    setMessages((current) => [...current, tempUser]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          provider,
          model,
          message: text,
        }),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "AI request failed");
      }
      const conversationIdHeader = response.headers.get("X-Conversation-Id");
      const conversationId = conversationIdHeader
        ? Number(conversationIdHeader)
        : null;
      if (conversationId && Number.isFinite(conversationId)) {
        setActiveId(conversationId);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) parseStreamLine(line);
      }
      buffered += decoder.decode();
      if (buffered.trim()) parseStreamLine(buffered);
      await refreshAfterSend(
        conversationId && Number.isFinite(conversationId)
          ? conversationId
          : activeId,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setIsSending(false);
      setStreamingText("");
      setStreamingStatus("");
      setLiveToolCalls([]);
      setStreamingSources([]);
    }
  };

  return (
    <aside className="flex h-dvh min-h-0 flex-col bg-[var(--bg)] shadow-[-12px_0_30px_rgba(0,0,0,0.06)]">
      <div className="border-b border-[var(--hairline)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">AI Agent</div>
            <div className="text-[11px] text-[var(--ink-3)]">
              {view === "history"
                ? "Chat history"
                : `All time ${fmtCost(boot?.allConversationCostMicroUsd ?? 0)}`}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={view === "history" ? "default" : "outline"}
              size="icon"
              title="Chat history"
              onClick={() =>
                setView((current) =>
                  current === "history" ? "chat" : "history",
                )
              }
            >
              <History size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="New chat"
              onClick={startNewConversation}
            >
              <Plus size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Close AI agent"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </div>

      {view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">All chats</div>
              <div className="text-[11px] text-[var(--ink-3)]">
                Total {fmtCost(boot?.allConversationCostMicroUsd ?? 0)}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startNewConversation}
            >
              <Plus size={14} />
              New
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {(boot?.conversations ?? []).map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md border border-[var(--hairline)] bg-[var(--surface)] p-3",
                  activeId === conversation.id &&
                    "ring-1 ring-[var(--accent-pri)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare
                      size={14}
                      className="flex-shrink-0 text-[var(--ink-3)]"
                    />
                    <div className="truncate text-sm font-medium">
                      {conversation.title}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[var(--ink-3)]">
                    <span className="truncate">
                      {conversation.defaultProvider} ·{" "}
                      {conversation.defaultModel}
                    </span>
                    <span className="num flex-shrink-0">
                      {fmtCost(conversation.totalCostMicroUsd)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[var(--ink-3)]">
                    Updated {fmtTimestamp(conversation.updatedAt)}
                  </div>
                </button>
                <button
                  type="button"
                  title="Delete chat"
                  onClick={() => void removeConversation(conversation.id)}
                  className="grid h-8 w-8 place-items-center rounded-md text-[var(--ink-3)] hover:bg-[var(--hover)] hover:text-[var(--accent-neg)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {boot && boot.conversations.length === 0 && (
              <div className="rounded-md border border-[var(--hairline)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-3)]">
                No chats yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <main className="flex min-h-0 min-w-0 flex-col">
          <div className="border-b border-[var(--hairline)] px-4 py-3">
            <div className="mb-2 truncate text-sm font-medium">
              {activeConversation?.title ?? "New chat"}
            </div>
            <label className="relative block">
              <select
                className="h-9 w-full appearance-none rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-3 pr-8 text-xs outline-none disabled:opacity-60"
                value={selectedModel}
                disabled={modelLocked}
                onChange={(event) => void changeModel(event.target.value)}
              >
                {availableModels.map((model) => (
                  <option
                    key={modelKey(model)}
                    value={modelKey(model)}
                    disabled={!model.available}
                  >
                    {model.label}
                    {" · "}
                    {fmtModelRate(model.inputUsdPerMillion)}$ /{" "}
                    {fmtModelRate(model.outputUsdPerMillion)}$ per 1M
                    {!model.available ? " · key missing" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-2.5 right-2 text-[var(--ink-3)]"
                size={14}
              />
            </label>
            <div className="mt-2 text-[11px] text-[var(--ink-3)]">
              {modelLocked
                ? "Model is locked after the first message."
                : "Choose the model for this chat."}{" "}
              Conversation {fmtCost(activeConversation?.totalCostMicroUsd ?? 0)}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain px-4 py-3">
            {!boot || isPending ? (
              <div className="text-xs text-[var(--ink-3)]">Loading...</div>
            ) : messages.length === 0 && !streamingText ? (
              <div className="pt-10 text-center text-sm text-[var(--ink-3)]">
                Ask about your portfolio, markets, or current context.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message) => {
                  const calls = toolCallsByMessage.get(message.id) ?? [];
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[92%] rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "ml-auto bg-[var(--ink)] text-[var(--bg)]"
                          : "bg-[var(--surface)] text-[var(--ink)]",
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownContent content={message.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {message.content}
                        </div>
                      )}

                      {message.role === "assistant" && (
                        <>
                          {calls.length > 0 && (
                            <details className="mt-2 rounded border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1 text-[11px]">
                              <summary className="cursor-pointer text-[var(--ink-2)]">
                                Tools used ({calls.length})
                              </summary>
                              <div className="mt-2 flex flex-col gap-2">
                                {calls.map((call) => (
                                  <div
                                    key={call.id}
                                    className="border-t border-[var(--hairline)] pt-2"
                                  >
                                    <div className="font-medium">
                                      {call.toolName}{" "}
                                      <span className="font-normal text-[var(--ink-3)]">
                                        {call.model ?? call.provider ?? ""}
                                      </span>
                                    </div>
                                    <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-[var(--surface)] p-2 font-mono text-[10px]">
                                      {summarize(call.output)}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          {messageSources(message.sources).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {messageSources(message.sources).map(
                                (source, index) => (
                                  <a
                                    key={`${source.url}-${index}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="max-w-full truncate rounded border border-[var(--hairline)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)] hover:bg-[var(--hover)]"
                                  >
                                    {source.title}
                                  </a>
                                ),
                              )}
                            </div>
                          )}
                          <div className="mt-1 text-[10px] text-[var(--ink-3)]">
                            {message.model ?? "AI"} ·{" "}
                            {fmtCost(message.costMicroUsd)}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {(streamingStatus || liveToolCalls.length > 0) && (
                  <div className="max-w-[92%] rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-2)]">
                    {streamingStatus && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-pri)]" />
                        <span>{streamingStatus}</span>
                      </div>
                    )}
                    {liveToolCalls.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {liveToolCalls.map((call) => (
                          <div
                            key={call.id}
                            className="rounded border border-[var(--hairline)] bg-[var(--surface)] px-2 py-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[var(--ink)]">
                                {call.toolName}
                              </span>
                              <span className="text-[10px] uppercase text-[var(--ink-3)]">
                                {call.status}
                              </span>
                            </div>
                            {call.status === "running" &&
                              call.input != null && (
                                <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-[var(--ink-3)]">
                                  {summarize(call.input)}
                                </pre>
                              )}
                            {call.status === "done" && call.output != null && (
                              <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-[var(--ink-3)]">
                                {summarize(call.output)}
                              </pre>
                            )}
                            {call.status === "error" && call.error && (
                              <div className="mt-1 text-[10px] text-[var(--accent-neg)]">
                                {call.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {streamingText && (
                  <div className="max-w-[92%] rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
                    <MarkdownContent content={streamingText} />
                    {messageSources(streamingSources).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {messageSources(streamingSources).map(
                          (source, index) => (
                            <a
                              key={`${source.url}-${index}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-full truncate rounded border border-[var(--hairline)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)] hover:bg-[var(--hover)]"
                            >
                              {source.title}
                            </a>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="border-t border-[var(--hairline)] px-4 py-2 text-xs text-[var(--accent-neg)]">
              {error}
            </div>
          )}
          <form
            className="border-t border-[var(--hairline)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-pri)]"
                placeholder="Ask anything..."
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSending || !draft.trim()}
              >
                <Send size={16} />
              </Button>
            </div>
          </form>
        </main>
      )}
    </aside>
  );
}
