import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  aiConversationTable,
  aiMessageTable,
  aiToolCallTable,
} from "@repo/database/schema";

import {
  type AiProvider,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  normalizeModelSelection,
} from "./models";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatConversation {
  id: number;
  title: string;
  defaultProvider: AiProvider;
  defaultModel: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostMicroUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: ChatRole;
  content: string;
  provider: AiProvider | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  sources: unknown;
  createdAt: Date;
}

export interface ChatToolCall {
  id: number;
  conversationId: number;
  messageId: number | null;
  toolName: string;
  provider: string | null;
  model: string | null;
  input: unknown;
  output: unknown;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  createdAt: Date;
}

export interface ToolCallInsert {
  conversationId: number;
  messageId?: number | null;
  toolName: string;
  provider?: string | null;
  model?: string | null;
  input?: unknown;
  output?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  costMicroUsd?: number;
  rawUsage?: unknown;
}

const asProvider = (value: string | null): AiProvider | null =>
  value === "openai" || value === "anthropic" || value === "xai" ? value : null;

function mapConversation(row: typeof aiConversationTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    defaultProvider: asProvider(row.defaultProvider) ?? DEFAULT_AI_PROVIDER,
    defaultModel: row.defaultModel,
    totalInputTokens: row.totalInputTokens,
    totalOutputTokens: row.totalOutputTokens,
    totalCostMicroUsd: row.totalCostMicroUsd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } satisfies ChatConversation;
}

function mapMessage(row: typeof aiMessageTable.$inferSelect) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    provider: asProvider(row.provider),
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costMicroUsd: row.costMicroUsd,
    sources: row.sources,
    createdAt: row.createdAt,
  } satisfies ChatMessage;
}

function mapToolCall(row: typeof aiToolCallTable.$inferSelect) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId,
    toolName: row.toolName,
    provider: row.provider,
    model: row.model,
    input: row.input,
    output: row.output,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costMicroUsd: row.costMicroUsd,
    createdAt: row.createdAt,
  } satisfies ChatToolCall;
}

export async function createConversation(
  userId: string,
  provider = process.env.AI_DEFAULT_PROVIDER ?? DEFAULT_AI_PROVIDER,
  model = process.env.AI_DEFAULT_MODEL ?? DEFAULT_AI_MODEL,
) {
  const normalized = normalizeModelSelection(provider, model);
  const [row] = await db
    .insert(aiConversationTable)
    .values({
      userId,
      defaultProvider: normalized.provider,
      defaultModel: normalized.model,
    })
    .returning();
  return mapConversation(row);
}

export async function listConversations(userId: string) {
  const rows = await db
    .select()
    .from(aiConversationTable)
    .where(eq(aiConversationTable.userId, userId))
    .orderBy(desc(aiConversationTable.updatedAt));
  return rows.map(mapConversation);
}

export async function getConversation(userId: string, id: number) {
  const [row] = await db
    .select()
    .from(aiConversationTable)
    .where(
      and(
        eq(aiConversationTable.id, id),
        eq(aiConversationTable.userId, userId),
      ),
    );
  return row ? mapConversation(row) : null;
}

export async function renameConversation(
  userId: string,
  id: number,
  title: string,
) {
  const safeTitle = title.trim().slice(0, 80) || "New chat";
  const [row] = await db
    .update(aiConversationTable)
    .set({ title: safeTitle, updatedAt: new Date() })
    .where(
      and(
        eq(aiConversationTable.id, id),
        eq(aiConversationTable.userId, userId),
      ),
    )
    .returning();
  return row ? mapConversation(row) : null;
}

export async function updateConversationModel(
  userId: string,
  id: number,
  provider: string,
  model: string,
) {
  const existingMessages = await listMessages(userId, id);
  if (existingMessages.length > 0) {
    throw new Error("Model cannot be changed after a chat has started");
  }
  const normalized = normalizeModelSelection(provider, model);
  const [row] = await db
    .update(aiConversationTable)
    .set({
      defaultProvider: normalized.provider,
      defaultModel: normalized.model,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiConversationTable.id, id),
        eq(aiConversationTable.userId, userId),
      ),
    )
    .returning();
  return row ? mapConversation(row) : null;
}

export async function deleteConversation(userId: string, id: number) {
  await db
    .delete(aiConversationTable)
    .where(
      and(
        eq(aiConversationTable.id, id),
        eq(aiConversationTable.userId, userId),
      ),
    );
}

export async function listMessages(userId: string, conversationId: number) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return [];
  const rows = await db
    .select()
    .from(aiMessageTable)
    .where(eq(aiMessageTable.conversationId, conversationId))
    .orderBy(aiMessageTable.createdAt, aiMessageTable.id);
  return rows.map(mapMessage);
}

export async function listToolCalls(userId: string, conversationId: number) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return [];
  const rows = await db
    .select()
    .from(aiToolCallTable)
    .where(eq(aiToolCallTable.conversationId, conversationId))
    .orderBy(aiToolCallTable.createdAt, aiToolCallTable.id);
  return rows.map(mapToolCall);
}

export async function appendMessage(input: {
  conversationId: number;
  role: ChatRole;
  content: string;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  costMicroUsd?: number;
  rawUsage?: unknown;
  sources?: unknown;
}) {
  const [row] = await db
    .insert(aiMessageTable)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      costMicroUsd: input.costMicroUsd ?? 0,
      rawUsage: input.rawUsage ?? null,
      sources: input.sources ?? null,
    })
    .returning();
  await touchConversation(input.conversationId);
  return mapMessage(row);
}

export async function appendToolCalls(calls: ToolCallInsert[]) {
  if (calls.length === 0) return;
  await db.insert(aiToolCallTable).values(
    calls.map((call) => ({
      conversationId: call.conversationId,
      messageId: call.messageId ?? null,
      toolName: call.toolName,
      provider: call.provider ?? null,
      model: call.model ?? null,
      input: call.input ?? null,
      output: call.output ?? null,
      inputTokens: call.inputTokens ?? 0,
      outputTokens: call.outputTokens ?? 0,
      costMicroUsd: call.costMicroUsd ?? 0,
      rawUsage: call.rawUsage ?? null,
    })),
  );
}

export async function addConversationUsage(input: {
  conversationId: number;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
}) {
  await db
    .update(aiConversationTable)
    .set({
      totalInputTokens: sql`${aiConversationTable.totalInputTokens} + ${input.inputTokens}`,
      totalOutputTokens: sql`${aiConversationTable.totalOutputTokens} + ${input.outputTokens}`,
      totalCostMicroUsd: sql`${aiConversationTable.totalCostMicroUsd} + ${input.costMicroUsd}`,
      updatedAt: new Date(),
    })
    .where(eq(aiConversationTable.id, input.conversationId));
}

export async function getAllConversationCost(userId: string) {
  const rows = await db
    .select({
      total: sql<number>`sum(${aiConversationTable.totalCostMicroUsd})`,
    })
    .from(aiConversationTable)
    .where(eq(aiConversationTable.userId, userId));
  return Number(rows[0]?.total ?? 0);
}

async function touchConversation(conversationId: number) {
  await db
    .update(aiConversationTable)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversationTable.id, conversationId));
}
