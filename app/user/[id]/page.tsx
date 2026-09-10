"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import PageShell from "@/app/components/PageShell";
import PostCard from "@/app/components/PostCard";
import EditPostModal from "@/app/components/EditPostModal";
import Avatar from "@/app/components/Avatar";
import { getUser } from "@/app/lib/user";
import { getPostsByAuthor, deletePost } from "@/app/lib/post";
import { getUserMemberships } from "@/app/lib/group";
import {
  getUsersFriends,
  getUserFriendRequests,
  sendFriendRequest,
  deleteFriend,
  acceptFriendRequest,
} from "@/app/lib/friend";
import User from "@/app/types/user";
import Post from "@/app/types/post";
import Friend from "@/app/types/friend";
import Group from "@/app/types/group";
import Link from "next/link";
import {
  getDirectConversation,
  getUserConversations,
} from "@/app/lib/conversation";

function safeImg(src: string | null | undefined): string | null {
  if (!src || src.trim() === "") return null;
  return src;
}

type FriendStatus = "none" | "friends" | "pending_sent" | "pending_received";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { userId, getToken } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendRecordId, setFriendRecordId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [existingConversation, setExistingConversation] = useState<any | null>(
    null,
  );

  useEffect(() => {
    if (!profileUser) return;
    (async () => {
      try {
        const conv = await getConversation(profileUser.id);
        if (conv) setExistingConversation(conv);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [profileUser]);

  async function handleDeletePost(postId: number) {
    try {
      const token = await getToken();
      await deletePost(postId, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  }
  const [activeTab, setActiveTab] = useState<"posts" | "groups">("posts");

  const isOwnProfile = userId === id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = await getToken();
        const [userData, postsData, groupsData] = await Promise.allSettled([
          getUser(id),
          getPostsByAuthor(id, token),
          getUserMemberships(id, token),
        ]);

        if (userData.status === "fulfilled") setProfileUser(userData.value);
        if (postsData.status === "fulfilled")
          setPosts(Array.isArray(postsData.value) ? postsData.value : []);
        if (groupsData.status === "fulfilled")
          setGroups(Array.isArray(groupsData.value) ? groupsData.value : []);

        // Determine friend status
        if (userId && !isOwnProfile) {
          const [friendsRes, requestsRes] = await Promise.allSettled([
            getUsersFriends(token),
            getUserFriendRequests(token),
          ]);

          if (friendsRes.status === "fulfilled") {
            const friends: Friend[] = Array.isArray(friendsRes.value)
              ? friendsRes.value
              : [];
            const match = friends.find((f) => f.otherUser?.id === id);
            if (match) {
              setFriendStatus("friends");
              setFriendRecordId(match.id);
              return;
            }
          }

          if (requestsRes.status === "fulfilled") {
            const reqs: any[] = Array.isArray(requestsRes.value)
              ? requestsRes.value
              : [];
            const sent = reqs.find(
              (r) =>
                (r.isSender || r.senderId === userId) && r.otherUser?.id === id,
            );
            const received = reqs.find(
              (r) =>
                !r.isSender && r.senderId !== userId && r.otherUser?.id === id,
            );
            if (sent) {
              setFriendStatus("pending_sent");
              setFriendRecordId(sent.id);
            } else if (received) {
              setFriendStatus("pending_received");
              setFriendRecordId(received.id);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, userId]);

  async function getConversation(id: string) {
    const token = await getToken();
    const conversation = await getDirectConversation(id, token);
    if (!conversation) return null;
    return conversation;
  }

  async function handleAddFriend() {
    if (!profileUser || actionLoading) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      const result = await sendFriendRequest(
        { receiverId: id, status: "PENDING" },
        token,
      );
      setFriendStatus("pending_sent");
      setFriendRecordId(result?.id ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!friendRecordId || actionLoading) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      await deleteFriend(friendRecordId, token);
      setFriendStatus("none");
      setFriendRecordId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAccept() {
    if (!friendRecordId || !userId || actionLoading) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      await acceptFriendRequest(
        { receiverId: userId, status: "ACCEPTED" },
        friendRecordId,
        token,
      );
      setFriendStatus("friends");
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnfriend() {
    if (!friendRecordId || actionLoading) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      await deleteFriend(friendRecordId, token);
      setFriendStatus("none");
      setFriendRecordId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Profile">
        <div className="flex flex-col gap-4">
          <div
            className="h-48 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-subtle)" }}
          />
          <div
            className="h-32 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-subtle)" }}
          />
        </div>
      </PageShell>
    );
  }

  if (!profileUser) {
    return (
      <PageShell title="Profile">
        <p
          className="text-sm text-center py-16"
          style={{ color: "var(--fg-muted)" }}
        >
          User not found.
        </p>
      </PageShell>
    );
  }

  const displayName =
    profileUser.fName && profileUser.lName
      ? `${profileUser.fName} ${profileUser.lName}`
      : profileUser.fName || profileUser.userName || "";

  const initials = (displayName || "??").slice(0, 2).toUpperCase();
  const avatarSrc = safeImg((profileUser as any).profileImg);
  const bannerSrc = safeImg((profileUser as any).bannerImg);

  return (
    <PageShell title={`@${profileUser.userName}`}>
      {/* ── Profile card ── */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        {/* Banner */}
        <div
          className="h-28 relative"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--primary) 40%, transparent), color-mix(in srgb, var(--primary) 10%, transparent))",
          }}
        >
          {bannerSrc && (
            <img
              src={bannerSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-10 mb-4 flex items-end justify-between">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold border-4 relative overflow-hidden flex-shrink-0"
              style={{
                background: "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                color: "var(--primary)",
                borderColor: "var(--bg)",
              }}
            >
              {initials}
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            {/* Friend action button (only shown for other users) */}
            {!isOwnProfile && userId && (
              <div className="flex gap-2">
                {friendStatus === "none" && (
                  <button
                    onClick={handleAddFriend}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-fg)",
                    }}
                  >
                    {actionLoading ? "…" : "Add Friend"}
                  </button>
                )}
                {friendStatus === "pending_sent" && (
                  <button
                    onClick={handleCancelRequest}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--fg-muted)",
                      background: "var(--bg)",
                    }}
                  >
                    {actionLoading ? "…" : "Cancel Request"}
                  </button>
                )}
                {friendStatus === "pending_received" && (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={actionLoading}
                      className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
                      style={{
                        background: "var(--primary)",
                        color: "var(--primary-fg)",
                      }}
                    >
                      {actionLoading ? "…" : "Accept"}
                    </button>
                    <button
                      onClick={handleCancelRequest}
                      disabled={actionLoading}
                      className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--fg-muted)",
                        background: "var(--bg)",
                      }}
                    >
                      Decline
                    </button>
                  </>
                )}
                {friendStatus === "friends" && (
                  <button
                    onClick={handleUnfriend}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--fg-muted)",
                      background: "var(--bg)",
                    }}
                  >
                    {actionLoading ? "…" : "Friends ✓"}
                  </button>
                )}
                {actionLoading ? (
                  <div className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50" />
                ) : (
                  <Link
                    href={
                      existingConversation
                        ? `/messages/${profileUser.id}?conversationId=${existingConversation.id}`
                        : `/messages/${profileUser.id}`
                    }
                    className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-fg)",
                    }}
                  >
                    {actionLoading ? "…" : "Message"}
                  </Link>
                )}
              </div>
            )}

            {isOwnProfile && (
              <a
                href="/profile"
                className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                  background: "var(--bg)",
                }}
              >
                Edit profile
              </a>
            )}
          </div>

          {/* Info */}
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--fg)" }}
            >
              {displayName}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>
              @{profileUser.userName}
            </p>
            {(profileUser as any).bio && (
              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: "var(--fg)" }}
              >
                {(profileUser as any).bio}
              </p>
            )}
          </div>

          {/* Stats */}
          <div
            className="flex gap-6 mt-4 pt-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setActiveTab("posts")}
              className="hover:opacity-80 transition-opacity"
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {posts.length}
              </span>
              <span
                className="text-xs ml-1"
                style={{ color: "var(--fg-muted)" }}
              >
                posts
              </span>
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className="hover:opacity-80 transition-opacity"
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {groups.length}
              </span>
              <span
                className="text-xs ml-1"
                style={{ color: "var(--fg-muted)" }}
              >
                groups
              </span>
            </button>
            {friendStatus === "friends" && (
              <span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--primary-subtle)",
                    color: "var(--primary)",
                  }}
                >
                  Friends
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 mb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["posts", "groups"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors"
            style={{
              borderColor: activeTab === tab ? "var(--primary)" : "transparent",
              color: activeTab === tab ? "var(--primary)" : "var(--fg-muted)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Posts tab ── */}
      {activeTab === "posts" &&
        (posts.length === 0 ? (
          <p
            className="text-sm text-center py-10"
            style={{ color: "var(--fg-muted)" }}
          >
            No posts yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showOwnerActions
                onEdit={setEditingPost}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        ))}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(updated) =>
            setPosts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            )
          }
        />
      )}

      {/* ── Groups tab ── */}
      {activeTab === "groups" &&
        (groups.length === 0 ? (
          <p
            className="text-sm text-center py-10"
            style={{ color: "var(--fg-muted)" }}
          >
            Not in any groups yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:opacity-90"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                  style={{
                    background: "var(--primary-subtle)",
                    color: "var(--primary)",
                  }}
                >
                  {g.groupImg ? (
                    <img
                      src={g.groupImg}
                      alt={g.groupName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    g.groupName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--fg)" }}
                  >
                    {g.groupName}
                  </p>
                  {g.description && (
                    <p
                      className="text-xs mt-0.5 line-clamp-1"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {g.description}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        ))}
    </PageShell>
  );
}
