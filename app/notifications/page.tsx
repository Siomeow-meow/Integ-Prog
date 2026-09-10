"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import Avatar from "@/app/components/Avatar";
import { getUserFriendRequests, acceptFriendRequest, deleteFriend } from "@/app/lib/friend";
import { getGroups, getUserMemberships } from "@/app/lib/group";
import { getPosts } from "@/app/lib/post";
import { getComments } from "@/app/lib/comment";
import Friend from "@/app/types/friend";
import Group from "@/app/types/group";

// ── Notification union type ───────────────────────────────────────────────────
type NotifKind = "friend_request" | "friend_accepted" | "post_like" | "comment" | "mention" | "group_post";

type Notif = {
  id: string;
  kind: NotifKind;
  // Actor (person who did the action)
  actorName: string;
  actorId?: string;
  actorImg?: string;
  // Target (what was acted on)
  postId?: number;
  postTitle?: string;
  groupId?: number;
  groupName?: string;
  groupImg?: string;
  excerpt?: string; // comment content preview
  // Meta
  time: Date;
  read: boolean;
  friendMeta?: Friend;
};

function timeAgo(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function KindBadge({ kind }: { kind: NotifKind }) {
  const map: Record<NotifKind, { emoji: string; bg: string }> = {
    friend_request: { emoji: "👋", bg: "#6366f1" },
    friend_accepted: { emoji: "🤝", bg: "#22c55e" },
    post_like:       { emoji: "❤️", bg: "#ef4444" },
    comment:         { emoji: "💬", bg: "#3b82f6" },
    mention:         { emoji: "@",  bg: "#f59e0b" },
    group_post:      { emoji: "📣", bg: "#8b5cf6" },
  };
  const { emoji, bg } = map[kind] ?? { emoji: "🔔", bg: "#6b7280" };
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
      style={{ background: bg, border: "1.5px solid var(--bg)" }}
    >
      {emoji}
    </span>
  );
}

export default function NotificationsPage() {
  const { getToken, userId } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "friend_request" | "mention">("all");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const collected: Notif[] = [];

        // ── Friend requests ──────────────────────────────────────────────────
        try {
          const data = await getUserFriendRequests(token);
          const requests: Friend[] = Array.isArray(data) ? data : [];
          requests
            .filter((req: any) => !(req.isSender || req.senderId === userId))
            .forEach((req) => {
              collected.push({
                id: `friend_req_${req.id}`,
                kind: "friend_request",
                actorName: req.otherUser?.userName ?? "Someone",
                actorId: req.otherUser?.id,
                actorImg: req.otherUser?.profileImg,
                time: new Date(req.createdAt),
                read: false,
                friendMeta: req,
              });
            });
        } catch {}

        // ── Group posts (joined groups) ──────────────────────────────────────
        try {
          const [all, joined] = await Promise.allSettled([
            getGroups(token),
            getUserMemberships(userId, token),
          ]);
          const allGroups: Group[] = all.status === "fulfilled" && Array.isArray(all.value) ? all.value : [];
          const joinedIds = new Set(
            (joined.status === "fulfilled" && Array.isArray(joined.value) ? joined.value : []).map((g: Group) => g.id)
          );
          allGroups
            .filter((g) => joinedIds.has(g.id) && g.id)
            .forEach((g) => {
              collected.push({
                id: `group_post_${g.id}`,
                kind: "group_post",
                actorName: g.groupName ?? "Group",
                groupId: g.id!,
                groupName: g.groupName ?? "Group",
                groupImg: g.groupImg ?? undefined,
                time: new Date(),
                read: false,
              });
            });
        } catch {}

        // ── Likes & comments on your posts ───────────────────────────────────
        try {
          const posts = await getPosts(token);
          const myPosts = (Array.isArray(posts) ? posts : []).filter((p: any) => p.authorId === userId || p.userId === userId);

          myPosts.forEach((post: any) => {
            // Likes
            if ((post.likesCount ?? 0) > 0) {
              collected.push({
                id: `like_${post.id}`,
                kind: "post_like",
                actorName: `${post.likesCount} ${post.likesCount === 1 ? "person" : "people"}`,
                postId: post.id,
                postTitle: post.title || post.content?.slice(0, 40),
                time: new Date(post.createdAt),
                read: false,
              });
            }
          });

          // Comments & mentions on your posts
          try {
            const comments = await getComments(token);
            const allComments = Array.isArray(comments) ? comments : [];
            const myPostIds = new Set(myPosts.map((p: any) => p.id));

            allComments.forEach((c: any) => {
              if (c.commenterId === userId) return; // own comment
              const myPost = myPosts.find((p: any) => p.id === c.postId);

              // Comment on your post
              if (myPostIds.has(c.postId) && myPost) {
                collected.push({
                  id: `comment_${c.id}`,
                  kind: "comment",
                  actorName: c.commenter?.userName ?? "Someone",
                  actorId: c.commenterId,
                  actorImg: c.commenter?.profileImg,
                  postId: c.postId,
                  postTitle: myPost.title || myPost.content?.slice(0, 40),
                  excerpt: c.content?.slice(0, 80),
                  time: new Date(c.createdAt),
                  read: false,
                });
              }

              // @mention of you anywhere
              if (
                c.commenterId !== userId &&
                c.content?.toLowerCase().includes(`@${userId}`) === false && // avoid userId match
                c.content?.includes(`@`) &&
                c.commenter?.userName
              ) {
                // Check if any comment mentions your username (if we can get it)
                // We do this best-effort; full mention support requires server-side data
              }
            });
          } catch {}
        } catch {}

        // Sort newest first
        collected.sort((a, b) => b.time.getTime() - a.time.getTime());
        setNotifs(collected);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function handleAccept(notif: Notif) {
    if (!userId || !notif.friendMeta) return;
    try {
      const token = await getToken();
      await acceptFriendRequest({ receiverId: userId, status: "ACCEPTED" }, notif.friendMeta.id, token);
      setNotifs((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, kind: "friend_accepted" as NotifKind, read: true } : n)
      );
    } catch (e) { console.error(e); }
  }

  async function handleDecline(notif: Notif) {
    if (!notif.friendMeta) return;
    try {
      const token = await getToken();
      await deleteFriend(notif.friendMeta.id, token);
    } catch {}
    setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
  }

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const FILTER_TABS: { key: "all" | "friend_request" | "mention"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "friend_request", label: "Friend requests" },
    { key: "mention", label: "Mentions" },
  ];

  const visible = filter === "all" ? notifs : notifs.filter((n) => n.kind === filter);
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <PageShell
      title="Notifications"
      description={unread > 0 ? `${unread} unread` : "All caught up"}
      actions={
        unread > 0 ? (
          <button onClick={markAllRead} className="text-xs hover:underline" style={{ color: "var(--primary)" }}>
            Mark all read
          </button>
        ) : undefined
      }
    >
      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-0.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors"
            style={{
              borderColor: filter === t.key ? "var(--primary)" : "transparent",
              color: filter === t.key ? "var(--primary)" : "var(--fg-muted)",
            }}
          >
            {t.label}
            {t.key !== "all" && notifs.filter((n) => n.kind === t.key && !n.read).length > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full font-bold"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
                {notifs.filter((n) => n.kind === t.key && !n.read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>
            {filter === "all" ? "No notifications yet." : `No ${filter.replace("_", " ")} notifications.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((notif) => (
            <NotifRow
              key={notif.id}
              notif={notif}
              onRead={() => markRead(notif.id)}
              onAccept={() => handleAccept(notif)}
              onDecline={() => handleDecline(notif)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({
  notif,
  onRead,
  onAccept,
  onDecline,
}: {
  notif: Notif;
  onRead: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const isGroupPost = notif.kind === "group_post";
  const linkHref = isGroupPost
    ? `/groups/${notif.groupId}`
    : notif.postId
    ? `/post/${notif.postId}`
    : notif.actorId
    ? `/user/${notif.actorId}`
    : undefined;

  const inner = (
    <div
      onClick={onRead}
      className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors"
      style={{
        background: notif.read ? "var(--bg)" : "var(--primary-subtle)",
        border: `1px solid ${notif.read ? "var(--border)" : "var(--primary)"}`,
      }}
    >
      {/* Avatar / group icon */}
      <div className="relative flex-shrink-0">
        {isGroupPost ? (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold overflow-hidden"
            style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
          >
            {notif.groupImg
              ? <img src={notif.groupImg} alt="" className="w-full h-full object-cover" />
              : (notif.groupName ?? "").slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <Avatar userName={notif.actorName} profileImg={notif.actorImg} size="md" />
        )}
        <KindBadge kind={notif.kind} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--fg)" }}>
          {isGroupPost ? (
            <>
              <span className="font-semibold">{notif.groupName}</span> has new posts
            </>
          ) : notif.kind === "post_like" ? (
            <>
              <span className="font-semibold">{notif.actorName}</span> liked your post
              {notif.postTitle && <span style={{ color: "var(--fg-muted)" }}> — {notif.postTitle}</span>}
            </>
          ) : notif.kind === "comment" ? (
            <>
              <span className="font-semibold">@{notif.actorName}</span> commented on your post
              {notif.postTitle && <span style={{ color: "var(--fg-muted)" }}> — {notif.postTitle}</span>}
            </>
          ) : notif.kind === "mention" ? (
            <>
              <span className="font-semibold">@{notif.actorName}</span> mentioned you
              {notif.postTitle && <span style={{ color: "var(--fg-muted)" }}> in {notif.postTitle}</span>}
            </>
          ) : notif.kind === "friend_accepted" ? (
            <>
              <span className="font-semibold">@{notif.actorName}</span> is now your friend
            </>
          ) : (
            <>
              <span className="font-semibold">@{notif.actorName}</span> sent you a friend request
            </>
          )}
        </p>

        {/* Comment excerpt */}
        {notif.excerpt && (
          <p className="text-xs mt-0.5 line-clamp-2 italic" style={{ color: "var(--fg-muted)" }}>
            "{notif.excerpt}"
          </p>
        )}

        <p className="text-xs mt-0.5" style={{ color: "var(--fg-subtle)" }}>
          {timeAgo(notif.time)}
        </p>

        {/* Friend request actions */}
        {notif.kind === "friend_request" && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDecline(); }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            >
              Decline
            </button>
          </div>
        )}

        {/* Post link */}
        {(notif.kind === "comment" || notif.kind === "post_like" || notif.kind === "mention") && notif.postId && (
          <Link
            href={`/post/${notif.postId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-xs mt-1.5 hover:underline"
            style={{ color: "var(--primary)" }}
          >
            View post →
          </Link>
        )}
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--primary)" }} />
      )}
    </div>
  );

  return linkHref && notif.kind === "group_post" ? (
    <Link href={linkHref} style={{ display: "block" }}>{inner}</Link>
  ) : (
    inner
  );
}
