"use server";

import { requireSession } from "@/lib/auth";

import {
  availableModelOptions,
  getModelConfig,
  isSelectableModel,
  normalizeModelSelection,
} from "./models";
import {
  applyChangeProposalRecord,
  listChangeProposals,
  reviewChangeProposalRecord,
} from "./proposal";
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
  const session = await requireSession();
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
  const [messages, toolCalls, proposals] = await Promise.all([
    listMessages(userId, conversationId),
    listToolCalls(userId, conversationId),
    listChangeProposals(userId, conversationId),
  ]);
  return { messages, toolCalls, proposals };
}

export async function applyChatProposal(proposalId: number) {
  const userId = await requireUserId();
  return applyChangeProposalRecord(userId, proposalId);
}

export async function reviewChatProposal(
  proposalId: number,
  action: "rejected" | "revision_requested",
  note: string,
) {
  const userId = await requireUserId();
  return reviewChangeProposalRecord(userId, proposalId, action, note);
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
