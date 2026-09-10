"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { getUser, patchUser, PatchUserRequest } from "@/app/lib/user";
import { getPostsByAuthor, deletePost } from "@/app/lib/post";
import { getUsersFriends, deleteFriend } from "@/app/lib/friend";
import { getUserMemberships } from "@/app/lib/group";
import PostCard from "@/app/components/PostCard";
import EditPostModal from "@/app/components/EditPostModal";
import PageShell from "@/app/components/PageShell";
import ImagePositionPicker from "@/app/components/ImagePositionPicker";
import User from "@/app/types/user";
import Post from "@/app/types/post";
import Friend from "@/app/types/friend";
import Group from "@/app/types/group";
import { uploadImage } from "../util/storage";

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  suffix?: string;
}) {
  const base =
    "w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors";
  const style = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--fg-muted)" }}
        >
          {label}
        </label>
        {maxLength && (
          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          className={`${base} resize-none`}
          style={style}
        />
      ) : suffix ? (
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
            style={{ color: "var(--fg-muted)" }}
          >
            {suffix}
          </span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`${base} pl-7`}
            style={style}
          />
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={base}
          style={style}
        />
      )}
    </div>
  );
}

function safeImg(src: string | null | undefined): string | null {
  if (!src || src.trim() === "") return null;
  return src;
}

function FriendListModal({
  friends,
  onRemove,
  removing,
  onClose,
}: {
  friends: Friend[];
  onRemove: (id: number) => void;
  removing: number | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh]"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            Friends ({friends.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--fg-muted)" }}
          >
            <XIcon />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {friends.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--fg-muted)" }}
            >
              No friends yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {friends.map((f) => {
                const imgSrc = safeImg(f.otherUser?.profileImg);
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <a href={`/user/${f.otherUser?.id}`}>
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold relative"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                          color: "var(--primary)",
                        }}
                      >
                        <span>
                          {(f.otherUser?.userName ?? "?")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        {imgSrc && (
                          <img
                            src={imgSrc}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                    </a>
                    <a
                      href={`/user/${f.otherUser?.id}`}
                      className="flex-1 hover:underline"
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--fg)" }}
                      >
                        @{f.otherUser?.userName}
                      </span>
                    </a>
                    <button
                      onClick={() => onRemove(f.id)}
                      disabled={removing === f.id}
                      className="text-xs px-2.5 py-1 rounded-lg transition-opacity disabled:opacity-40"
                      style={{
                        background:
                          "color-mix(in srgb, #ef4444 12%, transparent)",
                        color: "#ef4444",
                        border:
                          "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
                      }}
                    >
                      {removing === f.id ? "…" : "Remove"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId, getToken } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<
    PatchUserRequest & {
      userName?: string;
      profileImg?: File;
      bannerImg?: File;
    }
  >({});
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [bannerHover, setBannerHover] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [removingFriend, setRemovingFriend] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "groups">("posts");
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  async function handleDeletePost(postId: number) {
    try {
      const token = await getToken();
      await deletePost(postId, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  }

  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  // File picked from disk but not yet cropped/positioned — shown in the
  // ImagePositionPicker modal before it becomes the actual preview.
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    field: "profileImg" | "bannerImg";
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const [userData, postsData, friendsData, groupsData] =
          await Promise.allSettled([
            getUser(userId),
            getPostsByAuthor(userId, token),
            getUsersFriends(token),
            getUserMemberships(userId, token),
          ]);
        if (userData.status === "fulfilled") setUser(userData.value);
        if (postsData.status === "fulfilled")
          setPosts(
            Array.isArray(postsData.value)
              ? [...postsData.value].sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
              : [],
          );
        if (friendsData.status === "fulfilled")
          setFriends(Array.isArray(friendsData.value) ? friendsData.value : []);
        if (groupsData.status === "fulfilled")
          setGroups(Array.isArray(groupsData.value) ? groupsData.value : []);
      } finally {
        setLoadingUser(false);
        setLoadingPosts(false);
        setLoadingFriends(false);
      }
    })();
  }, [userId]);

  function startEdit() {
    if (!user) return;
    setForm({
      fName: user.fName ?? "",
      lName: user.lName ?? "",
      bio: user.bio ?? "",
      userName: user.userName ?? "",
    });
    setProfilePreview(null);
    setBannerPreview(null);
    setSaveError(null);
    setEditing(true);
  }

  function handleImageFile(
    file: File,
    setPreview: (url: string) => void,
    field: "profileImg" | "bannerImg",
  ) {
    setPreview(URL.createObjectURL(file)); // if you have the blob you can just make it a local URL

    setForm((f) => ({
      ...f,
      [field]: file, // no need to format it as a url just store the actual file
    }));
  }

  async function saveEdit() {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      // Build patch payload — include all changed fields
      const payload: PatchUserRequest & { userName?: string } = {};
      if (!user) throw new Error("User not found!");
      if (form.fName !== undefined) payload.fName = form.fName;
      if (form.lName !== undefined) payload.lName = form.lName;
      if (form.bio !== undefined) payload.bio = form.bio;
      if (form.userName !== undefined)
        (payload as any).userName = form.userName;
      if (form.profileImg) {
        const uploadedImage = await uploadImage({
          file: form.profileImg,
          bucket: "pancit-canton-sns",
          path: `user/${user.userName}/profile-image.jpg`,
        });

        if (!uploadedImage) throw new Error("Image Upload failed");
        payload.profileImg = uploadedImage;
      }
      if (form.bannerImg) {
        const uploadedBanner = await uploadImage({
          file: form.bannerImg,
          bucket: "pancit-canton-sns",
          path: `user/${user.userName}/banner.jpg`,
        });

        if (!uploadedBanner) throw new Error("Banner Upload failed");
        payload.bannerImg = uploadedBanner;
      }

      const updated = await patchUser(payload, userId, () => {}, token);
      setUser(updated);
      setEditing(false);
      setProfilePreview(null);
      setBannerPreview(null);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFriend(friendId: number) {
    setRemovingFriend(friendId);
    try {
      const token = await getToken();
      await deleteFriend(friendId, token);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingFriend(null);
    }
  }

  const displayName =
    user?.fName && user?.lName
      ? `${user.fName} ${user.lName}`
      : user?.fName || user?.userName || "";

  const initials = (displayName || "??").slice(0, 2).toUpperCase();

  const rawAvatarSrc = editing
    ? profilePreview || (user as any)?.profileImg || user?.profileImg || null
    : (user as any)?.profileImg || user?.profileImg || null;
  const avatarSrc = safeImg(rawAvatarSrc);

  const rawBannerSrc = editing
    ? bannerPreview || (user as any)?.bannerImg || null
    : (user as any)?.bannerImg || null;
  const bannerSrc = safeImg(rawBannerSrc);

  return (
    <PageShell title="Profile">
      {/* Hidden file inputs */}
      <input
        ref={profileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingImage({ file: f, field: "profileImg" });
          e.target.value = "";
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingImage({ file: f, field: "bannerImg" });
          e.target.value = "";
        }}
      />

      {pendingImage && (
        <ImagePositionPicker
          file={pendingImage.file}
          aspectRatio={pendingImage.field === "profileImg" ? 1 : 3.5}
          shape={pendingImage.field === "profileImg" ? "circle" : "rect"}
          outputWidth={pendingImage.field === "profileImg" ? 400 : 1400}
          outputHeight={pendingImage.field === "profileImg" ? 400 : 400}
          title={
            pendingImage.field === "profileImg"
              ? "Reposition profile photo"
              : "Reposition banner"
          }
          onCancel={() => setPendingImage(null)}
          onConfirm={(cropped) => {
            const field = pendingImage.field;
            handleImageFile(
              cropped,
              field === "profileImg" ? setProfilePreview : setBannerPreview,
              field,
            );
            setPendingImage(null);
          }}
        />
      )}

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
            cursor: editing ? "pointer" : "default",
          }}
          onMouseEnter={() => editing && setBannerHover(true)}
          onMouseLeave={() => setBannerHover(false)}
          onClick={() => editing && bannerInputRef.current?.click()}
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
          {editing && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-150"
              style={{
                opacity: bannerHover ? 1 : 0.4,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
              }}
            >
              <CameraIcon />
              <span className="text-xs font-medium">Change banner</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold border-4 relative overflow-hidden"
              style={{
                background: "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                color: "var(--primary)",
                borderColor: "var(--bg)",
                cursor: editing ? "pointer" : "default",
                flexShrink: 0,
              }}
              onMouseEnter={() => editing && setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              onClick={() => editing && profileInputRef.current?.click()}
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
              {editing && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-150"
                  style={{
                    opacity: avatarHover ? 1 : 0,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                  }}
                >
                  <CameraIcon />
                  <span className="text-[10px] font-medium leading-tight text-center px-1">
                    Edit photo
                  </span>
                </div>
              )}
            </div>

            {!editing ? (
              <button
                onClick={startEdit}
                className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                  background: "var(--bg)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-subtle)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--bg)")
                }
              >
                Edit profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setProfilePreview(null);
                    setBannerPreview(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--fg-muted)",
                    background: "var(--bg)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-fg)",
                  }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>

          {/* View mode */}
          {!editing &&
            (loadingUser ? (
              <div className="flex flex-col gap-2">
                <div
                  className="h-5 w-40 rounded animate-pulse"
                  style={{ background: "var(--bg-subtle)" }}
                />
                <div
                  className="h-4 w-24 rounded animate-pulse"
                  style={{ background: "var(--bg-subtle)" }}
                />
              </div>
            ) : (
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--fg)" }}
                >
                  {`${user?.fName} ${user?.lName}` ||
                    user?.userName ||
                    "Unknown User"}
                </h2>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  @{user?.userName}
                </p>
                {user?.bio && (
                  <p
                    className="text-sm mt-2 leading-relaxed"
                    style={{ color: "var(--fg)" }}
                  >
                    {user.bio}
                  </p>
                )}
              </div>
            ))}

          {/* Edit mode */}
          {editing && (
            <div className="flex flex-col gap-4 mt-2">
              <Field
                label="Username"
                value={form.userName ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, userName: v }))}
                placeholder="username"
                maxLength={30}
                suffix="@"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="First name"
                  value={form.fName ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, fName: v }))}
                  placeholder="Jane"
                  maxLength={50}
                />
                <Field
                  label="Last name"
                  value={form.lName ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, lName: v }))}
                  placeholder="Smith"
                  maxLength={50}
                />
              </div>
              <Field
                label="Bio"
                value={form.bio ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
                placeholder="Tell people a bit about yourself…"
                multiline
                maxLength={200}
              />
              {saveError && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{
                    background: "color-mix(in srgb, #ef4444 10%, transparent)",
                    color: "#ef4444",
                  }}
                >
                  {saveError}
                </p>
              )}
            </div>
          )}

          {/* Stats row */}
          <div
            className="flex gap-6 mt-4 pt-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setActiveTab("posts")}
              className="transition-opacity hover:opacity-80"
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
              onClick={() => setShowFriends(true)}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {loadingFriends ? (
                <span
                  className="text-sm font-semibold w-6 h-4 rounded animate-pulse inline-block"
                  style={{ background: "var(--bg-subtle)" }}
                />
              ) : (
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--fg)" }}
                >
                  {friends.length}
                </span>
              )}
              <span
                className="text-xs ml-1"
                style={{ color: "var(--fg-muted)" }}
              >
                friends
              </span>
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className="transition-opacity hover:opacity-80"
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
        (loadingPosts ? (
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl animate-pulse"
                style={{ background: "var(--bg-subtle)" }}
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
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
                className="flex items-center gap-4 p-4 rounded-2xl transition-all"
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

      {/* ── Friend list modal ── */}
      {showFriends && (
        <FriendListModal
          friends={friends}
          onRemove={handleRemoveFriend}
          removing={removingFriend}
          onClose={() => setShowFriends(false)}
        />
      )}
    </PageShell>
  );
}
