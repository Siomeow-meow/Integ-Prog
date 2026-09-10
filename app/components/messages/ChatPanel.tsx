"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Avatar from "@/app/components/Avatar";
import { useMessages } from "@/app/lib/useMessages";
import { useRouter } from "next/router";

function formatTime(iso: string | Date) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dayLabel(iso: string | Date) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPanel({
  conversationId,
  otherUser,
  onConversationResolved,
}: {
  conversationId: string | number | undefined;
  otherUser: { id: string; userName: string; profileImg?: string } | null;
  onConversationResolved?: (conversationId: string) => void;
}) {
  const { userId } = useAuth();
  const { messages, loading, error, connected, send, authLoading } =
    useMessages(conversationId, otherUser?.id, onConversationResolved);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSend() {
    const content = draft.trim();
    if (!content || !otherUser) return;
    send(content);
    setDraft("");
  }

  if (authLoading) {
    return null;
  }

  if (error === "401") {
    return (
      <div className="flex flex-col w-full min-h-screen items-center justify-center">
        <span>You are not authorized to view this content.</span>
      </div>
    );
  }

  if (!otherUser || error === "404") {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 h-full"
        style={{ color: "var(--fg-muted)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-subtle)" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-7 h-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/messages"
            aria-label="Back to chats"
            className="sm:hidden w-8 h-8 -ml-1 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ color: "var(--fg)" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </Link>
          <Link
            href={`/user/${otherUser.id}`}
            className="flex items-center gap-3 min-w-0"
          >
            <Avatar
              userName={otherUser.userName}
              profileImg={otherUser.profileImg}
              size="md"
            />
            <p
              className="text-sm font-semibold truncate"
              style={{ color: "var(--fg)" }}
            >
              {otherUser.userName}
            </p>
          </Link>
        </div>
        {!connected && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--fg-subtle)",
            }}
          >
            Connecting…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
        {loading ? (
          <div className="flex flex-col gap-2 flex-1 justify-end">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-2xl animate-pulse"
                style={{
                  background: "var(--bg-subtle)",
                  width: `${40 + (i % 3) * 15}%`,
                  alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
                }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Avatar
              userName={otherUser.userName}
              profileImg={otherUser.profileImg}
              size="lg"
            />
            <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>
              {otherUser.userName}
            </p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              This is the start of your conversation.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === userId;
            const prev = messages[i - 1];
            const showDivider =
              !prev ||
              new Date(prev.createdAt).toDateString() !==
                new Date(m.createdAt).toDateString();
            const grouped =
              prev && prev.senderId === m.senderId && !showDivider;

            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="flex justify-center my-3">
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: "var(--bg-subtle)",
                        color: "var(--fg-subtle)",
                      }}
                    >
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2.5"}`}
                >
                  {!mine && !grouped && (
                    <Avatar
                      userName={otherUser.userName}
                      profileImg={otherUser.profileImg}
                      size="sm"
                    />
                  )}
                  {!mine && grouped && <div className="w-7" />}
                  <div
                    className="max-w-[70%] px-3.5 py-2 text-sm break-words"
                    style={{
                      background: mine ? "var(--primary)" : "var(--bg-subtle)",
                      color: mine ? "var(--primary-fg)" : "var(--fg)",
                      borderRadius: mine
                        ? grouped
                          ? "18px 6px 18px 18px"
                          : "18px 18px 6px 18px"
                        : grouped
                          ? "6px 18px 18px 18px"
                          : "18px 18px 18px 6px",
                    }}
                    title={formatTime(m.createdAt)}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-xs px-5 pb-1" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      {/* Composer */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ color: "var(--primary)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--bg-subtle)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
          aria-label="Add image"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 21h18a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 21 3H3a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 3 21Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 8.25h.008v.008H8.25V8.25Z"
            />
          </svg>
        </button>

        <div
          className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "var(--bg-subtle)" }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Aa"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fg)" }}
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform disabled:opacity-40"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          aria-label="Send"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 translate-x-[-1px]"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
