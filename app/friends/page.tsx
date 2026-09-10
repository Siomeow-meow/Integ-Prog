"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Friend from "@/app/types/friend";
import Avatar from "@/app/components/Avatar";
import PageShell from "@/app/components/PageShell";
import {
  getUsersFriends,
  getUserFriendRequests,
  acceptFriendRequest,
  deleteFriend,
} from "@/app/lib/friend";
import Link from "next/link";

type Tab = "friends" | "requests";

export default function FriendsPage() {
  const { getToken, userId } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const token = await getToken();
      const [f, r] = await Promise.all([
        getUsersFriends(token).catch(() => []),
        getUserFriendRequests(token).catch(() => []),
      ]);
      setFriends(Array.isArray(f) ? f : []);
      setRequests(Array.isArray(r) ? r : []);
      setLoading(false);
    })();
  }, [userId]);

  async function handleAccept(req: Friend) {
    if (!userId) return;
    try {
      const token = await getToken();
      await acceptFriendRequest({ receiverId: userId, status: "ACCEPTED" }, req.id, token);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [...prev, { ...req, status: "ACCEPTED" }]);
    } catch (e) { console.error(e); }
  }

  async function handleDecline(req: Friend) {
    try {
      const token = await getToken();
      await deleteFriend(req.id, token);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    }
  }

  async function handleRemove(friend: Friend) {
    try {
      const token = await getToken();
      await deleteFriend(friend.id, token);
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    } catch (e) { console.error(e); }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends.length },
    { key: "requests", label: "Requests", count: requests.length || undefined },
  ];

  return (
    <PageShell
      title="Friends"
      description="Your connections on CommonGround"
      actions={
        <Link
          href="/explore?tab=people"
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          Find people
        </Link>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t.key ? "var(--primary)" : "transparent",
              color: tab === t.key ? "var(--primary)" : "var(--fg-muted)",
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
          ))}
        </div>
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <Empty
            message="No friends yet"
            sub={<>Start by <Link href="/explore?tab=people" className="underline" style={{ color: "var(--primary)" }}>finding people</Link> who share your interests.</>}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <FriendRow
                key={f.id}
                userName={f.otherUser?.userName ?? "Unknown"}
                profileImg={f.otherUser?.profileImg}
                since={f.createdAt}
                action={
                  <button
                    onClick={() => handleRemove(f)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--fg-muted)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Remove
                  </button>
                }
              />
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <Empty message="No pending requests" sub="When someone adds you, their request will appear here." />
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((req) => (
            <FriendRow
              key={req.id}
              userName={req.otherUser?.userName ?? "Unknown"}
              profileImg={req.otherUser?.profileImg}
              action={
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(req)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Decline
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function FriendRow({
  userName,
  profileImg,
  since,
  action,
}: {
  userName: string;
  profileImg?: string;
  since?: Date | string;
  action: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <Avatar userName={userName} profileImg={profileImg} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{userName}</p>
        {since && (
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            Friends since {new Date(since).toLocaleDateString()}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Empty({ message, sub }: { message: string; sub?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>{message}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>{sub}</p>}
    </div>
  );
}
