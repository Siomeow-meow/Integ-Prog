/**
 * Stand-in for the real websocket connection. There's no server here, so
 * "sending a message" just writes it straight to localStorage and notifies
 * any listeners in this tab synchronously — same external API as the real
 * websocket module (connectChat/sendMessage/onConnectionStatusChange/
 * onMessage) so app/lib/useMessages.ts didn't need to change.
 */
import { db } from "@/app/lib/db";
import { findOrCreateDirectConversation } from "@/app/lib/conversation";

const OPEN = 1;
const CLOSED = 3;

let status = CLOSED;
let statusListeners: ((status: number) => void)[] = [];
let messageListeners: ((data: any) => void)[] = [];

export function connectChat(_userId: string) {
  status = OPEN;
  statusListeners.forEach((l) => l(status));
}

export function onConnectionStatusChange(listener: (status: number) => void) {
  statusListeners.push(listener);
  // Fire immediately with current status — the real socket only notified on
  // state-change events, but since connectChat() above already ran
  // synchronously by the time most callers register a listener, replaying
  // the current status here keeps behaviour equivalent.
  listener(status);
}

export function sendMessage(content: string, senderId: string, receiverId: string) {
  const conv = findOrCreateDirectConversation(senderId, receiverId);
  const store = db.loadStore();
  const message = {
    id: db.nextId(),
    conversationId: conv.id,
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };
  store.messages.push(message);
  db.saveMessages(store.messages);

  const sender = db.getUserById(senderId);
  const payload = {
    type: "message",
    message: {
      id: message.id,
      conversation: conv.id,
      conversationId: conv.id,
      senderId,
      sender: { userName: sender?.userName ?? "Unknown", profileImg: sender?.profileImg ?? "" },
      content,
      createdAt: message.createdAt,
      replies: [],
    },
  };
  // Simulate the async nature of a real socket round trip.
  setTimeout(() => {
    messageListeners.forEach((l) => l(payload));
  }, 0);
}

export function onMessage(listener: (data: any) => void) {
  messageListeners.push(listener);
  return () => {
    messageListeners = messageListeners.filter((l) => l !== listener);
  };
}
