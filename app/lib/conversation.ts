import { db, type LocalConversation } from "./db";

function toApiConversation(c: LocalConversation) {
  const store = db.loadStore();
  const messages = store.messages
    .filter((m) => m.conversationId === c.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => {
      const sender = db.getUserById(m.senderId);
      return {
        id: m.id,
        conversation: m.conversationId,
        conversationId: m.conversationId,
        senderId: m.senderId,
        sender: { userName: sender?.userName ?? "Unknown", profileImg: sender?.profileImg ?? "" },
        content: m.content,
        createdAt: m.createdAt,
        replies: [],
      };
    });
  return {
    id: c.id,
    isGroup: c.isGroup,
    participants: c.participantIds.map((pid) => {
      const u = db.getUserById(pid);
      return {
        participantId: pid,
        participant: { id: pid, userName: u?.userName ?? "Unknown", profileImg: u?.profileImg ?? "" },
      };
    }),
    messages,
  };
}

export async function getConversations(_token?: any) {
  const store = db.loadStore();
  return store.conversations.map(toApiConversation);
}

export async function getConversation(id: number, _token?: any) {
  const store = db.loadStore();
  const c = store.conversations.find((c) => c.id === Number(id));
  if (!c) return null;
  return toApiConversation(c);
}

export async function getUserConversations(id: string, _token?: any) {
  const store = db.loadStore();
  return store.conversations.filter((c) => c.participantIds.includes(id)).map(toApiConversation);
}

export function findOrCreateDirectConversation(userA: string, userB: string): LocalConversation {
  const store = db.loadStore();
  const existing = store.conversations.find(
    (c) => !c.isGroup && c.participantIds.includes(userA) && c.participantIds.includes(userB),
  );
  if (existing) return existing;
  const conv: LocalConversation = {
    id: db.nextId(),
    isGroup: false,
    participantIds: [userA, userB],
    createdAt: new Date().toISOString(),
  };
  store.conversations.push(conv);
  db.saveConversations(store.conversations);
  return conv;
}

export async function getDirectConversation(otherUserId: string, _token?: any) {
  const viewer = db.getCurrentUserId();
  if (!viewer) return null;
  const store = db.loadStore();
  const existing = store.conversations.find(
    (c) => !c.isGroup && c.participantIds.includes(viewer) && c.participantIds.includes(otherUserId),
  );
  return existing ? toApiConversation(existing) : null;
}

export async function createGroupConversation(request: { participants: string[] }, _token?: any) {
  if (request.participants.length < 3) {
    throw new Error("Must have more than 2 participants to create a group chat");
  }
  const store = db.loadStore();
  const conv: LocalConversation = {
    id: db.nextId(),
    isGroup: true,
    participantIds: request.participants,
    createdAt: new Date().toISOString(),
  };
  store.conversations.push(conv);
  db.saveConversations(store.conversations);
  return toApiConversation(conv);
}

export async function getMessages(id: number, _token?: any) {
  const conv = await getConversation(id);
  return conv?.messages ?? [];
}

export async function deleteMessage(_conversationId: number, messageId: number, _token?: any) {
  const store = db.loadStore();
  store.messages = store.messages.filter((m) => m.id !== messageId);
  db.saveMessages(store.messages);
  return { success: true };
}

export async function getGroupChatMembers(id: string, _token?: any) {
  const { getGroupMembers } = await import("./group");
  return getGroupMembers(id);
}

export async function kickChatMember(conversationId: number, memberId: string, _token?: any) {
  const store = db.loadStore();
  const idx = store.conversations.findIndex((c) => c.id === conversationId);
  if (idx !== -1) {
    store.conversations[idx] = {
      ...store.conversations[idx],
      participantIds: store.conversations[idx].participantIds.filter((p) => p !== memberId),
    };
    db.saveConversations(store.conversations);
  }
  return { success: true };
}

export async function inviteChatMember(conversationId: number, userId: string, _token?: any) {
  const store = db.loadStore();
  const idx = store.conversations.findIndex((c) => c.id === conversationId);
  if (idx !== -1 && !store.conversations[idx].participantIds.includes(userId)) {
    store.conversations[idx] = {
      ...store.conversations[idx],
      participantIds: [...store.conversations[idx].participantIds, userId],
    };
    db.saveConversations(store.conversations);
  }
  return { success: true };
}
