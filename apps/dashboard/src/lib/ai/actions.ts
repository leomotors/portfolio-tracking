"use server";

import { getSession } from "@/lib/auth";

import {
  availableModelOptions,
  getModelConfig,
  isSelectableModel,
  normalizeModelSelection,
} from "./models";
import {
  createConversation,
  deleteConversation,
  getAllConversationCost,
  listConversations,
  listMessages,
  listToolCalls,
  renameConversation,
  updateConversationModel,
} from "./store";

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.uid;
}

export async function getChatBootstrap() {
  const userId = await requireUserId();
  const conversations = await listConversations(userId);
  return {
    conversations: conversations.map((conversation) => ({
      ...conversation,
      defaultModelLabel:
        getModelConfig(conversation.defaultModel)?.label ??
        conversation.defaultModel,
      defaultModelRetired: !isSelectableModel(conversation.defaultModel),
    })),
    models: availableModelOptions(),
    allConversationCostMicroUsd: await getAllConversationCost(userId),
  };
}

export async function createChatConversation(provider: string, model: string) {
  const userId = await requireUserId();
  const normalized = normalizeModelSelection(provider, model, {
    allowRetired: false,
  });
  return createConversation(userId, normalized.provider, normalized.model);
}

export async function loadChatMessages(conversationId: number) {
  const userId = await requireUserId();
  const [messages, toolCalls] = await Promise.all([
    listMessages(userId, conversationId),
    listToolCalls(userId, conversationId),
  ]);
  return { messages, toolCalls };
}

export async function renameChatConversation(id: number, title: string) {
  const userId = await requireUserId();
  return renameConversation(userId, id, title);
}

export async function deleteChatConversation(id: number) {
  const userId = await requireUserId();
  await deleteConversation(userId, id);
}

export async function updateChatConversationModel(
  id: number,
  provider: string,
  model: string,
) {
  const userId = await requireUserId();
  return updateConversationModel(userId, id, provider, model);
}
