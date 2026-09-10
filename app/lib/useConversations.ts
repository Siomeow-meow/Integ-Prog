"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getUserConversations } from "./conversation";
import { getFriends } from "./friend";
import type { ConversationSummary } from "@/app/components/messages/ConversationList";

// There's no push layer for the conversation *list* itself (only
// individual messages arrive over the websocket), so "real-time" here
// means "refetch quietly every few seconds" — good enough to feel current
// without a full push infrastructure for list-level metadata.
const POLL_MS = 5000;

export function useConversations() {
  const { userId, getToken } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }

        let conversationsFailed = false;
        let friendsFailed = false;

        const [rawConversations, friendRelations] = await Promise.all([
          getUserConversations(userId, token).catch((e) => {
            console.error("[useConversations] Failed to load conversations:", e);
            conversationsFailed = true;
            return [];
          }),
          getFriends(token).catch((e) => {
            console.error("[useConversations] Failed to load friends:", e);
            friendsFailed = true;
            return [];
          }),
        ]);

        // Both failing usually means something systemic (bad/expired token,
        // backend down) rather than "you just have no chats" — surface it
        // instead of quietly rendering an empty list that looks the same as
        // "no conversations yet".
        if (conversationsFailed && friendsFailed) {
          setError("Couldn't reach the server. Check your connection and try again.");
        }

        const list: ConversationSummary[] = [];

        (Array.isArray(rawConversations) ? rawConversations : [])
          .filter((conv: any) => !conv.isGroup)
          .filter((conv: any) =>
            Array.isArray(conv.participants)
              ? conv.participants.some((p: any) => p.participantId === userId)
              : true,
          )
          .forEach((conv: any) => {
            const other = conv.participants?.find((p: any) => p.participantId !== userId);
            if (!other) return;
            const msgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
            const last = msgs.length
              ? [...msgs].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                )[msgs.length - 1]
              : undefined;
            list.push({
              id: conv.id,
              conversationId: conv.id,
              otherUserId: other.participantId ?? other.participant?.id,
              userName: other.participant?.userName ?? "Unknown",
              profileImg: other.participant?.profileImg,
              lastMessage: last?.content,
              lastMessageAt: last?.createdAt,
              lastMessageSenderId: last?.senderId,
            });
          });

        // Friends you haven't messaged yet don't have a Conversation row at
        // all, so they'd otherwise be invisible here — pull them in too.
        (Array.isArray(friendRelations) ? friendRelations : [])
          .filter((f: any) => f.status === "ACCEPTED")
          .forEach((f: any) => {
            const other = f.otherUser;
            if (!other?.id) return;
            if (list.some((c) => c.otherUserId === other.id)) return;
            list.push({
              id: other.id,
              otherUserId: other.id,
              userName: other.userName ?? "Unknown",
              profileImg: other.profileImg,
            });
          });

        const deduped = Object.values(
          list.reduce((acc: Record<string, ConversationSummary>, c) => {
            const existing = acc[c.otherUserId];
            if (!existing || (!existing.conversationId && c.conversationId)) {
              acc[c.otherUserId] = c;
            }
            return acc;
          }, {}),
        );

        if (mountedRef.current) {
          setConversations(deduped);
          if (!conversationsFailed || !friendsFailed) setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    },
    [userId, getToken],
  );

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = setInterval(() => refresh(true), POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  return { conversations, loading, error, refresh };
}
