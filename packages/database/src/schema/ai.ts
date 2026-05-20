import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const aiMessageRole = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const aiConversationTable = pgTable("ai_conversation", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  title: text().notNull().default("New chat"),
  defaultProvider: text("default_provider").notNull(),
  defaultModel: text("default_model").notNull(),
  totalInputTokens: integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
  totalCostMicroUsd: integer("total_cost_micro_usd").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiMessageTable = pgTable("ai_message", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id")
    .references(() => aiConversationTable.id, { onDelete: "cascade" })
    .notNull(),
  role: aiMessageRole().notNull(),
  content: text().notNull(),
  provider: text(),
  model: text(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costMicroUsd: integer("cost_micro_usd").notNull().default(0),
  rawUsage: jsonb("raw_usage"),
  sources: jsonb(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiToolCallTable = pgTable("ai_tool_call", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id")
    .references(() => aiConversationTable.id, { onDelete: "cascade" })
    .notNull(),
  messageId: integer("message_id").references(() => aiMessageTable.id, {
    onDelete: "cascade",
  }),
  toolName: text("tool_name").notNull(),
  provider: text(),
  model: text(),
  input: jsonb(),
  output: jsonb(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costMicroUsd: integer("cost_micro_usd").notNull().default(0),
  rawUsage: jsonb("raw_usage"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
