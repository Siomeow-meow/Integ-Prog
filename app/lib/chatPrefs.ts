"use client";

// Read-state has no backend model in the current Prisma schema (no
// Message.readAt), so it's tracked client-side per browser for now.
// If/when that gets added server-side, swap this out for a real API call —
// the only call site is ConversationList's "Unread" filter.

function readKey(userId: string) {
  return `cg-chat-read:${userId}`;
}

export function getReadMap(userId: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(readKey(userId)) ?? "{}");
  } catch {
    return {};
  }
}

export function markConversationRead(userId: string, conversationId: string) {
  try {
    const map = getReadMap(userId);
    map[conversationId] = new Date().toISOString();
    localStorage.setItem(readKey(userId), JSON.stringify(map));
  } catch {
    // localStorage unavailable — unread tracking degrades to "everything read"
  }
}

export function isUnread(
  userId: string,
  conversationId: string,
  lastMessageAt: string | undefined,
  lastMessageSenderId: string | undefined,
): boolean {
  if (!lastMessageAt || !lastMessageSenderId) return false;
  if (lastMessageSenderId === userId) return false; // I sent it — not unread
  const map = getReadMap(userId);
  const readAt = map[conversationId];
  if (!readAt) return true;
  return new Date(lastMessageAt).getTime() > new Date(readAt).getTime();
}
