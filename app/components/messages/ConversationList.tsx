"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Avatar from "@/app/components/Avatar";
import { isUnread } from "@/app/lib/chatPrefs";

export type ConversationSummary = {
  id: string | number;
  conversationId?: string | number;
  otherUserId: string;
  userName: string;
  profileImg?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
};

type FilterTab = "all" | "unread";
const TAB_LABEL: Record<FilterTab, string> = {
  all: "All",
  unread: "Unread",
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ConversationRow({
  c,
  active,
  unread,
}: {
  c: ConversationSummary;
  active: boolean;
  unread: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/messages/${c.otherUserId}${c.conversationId ? `?conversationId=${c.conversationId}` : ""}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: active ? "var(--primary-subtle)" : hover ? "var(--bg-subtle)" : "transparent" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative flex-shrink-0">
        <Avatar userName={c.userName} profileImg={c.profileImg} size="lg" />
        {unread && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ background: "var(--primary)", border: "2px solid var(--bg)" }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm truncate" style={{ color: "var(--fg)", fontWeight: unread ? 700 : 500 }}>
            {c.userName}
          </p>
          {c.lastMessageAt && (
            <span className="text-[11px] flex-shrink-0" style={{ color: "var(--fg-subtle)" }}>
              {timeAgo(c.lastMessageAt)}
            </span>
          )}
        </div>
        <p
          className="text-xs truncate"
          style={{ color: unread ? "var(--fg)" : "var(--fg-muted)", fontWeight: unread ? 600 : 400 }}
        >
          {c.lastMessage ?? "Say hi 👋"}
        </p>
      </div>
    </Link>
  );
}

export default function ConversationList({
  conversations,
  loading,
  error,
  activeUserId,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  error?: string | null;
  activeUserId?: string;
}) {
  const router = useRouter();
  const { userId } = useAuth();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function handleBack() {
    // Go to wherever the user actually came from; only fall back to /feed
    // when there's no in-app history (e.g. messages was opened directly).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/feed");
    }
  }

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.userName.toLowerCase().includes(q));
  }, [conversations, search]);

  const visible = useMemo(() => {
    if (tab === "unread" && userId) {
      return searched.filter((c) =>
        isUnread(userId, String(c.id), c.lastMessageAt, c.lastMessageSenderId),
      );
    }
    return searched;
  }, [searched, tab, userId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 pt-5 pb-3">
        <button
          onClick={handleBack}
          aria-label="Back"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ color: "var(--fg)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold" style={{ color: "var(--fg)" }}>
          Chats
        </h1>

        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--bg-subtle)", color: "var(--fg-muted)" }}
          >
            {TAB_LABEL[tab].toUpperCase()}
            <ChevronIcon />
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden z-10 py-1"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              {(Object.keys(TAB_LABEL) as FilterTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm"
                  style={{
                    color: tab === t ? "var(--primary)" : "var(--fg)",
                    fontWeight: tab === t ? 600 : 400,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-full"
          style={{ background: "var(--bg-subtle)", color: "var(--fg-muted)" }}
        >
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Messages"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fg)" }}
          />
        </div>
      </div>

      <div className="chat-list-scroll flex-1 overflow-y-auto px-2 pb-4">
        {error ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm font-medium mb-1" style={{ color: "var(--fg)" }}>
              Couldn't load your chats
            </p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {error}
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm px-3 py-6 text-center" style={{ color: "var(--fg-muted)" }}>
            {tab === "unread"
              ? "You're all caught up."
              : "No conversations yet. Visit a friend's profile and hit Message to start one."}
          </p>
        ) : (
          visible.map((c) => (
            <ConversationRow
              key={c.id}
              c={c}
              active={activeUserId === c.otherUserId}
              unread={!!userId && isUnread(userId, String(c.id), c.lastMessageAt, c.lastMessageSenderId)}
            />
          ))
        )}
      </div>

      <style jsx>{`
        .chat-list-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border-strong) transparent;
        }
        .chat-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .chat-list-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-list-scroll::-webkit-scrollbar-thumb {
          background-color: var(--border-strong);
          border-radius: 999px;
        }
        .chat-list-scroll::-webkit-scrollbar-thumb:hover {
          background-color: var(--fg-subtle);
        }
      `}</style>
    </div>
  );
}
