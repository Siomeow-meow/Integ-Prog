"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getUser } from "@/app/lib/user";
import { useConversations } from "@/app/lib/useConversations";
import ConversationList from "./ConversationList";
import ChatPanel from "./ChatPanel";

export default function MessagesShell({
  activeOtherUserId,
  initialConversationId,
}: {
  activeOtherUserId?: string;
  initialConversationId?: string;
}) {
  const { getToken } = useAuth();
  const {
    conversations,
    loading: loadingList,
    error: conversationsError,
    refresh,
  } = useConversations();

  const [otherUser, setOtherUser] = useState<{
    id: string;
    userName: string;
    profileImg?: string;
  } | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );

  // Keep the locally-tracked conversationId in sync if the URL gives us one.
  useEffect(() => {
    setConversationId(initialConversationId);
  }, [initialConversationId, activeOtherUserId]);

  // Resolve who we're chatting with when a specific chat is selected.
  useEffect(() => {
    let cancelled = false;

    async function resolveDirect(id: string) {
      // Prefer info already present in the list — instant, no flash of "Unknown".
      const known = conversations.find((c) => c.otherUserId === id);
      if (known) {
        setOtherUser({
          id: known.otherUserId,
          userName: known.userName,
          profileImg: known.profileImg,
        });
        if (!initialConversationId && known.conversationId) {
          setConversationId(String(known.conversationId));
        }
      }
      try {
        const token = await getToken();
        const profile = await getUser(id, token);
        if (!cancelled && profile) {
          setOtherUser({
            id: profile.id,
            userName: profile.userName,
            profileImg: profile.profileImg,
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!activeOtherUserId) {
      setOtherUser(null);
      return;
    }

    resolveDirect(activeOtherUserId);

    return () => {
      cancelled = true;
    };
  }, [activeOtherUserId, conversations, initialConversationId]);

  // Called by ChatPanel once a conversation gets created on first send, so
  // the URL/state/list all agree on the real id going forward.
  function handleConversationResolved(id: string) {
    setConversationId(id);
    refresh(true);
  }

  return (
    <main className="min-h-screen">
      <div className="flex" style={{ height: "100vh" }}>
        <div
          className="w-full sm:w-[320px] flex-shrink-0"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <div
            className={`h-full ${activeOtherUserId ? "hidden sm:block" : ""}`}
          >
            <ConversationList
              conversations={conversations}
              loading={loadingList}
              error={conversationsError}
              activeUserId={activeOtherUserId}
            />
          </div>
        </div>

        <div className={`flex-1 ${activeOtherUserId ? "" : "hidden sm:flex"}`}>
          <ChatPanel
            conversationId={conversationId}
            otherUser={otherUser}
            onConversationResolved={handleConversationResolved}
          />
        </div>
      </div>
    </main>
  );
}
