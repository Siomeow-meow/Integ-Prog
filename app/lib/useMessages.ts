"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  getConversation,
  getMessages,
  getUserConversations,
} from "./conversation";
import { markConversationRead } from "./chatPrefs";
import {
  connectChat,
  onConnectionStatusChange,
  onMessage,
  sendMessage as sendWsMessage,
} from "@/app/util/websocket";
import Conversation, { Message } from "@/app/types/conversation";

// Owns loading + real-time updates for one open thread. `conversationId`
// can be undefined (no conversation exists yet — e.g. first message to a
// friend); in that case the conversation is created implicitly by the
// backend on first send, and we pick up its id from the websocket echo.
export function useMessages(
  conversationId: string | number | undefined,
  otherUserId: string | undefined,
  onConversationResolved?: (conversationId: string) => void,
) {
  const { userId, getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function verifyConversation() {
      if (!userId) {
        return;
      }
      if (!conversationId) {
        setAuthLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const existingConversation = await getConversation(
          Number(conversationId),
          token,
        );

        if (!existingConversation) {
          if (!cancelled) {
            setAuthLoading(false);
            setError("401");
          }

          console.log("No existing convo");
          return;
        }

        const isParticipant = existingConversation.participants.some(
          (user: any) => user.participantId === userId,
        );

        if (!cancelled) {
          if (!isParticipant) {
            setError("401");
          }

          setAuthLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("404");
      }
    }

    verifyConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, userId, getToken]);

  // Open (or reuse) the websocket connection as soon as we know who we are.
  useEffect(() => {
    if (!userId || error === "401") return;
    connectChat(userId);
    onConnectionStatusChange((status: number) => {
      setConnected(status === WebSocket.OPEN);
    });
  }, [userId, error]);

  const load = useCallback(async () => {
    if (error === "401") {
      setMessages([]);
      setLoading(false);
      return;
    }
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getMessages(Number(conversationId), token);
      if (!mountedRef.current) return;
      setMessages(Array.isArray(data) ? data : []);
      if (userId) markConversationRead(userId, String(conversationId));
    } catch (e) {
      console.error(e);
      if (mountedRef.current) setError("Couldn't load messages.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [conversationId, userId, error]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Live incoming/outgoing messages pushed over the socket.
  useEffect(() => {
    const unsubscribe = onMessage((data: any) => {
      if (data?.type !== "message") return;
      const message: Message & { conversationId?: number } = data.message;

      // Belongs to a thread we haven't opened — ignore.
      const belongsHere =
        (conversationId &&
          String((message as any).conversationId) === String(conversationId)) ||
        (!conversationId &&
          otherUserId &&
          (message.senderId === otherUserId || message.senderId === userId));
      if (!belongsHere) return;

      setMessages((prev) => [...prev, message]);

      if (!conversationId && (message as any).conversationId) {
        onConversationResolved?.(String((message as any).conversationId));
      }
      if (userId) {
        markConversationRead(
          userId,
          String((message as any).conversationId ?? conversationId),
        );
      }
    });
    return unsubscribe;
  }, [conversationId, otherUserId, userId, onConversationResolved, error]);

  const send = useCallback(
    (content: string) => {
      if (error === "401" || !userId || !otherUserId || !content.trim()) {
        return;
      }
      sendWsMessage(content, userId, otherUserId);
    },
    [userId, otherUserId],
  );

  return { messages, loading, error, setError, connected, send, authLoading };
}
