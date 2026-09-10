"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import ImagePositionPicker from "@/app/components/ImagePositionPicker";
import PostCard from "@/app/components/PostCard";
import Avatar from "@/app/components/Avatar";
import Switch from "@/app/components/Switch";
import MentionTextarea from "@/app/components/MentionTextarea";
import {
  getGroup,
  followGroup,
  getGroupPosts,
  deleteGroup,
  getGroupMembers,
  kickMember,
  updateMemberRole,
  inviteMember,
  patchGroup,
} from "@/app/lib/group";
import { getUsersFriends } from "@/app/lib/friend";
import { mapMembersToMentionUsers } from "@/app/lib/mentionDirectory";
import { postPost, deletePost, patchPost } from "@/app/lib/post";
import { uploadImage } from "@/app/util/storage";
import ImageAttachmentStrip from "@/app/components/ImageAttachmentStrip";
import Group from "@/app/types/group";
import Post from "@/app/types/post";
import Friend from "@/app/types/friend";

// ── Tiny icons ────────────────────────────────────────────────────────────────
const Icons = {
  Trash: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Users: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Plus: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Pen: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  X: ({ size = 4 }: { size?: number }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-${size} h-${size}`}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Camera: () => (
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
  ),
  Image: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Settings: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Mask: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M2.5 8.5c2-2 4.5-2 6 0 .8 1 1.3 1 2 0 1.5-2 4-2 6 0" />
      <path d="M2.5 8.5c0 5 2.5 9 5 9 1.5 0 2-1.5 2.5-3 .3-1 .7-1 1 0 .5 1.5 1 3 2.5 3 2.5 0 5-4 5-9" />
      <circle cx="7" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

type Member = { id: string; userName: string; profileImg: string };

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--fg-muted)" }}
          >
            <Icons.X />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function safeImg(src: any): string | null {
  return typeof src === "string" && src.trim() ? src.trim() : null;
}

function normaliseMembers(data: any): Member[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.groupMembers)
      ? data.groupMembers
      : Array.isArray(data?.members)
        ? data.members
        : Array.isArray(data?.data)
          ? data.data
          : [];
  return list
    .map((m: any) => {
      // Many possible shapes from the API
      const id = m.userId ?? m.id ?? m.user?.id ?? "";
      const userName =
        m.user?.userName ?? m.userName ?? m.username ?? "unknown";
      const profileImg = m.user?.profileImg ?? m.profileImg ?? m.avatar ?? "";
      return { id, userName, profileImg };
    })
    .filter((m: Member) => m.id);
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken, userId } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Modals
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Post tag filter — "all" always includes untagged posts
  const [postTagFilter, setPostTagFilter] = useState<string | "all">("all");

  // Twitter-style inline composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postExistingImages, setPostExistingImages] = useState<string[]>([]);
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Invite
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);

  // Kick
  const [kicking, setKicking] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Delete group
  const [deleting, setDeleting] = useState(false);

  // Settings (inline editing, matches profile edit UI)
  const [sBannerPreview, setSBannerPreview] = useState<string | null>(null);
  const [sIconPreview, setSIconPreview] = useState<string | null>(null);
  const [sBannerUploading, setSBannerUploading] = useState(false);
  const [sIconUploading, setSIconUploading] = useState(false);
  const [sName, setSName] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sThemes, setSThemes] = useState<string[]>([]);
  const [sThemeInput, setSThemeInput] = useState("");
  const [sAllowAnonymity, setSAllowAnonymity] = useState(false);
  const [sSaving, setSSaving] = useState(false);
  const [sSaveError, setSSaveError] = useState<string | null>(null);
  const sBannerRef = useRef<HTMLInputElement>(null);
  const sIconRef = useRef<HTMLInputElement>(null);
  const [pendingSettingsImage, setPendingSettingsImage] = useState<{
    file: File;
    field: "icon" | "banner";
  } | null>(null);
  // Committed URLs (after upload)
  const [sBannerImg, setSBannerImg] = useState<File | null>(null);
  const [sIconImg, setSIconImg] = useState<File | null>(null);
  const [sBannerHover, setSBannerHover] = useState(false);
  const [sIconHover, setSIconHover] = useState(false);

  // Load group data
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = await getToken();
        const [g, p] = await Promise.allSettled([
          getGroup(id, token),
          getGroupPosts(id, token),
        ]);
        if (g.status === "fulfilled") setGroup(g.value);
        if (p.status === "fulfilled") {
          const arr = Array.isArray(p.value) ? p.value : [];
          setPosts(
            [...arr].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load members lazily (when modal opens OR always for count)
  async function loadMembers() {
    if (membersLoaded) return;
    try {
      const token = await getToken();
      const raw = await getGroupMembers(id, token);
      console.log("RAW MEMBERS RESPONSE:", JSON.stringify(raw).slice(0, 500));
      // const normalised = normaliseMembers(raw);
      // console.log("NORMALISED MEMBERS:", normalised);
      setMembers(raw);
      setMembersLoaded(true);
    } catch (e) {
      console.error("loadMembers error:", e);
    }
  }

  useEffect(() => {
    if (showMembersModal) loadMembers();
  }, [showMembersModal]);

  // Also load members up front (not gated on the Members modal being open) —
  // the post composer's @mention list needs to be scoped to group members,
  // so it needs this list ready as soon as the group page mounts.
  useEffect(() => {
    if (id) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load friends for the Invite modal.
  useEffect(() => {
    if (!showInviteModal) return;
    (async () => {
      try {
        const token = await getToken();
        const data = await getUsersFriends(token);
        setFriends(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [showInviteModal]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  function openSettings() {
    if (!group) return;
    setSName(group.groupName);
    setSDesc(group.description ?? "");
    setSThemes(group.groupThemes ?? []);
    setSThemeInput("");
    setSAllowAnonymity(!!group.allowAnonymity);
    setSBannerPreview(safeImg(group.bannerImg));
    setSIconPreview(safeImg(group.groupImg));
    setSBannerImg(null);
    setSIconImg(null);
    setShowSettings(true);
  }

  async function handleSettingsImageFile(
    file: File,
    setPreview: (u: string) => void,
    setUrl: (u: File | null) => void,
  ) {
    const localUrl = URL.createObjectURL(file);
    setUrl(file);
    setPreview(localUrl);
  }

  function closeSettings() {
    setShowSettings(false);
    setSBannerPreview(null);
    setSIconPreview(null);
    setSBannerImg(null);
    setSIconImg(null);
    setSSaveError(null);
  }

  async function handleSaveSettings() {
    if (!group) return;
    setSSaving(true);
    setSSaveError(null);
    try {
      const token = await getToken();
      const payload: any = {
        groupName: sName.trim() || group.groupName,
        description: sDesc.trim(),
        groupThemes: sThemes,
        allowAnonymity: sAllowAnonymity,
      };
      // Only send image URLs if we actually uploaded something
      let uploadedImage: string | null = null;
      let uploadedBanner: string | null = null;
      if (sIconImg) {
        setSIconUploading(true);
        try {
          uploadedImage = await uploadImage({
            file: sIconImg,
            bucket: "pancit-canton-sns",
            path: `group/${group.id}/group-image.jpg`,
          });
        } finally {
          setSIconUploading(false);
        }
        payload.groupImg = uploadedImage;
      }
      if (sBannerImg) {
        setSBannerUploading(true);
        try {
          uploadedBanner = await uploadImage({
            file: sBannerImg,
            bucket: "pancit-canton-sns",
            path: `group/${group.id}/banner.jpg`,
          });
        } finally {
          setSBannerUploading(false);
        }
        payload.bannerImg = uploadedBanner;
      }

      const updated = await patchGroup(payload, group.id, token);
      setGroup((g) =>
        g
          ? {
              ...g,
              ...updated,
              groupName: payload.groupName,
              description: payload.description,
              groupThemes: sThemes,
              allowAnonymity: sAllowAnonymity,
              // Use the uploaded URLs, not the raw File objects — a File
              // was being written into state here before, which silently
              // clobbered the correct URL that `updated` already had.
              ...(uploadedBanner ? { bannerImg: uploadedBanner } : {}),
              ...(uploadedImage ? { groupImg: uploadedImage } : {}),
            }
          : g,
      );
      setShowSettings(false);
    } catch (e: any) {
      console.error(e);
      setSSaveError(
        e?.message
          ? `Couldn't save changes: ${e.message}`
          : "Couldn't save changes. Please try again.",
      );
    } finally {
      setSSaving(false);
    }
  }

  // ── Join/leave ──────────────────────────────────────────────────────────
  async function handleJoinLeave() {
    if (!group) return;
    setJoining(true);
    try {
      const token = await getToken();
      await followGroup(
        { role: group.isFollowed ? "LEAVE" : "MEMBER" },
        token,
        group.id,
      );
      setGroup((g) =>
        g
          ? {
              ...g,
              isFollowed: !g.isFollowed,
              populationCount: Math.max(
                0,
                (g.populationCount ?? 1) + (g.isFollowed ? -1 : 1),
              ),
            }
          : g,
      );
      if (group.isFollowed && userId)
        setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  }

  async function handleDeleteGroup() {
    if (!group) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await deleteGroup(group.id, token);
      router.push("/groups");
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  async function handleKick(memberId: string) {
    if (!group) return;
    setKicking(memberId);
    try {
      const token = await getToken();
      await kickMember(group.id, memberId, token);
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
      setGroup((g) =>
        g
          ? { ...g, populationCount: Math.max(0, (g.populationCount ?? 1) - 1) }
          : g,
      );
    } catch (e) {
      console.error(e);
    } finally {
      setKicking(null);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    if (!group) return;
    const prevMembers = members;
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.memberId === memberId ? { ...m, role } : m)),
    );
    setUpdatingRole(memberId);
    try {
      const token = await getToken();
      await updateMemberRole(group.id, memberId, role, token);
    } catch (e) {
      console.error(e);
      setMembers(prevMembers); // revert on failure
    } finally {
      setUpdatingRole(null);
    }
  }

  async function handleInvite(friendUserId: string) {
    if (!group) return;
    setInviting(friendUserId);
    try {
      const token = await getToken();
      await inviteMember(group.id, friendUserId, token);
    } catch (e) {
      console.error(e);
    } finally {
      setInviting(null);
    }
  }

  // ── Composer ──────────────────────────────────────────────────────────────
  function openComposer(editing?: Post) {
    if (editing) {
      setEditingPost(editing);
      setPostTitle(editing.title);
      setPostContent(editing.content ?? []);

      // existing images are URLs — keep them separate from newly-picked
      // files so a save that adds no new images doesn't wipe these out.
      setPostExistingImages(editing.images ?? []);
      setPostImages([]);

      setPostTags(editing.tags ?? []);
      setPostAnonymous(!!editing.isAnonymous);
    } else {
      setEditingPost(null);
      setPostTitle("");
      setPostContent("");
      setPostImages([]);
      setPostExistingImages([]);
      setPostTags([]);
      setPostAnonymous(false);
    }

    setComposerOpen(true);
    setTimeout(() => titleRef.current?.focus(), 80);
  }

  function handleComposerImageFiles(files: FileList) {
    setPostImages((prev) => [...prev, ...Array.from(files)]);
  }

  async function handlePost() {
    if (!postTitle.trim() || !group || !userId) return;
    setPostSubmitting(true);
    try {
      const token = await getToken();
      let uploadedImageUrls: string[] = [];

      if (postImages.length > 0) {
        uploadedImageUrls = await Promise.all(
          postImages.map(async (image, i) => {
            const uploaded = await uploadImage({
              file: image,
              bucket: "pancit-canton-sns",
              path: `group/${group.id}/post/${editingPost?.id ?? "new"}-${Date.now()}-${i}.jpg`,
            });
            return uploaded;
          }),
        );
      }

      // Keep any pre-existing images the user didn't remove, plus whatever
      // was newly uploaded this save.
      const finalImages = [...postExistingImages, ...uploadedImageUrls];

      if (editingPost) {
        const updated = await patchPost(
          {
            title: postTitle.trim(),
            content: postContent.trim(),
            tags: postTags,
            images: finalImages,
            authorId: userId,
            ...(group.allowAnonymity ? { isAnonymous: postAnonymous } : {}),
          },
          editingPost.id,
          token,
        );
        setPosts((prev) =>
          prev.map((p) => (p.id === editingPost.id ? { ...p, ...updated } : p)),
        );
      } else {
        const created = await postPost(
          {
            title: postTitle.trim(),
            content: postContent.trim(),
            tags: postTags,
            images: finalImages,
            status: "published",
            authorId: userId,
            groupId: group.id,
            ...(group.allowAnonymity ? { isAnonymous: postAnonymous } : {}),
          },
          token,
        );
        const withAuthor: Post = {
          ...created,
          isAnonymous:
            created?.isAnonymous ??
            (group.allowAnonymity ? postAnonymous : false),
          author: created?.author ?? {
            userName: clerkUser?.username ?? "You",
            profileImg: clerkUser?.imageUrl ?? "",
          },
        };
        setPosts((prev) => [withAuthor, ...prev]);
      }
      setComposerOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setPostSubmitting(false);
    }
  }

  async function handleDeletePost(postId: number) {
    try {
      const token = await getToken();
      await deletePost(postId, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  }

  // Raw member records come back as { memberId, member: {...} }, not { id }.
  // Reading m.id here always came back undefined, so this set was
  // permanently empty and "already a member" was never detected in the
  // Invite tab — every friend showed an Invite button, even ones already in
  // the group.
  const memberIds = new Set(members.map((m) => m.memberId));
  // @mentions in this group are limited to actual members — not every user
  // on the platform.
  const memberMentionUsers = mapMembersToMentionUsers(members);

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (m.member?.userName ?? "").toLowerCase().includes(q);
  });
  const filteredFriends = friends.filter((f) =>
    f.otherUser?.userName?.toLowerCase().includes(inviteSearch.toLowerCase()),
  );
  const canPost = group?.isAdmin || group?.isFollowed;
  const filteredPosts =
    postTagFilter === "all"
      ? posts
      : posts.filter((p) => p.tags?.includes(postTagFilter));

  if (loading) {
    return (
      <PageShell title="Group">
        <div className="flex flex-col gap-4">
          <div
            className="h-48 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-subtle)" }}
          />
          <div
            className="h-40 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-subtle)" }}
          />
        </div>
      </PageShell>
    );
  }

  if (!group)
    return (
      <PageShell title="Group">
        <p
          className="text-sm text-center py-16"
          style={{ color: "var(--fg-muted)" }}
        >
          Group not found.
        </p>
      </PageShell>
    );

  const groupIconSrc = safeImg(sIconImg || group.groupImg);
  const bannerSrc = safeImg(sBannerImg || group.bannerImg);

  return (
    <PageShell title={group.groupName}>
      {/* Hidden file inputs */}
      <input
        ref={sBannerRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingSettingsImage({ file: f, field: "banner" });
          e.target.value = "";
        }}
      />
      <input
        ref={sIconRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingSettingsImage({ file: f, field: "icon" });
          e.target.value = "";
        }}
      />

      {pendingSettingsImage && (
        <ImagePositionPicker
          file={pendingSettingsImage.file}
          aspectRatio={pendingSettingsImage.field === "icon" ? 1 : 3.5}
          shape={pendingSettingsImage.field === "icon" ? "circle" : "rect"}
          outputWidth={pendingSettingsImage.field === "icon" ? 400 : 1400}
          outputHeight={pendingSettingsImage.field === "icon" ? 400 : 400}
          title={
            pendingSettingsImage.field === "icon"
              ? "Reposition group photo"
              : "Reposition banner"
          }
          onCancel={() => setPendingSettingsImage(null)}
          onConfirm={(cropped) => {
            const field = pendingSettingsImage.field;
            if (field === "icon") handleSettingsImageFile(cropped, setSIconPreview, setSIconImg);
            else handleSettingsImageFile(cropped, setSBannerPreview, setSBannerImg);
            setPendingSettingsImage(null);
          }}
        />
      )}
      {/* ── Group header ── */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        {/* Banner — click to change while editing, same as profile edit UI */}
        <div
          className="h-32 relative"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--primary) 35%, transparent), color-mix(in srgb, var(--primary) 8%, transparent))",
            cursor: showSettings ? "pointer" : "default",
          }}
          onMouseEnter={() => showSettings && setSBannerHover(true)}
          onMouseLeave={() => setSBannerHover(false)}
          onClick={() => showSettings && sBannerRef.current?.click()}
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
          {showSettings && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-150"
              style={{
                opacity: sBannerHover ? 1 : 0.4,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
              }}
            >
              {sBannerUploading ? (
                <span className="text-xs">Uploading…</span>
              ) : (
                <>
                  <Icons.Camera />
                  <span className="text-xs font-medium">Change banner</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="-mt-8 flex items-end justify-between mb-3">
            {/* Icon — click to change while editing, same as profile avatar UI */}
            <div
              className="w-16 h-16 rounded-xl border-4 flex items-center justify-center font-bold text-lg overflow-hidden relative shrink-0"
              style={{
                background: "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                color: "var(--primary)",
                borderColor: "var(--bg)",
                cursor: showSettings ? "pointer" : "default",
              }}
              onMouseEnter={() => showSettings && setSIconHover(true)}
              onMouseLeave={() => setSIconHover(false)}
              onClick={() => showSettings && sIconRef.current?.click()}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                {group.groupName.slice(0, 2).toUpperCase()}
              </span>
              {groupIconSrc && (
                <img
                  src={groupIconSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              {showSettings && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-150"
                  style={{
                    opacity: sIconHover ? 1 : 0,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                  }}
                >
                  {sIconUploading ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <>
                      <Icons.Camera />
                      <span className="text-[10px] font-medium leading-tight text-center px-1">
                        Edit photo
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap justify-end">
              {group.isAdmin && !showSettings && (
                <>
                  <button
                    onClick={openSettings}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      background: "var(--bg-subtle)",
                      color: "var(--fg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Icons.Settings /> Settings
                  </button>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      background: "var(--bg-subtle)",
                      color: "var(--fg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Icons.Plus /> Invite
                  </button>
                </>
              )}
              {group.isAdmin && showSettings && (
                <div className="flex items-center gap-2">
                  {sSaveError && (
                    <span
                      className="text-xs max-w-[220px]"
                      style={{ color: "#ef4444" }}
                    >
                      {sSaveError}
                    </span>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg"
                    style={{ color: "#ef4444" }}
                    aria-label="Delete group"
                  >
                    <Icons.Trash />
                  </button>
                  <button
                    onClick={closeSettings}
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
                    onClick={handleSaveSettings}
                    disabled={sSaving || sBannerUploading || sIconUploading}
                    className="px-4 py-1.5 text-sm rounded-lg font-medium transition-opacity disabled:opacity-50"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-fg)",
                    }}
                  >
                    {sSaving
                      ? "Saving…"
                      : sBannerUploading || sIconUploading
                        ? "Uploading…"
                        : "Save changes"}
                  </button>
                </div>
              )}
              {!group.isAdmin && (
                <button
                  onClick={handleJoinLeave}
                  disabled={joining}
                  className="text-sm px-4 py-1.5 rounded-lg font-medium disabled:opacity-50"
                  style={
                    group.isFollowed
                      ? {
                          border: "1px solid var(--border)",
                          color: "var(--fg-muted)",
                          background: "var(--bg)",
                        }
                      : {
                          background: "var(--primary)",
                          color: "var(--primary-fg)",
                        }
                  }
                >
                  {joining ? "…" : group.isFollowed ? "Leave" : "Join"}
                </button>
              )}
            </div>
          </div>

          {/* View mode */}
          {!showSettings && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "var(--fg)" }}
                >
                  {group.groupName}
                </h2>
                {group.isAdmin && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>
              {group.description && (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {group.description}
                </p>
              )}

              <button
                onClick={() => {
                  loadMembers();
                  setShowMembersModal(true);
                }}
                className="flex items-center gap-2 mt-2"
              >
                <div className="flex -space-x-2">
                  {members.slice(0, 10).map((m, i) => (
                    <div
                      key={m.memberId ?? i}
                      className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold relative"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                        color: "var(--primary)",
                        border: "2px solid var(--bg)",
                      }}
                    >
                      <span>
                        {(m.member?.userName ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                      {m.member?.profileImg && (
                        <img
                          src={m.member.profileImg}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {(group.populationCount ?? members.length) > 10 && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{
                        background: "var(--bg-subtle)",
                        color: "var(--fg-muted)",
                        border: "2px solid var(--bg)",
                      }}
                    >
                      +
                      {(
                        (group.populationCount ?? members.length) - 10
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
                <span
                  className="text-xs hover:underline"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {(group.populationCount ?? members.length).toLocaleString()}{" "}
                  member{(group.populationCount ?? members.length) === 1 ? "" : "s"}
                </span>
              </button>

              {group.groupThemes?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {group.groupThemes.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-0.5 rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Edit mode — Field-style inputs, matches profile edit UI */}
          {showSettings && (
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Group Name
                  </label>
                  <span
                    className="text-xs"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {sName.length}/50
                  </span>
                </div>
                <input
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Group name"
                  maxLength={50}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Description
                  </label>
                  <span
                    className="text-xs"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {sDesc.length}/200
                  </span>
                </div>
                <textarea
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  placeholder="Tell people what this group is about…"
                  rows={3}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Post tags
                  </label>
                  <span
                    className="text-xs"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {sThemes.length} tag{sThemes.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p
                  className="text-xs mb-2"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Members choose from these tags when posting — only admins
                  can add or remove them.
                </p>
                {sThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sThemes.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 12%, transparent)",
                          color: "var(--primary)",
                        }}
                      >
                        #{tag}
                        <button
                          onClick={() =>
                            setSThemes((p) => p.filter((t) => t !== tag))
                          }
                          className="opacity-60 hover:opacity-100 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={sThemeInput}
                  onChange={(e) => setSThemeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === ",") &&
                      sThemeInput.trim()
                    ) {
                      e.preventDefault();
                      const val = sThemeInput.trim().replace(/^#/, "");
                      if (val && !sThemes.includes(val))
                        setSThemes((p) => [...p, val]);
                      setSThemeInput("");
                    }
                  }}
                  placeholder="Add tag + Enter"
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
              </div>
              <div
                className="flex items-center justify-between gap-4 p-3 rounded-lg"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--fg)" }}
                  >
                    Allow anonymity
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    Lets members post without revealing their name — shown
                    as "Guest" instead.
                  </p>
                </div>
                <Switch
                  checked={sAllowAnonymity}
                  onChange={setSAllowAnonymity}
                  label="Allow anonymity"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Twitter/X style composer ── */}
      {canPost && !composerOpen && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl mb-5 cursor-text"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          onClick={() => openComposer()}
        >
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, var(--bg))",
              color: "var(--primary)",
            }}
          >
            {(clerkUser?.username ?? clerkUser?.firstName ?? "?")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span
            className="text-sm flex-1 select-none"
            style={{ color: "var(--fg-muted)" }}
          >
            What's on your mind?
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                background: "var(--primary)",
                color: "var(--primary-fg)",
              }}
            >
              Post
            </span>
          </div>
        </div>
      )}

      {/* Expanded composer */}
      {canPost && composerOpen && (
        <div
          className="rounded-2xl mb-5 overflow-hidden"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold mt-0.5"
              style={{
                background: "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                color: "var(--primary)",
              }}
            >
              {(clerkUser?.username ?? clerkUser?.firstName ?? "?")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Title input row — anonymity toggle sits top-right */}
              <div className="flex items-start gap-2">
                <input
                  ref={titleRef}
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Title (required)"
                  className="flex-1 min-w-0 text-sm font-semibold bg-transparent focus:outline-none placeholder-opacity-50"
                  style={{
                    color: "var(--fg)",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 8,
                  }}
                />
                {group.allowAnonymity && (
                  <button
                    type="button"
                    onClick={() => setPostAnonymous((v) => !v)}
                    title={
                      postAnonymous
                        ? "Posting anonymously — click to turn off"
                        : "Post anonymously"
                    }
                    className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors"
                    style={
                      postAnonymous
                        ? {
                            background: "var(--primary)",
                            color: "var(--primary-fg)",
                          }
                        : {
                            background: "var(--bg-subtle)",
                            color: "var(--fg-muted)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    <Icons.Mask />
                    {postAnonymous ? "Anonymous" : "Anonymous?"}
                  </button>
                )}
              </div>
              {/* Content textarea */}
              <MentionTextarea
                value={postContent}
                onChange={setPostContent}
                placeholder="What's happening? Use @ to mention someone"
                rows={3}
                className="w-full text-sm bg-transparent resize-none focus:outline-none"
                style={{ color: "var(--fg)" }}
                scopedUsers={memberMentionUsers}
              />

              {/* Tags — pick from the admin-defined list, never free-typed */}
              {(group.groupThemes?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {group.groupThemes.map((tag) => {
                    const active = postTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() =>
                          setPostTags((p) =>
                            p.includes(tag)
                              ? p.filter((t) => t !== tag)
                              : [...p, tag],
                          )
                        }
                        className="text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors"
                        style={
                          active
                            ? {
                                background: "var(--primary)",
                                color: "var(--primary-fg)",
                              }
                            : {
                                background:
                                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                                color: "var(--primary)",
                              }
                        }
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Image previews */}
              <ImageAttachmentStrip
                existing={postExistingImages}
                onRemoveExisting={(i) =>
                  setPostExistingImages((p) => p.filter((_, j) => j !== i))
                }
                newFiles={postImages}
                onRemoveNew={(i) =>
                  setPostImages((p) => p.filter((_, j) => j !== i))
                }
                onAddFiles={handleComposerImageFiles}
              />
            </div>
          </div>

          {/* Composer toolbar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {/* Tag hint — tags are picked above, from the admin's list */}
            <div className="flex-1">
              {(group.groupThemes?.length ?? 0) === 0 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  No tags yet — an admin can add some in Settings.
                </span>
              )}
            </div>

            {/* Cancel */}
            <button
              onClick={() => {
                setComposerOpen(false);
                setEditingPost(null);
              }}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                color: "var(--fg-muted)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>

            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={postSubmitting || !postTitle.trim()}
              className="text-xs px-4 py-1.5 rounded-full font-medium transition-opacity disabled:opacity-40"
              style={{
                background: "var(--primary)",
                color: "var(--primary-fg)",
              }}
            >
              {postSubmitting ? "…" : editingPost ? "Save" : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* ── Posts ── */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--fg-muted)" }}
        >
          Posts
        </p>
      </div>

      {(group.groupThemes?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setPostTagFilter("all")}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
            style={
              postTagFilter === "all"
                ? { background: "var(--primary)", color: "var(--primary-fg)" }
                : {
                    background: "var(--bg-subtle)",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            All
          </button>
          {group.groupThemes.map((tag) => (
            <button
              key={tag}
              onClick={() => setPostTagFilter(tag)}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
              style={
                postTagFilter === tag
                  ? { background: "var(--primary)", color: "var(--primary-fg)" }
                  : {
                      background: "var(--bg-subtle)",
                      color: "var(--fg-muted)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <p
          className="text-sm text-center py-10"
          style={{ color: "var(--fg-muted)" }}
        >
          {posts.length === 0
            ? `No posts yet.${canPost ? " Be the first!" : ""}`
            : "No posts with this tag."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showOwnerActions
              onDelete={handleDeletePost}
              onEdit={openComposer}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <Modal title="Delete Group" onClose={() => setShowDeleteConfirm(false)}>
          <p className="text-sm mb-5" style={{ color: "var(--fg-muted)" }}>
            Delete{" "}
            <strong style={{ color: "var(--fg)" }}>{group.groupName}</strong>?
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 text-sm rounded-xl"
              style={{
                border: "1px solid var(--border)",
                color: "var(--fg-muted)",
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Members modal ── */}
      {showMembersModal && (
        <Modal
          title={`Members (${members.length})`}
          onClose={() => setShowMembersModal(false)}
        >
          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                No members found.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
                Members may still be loading or the API returned an
                unexpected format.
              </p>
            </div>
          ) : (
            <>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full px-3 py-2 text-sm rounded-xl mb-4 focus:outline-none"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
              />
              {filteredMembers.length === 0 ? (
                <p
                  className="text-sm text-center py-6"
                  style={{ color: "var(--fg-muted)" }}
                >
                  No matches.
                </p>
              ) : (
                <div className="flex flex-col gap-0">
                  {filteredMembers.map((m) => {
                const isMe = m.memberId === userId;
                return (
                  <div
                    key={m.memberId}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <a href={`/user/${m.memberId}`} className="shrink-0">
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold relative"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                          color: "var(--primary)",
                        }}
                      >
                        <span>
                          {(m.member.userName ?? "?").slice(0, 2).toUpperCase()}
                        </span>
                        {m.member.profileImg && (
                          <img
                            src={m.member.profileImg}
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
                      href={`/user/${m.memberId}`}
                      className="flex-1 hover:underline"
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--fg)" }}
                      >
                        @{m.member.userName}
                      </span>
                      {isMe && (
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "var(--fg-subtle)" }}
                        >
                          (you)
                        </span>
                      )}
                    </a>
                    {group.isAdmin && !isMe && (
                      <select
                        value={m.role ?? "MEMBER"}
                        onChange={(e) =>
                          handleRoleChange(m.memberId, e.target.value)
                        }
                        disabled={updatingRole === m.memberId}
                        className="text-xs px-2 py-1 rounded-lg disabled:opacity-40 focus:outline-none"
                        style={{
                          background: "var(--bg-subtle)",
                          color: "var(--fg)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        {/* <option value="MODERATOR">Moderator</option> */}
                      </select>
                    )}
                    {group.isAdmin && !isMe && (
                      <button
                        onClick={() => handleKick(m.memberId)}
                        disabled={kicking === m.memberId}
                        className="text-xs px-2.5 py-1 rounded-lg disabled:opacity-40"
                        style={{
                          background:
                            "color-mix(in srgb, #ef4444 12%, transparent)",
                          color: "#ef4444",
                          border:
                            "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
                        }}
                      >
                        {kicking === m.memberId ? "…" : "Kick"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ── Invite modal ── */}
      {showInviteModal && (
        <Modal title="Invite Friends" onClose={() => setShowInviteModal(false)}>
          <input
            value={inviteSearch}
            onChange={(e) => setInviteSearch(e.target.value)}
            placeholder="Search friends…"
            className="w-full px-3 py-2 text-sm rounded-xl mb-4 focus:outline-none"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
          />
          {filteredFriends.length === 0 ? (
            <p
              className="text-sm text-center py-6"
              style={{ color: "var(--fg-muted)" }}
            >
              {friends.length === 0 ? "No friends yet." : "No matches."}
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {filteredFriends.map((f) => {
                const imgSrc = safeImg(f.otherUser?.profileImg);
                const alreadyIn = memberIds.has(f.otherUser?.id);
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold relative shrink-0"
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
                    <span
                      className="flex-1 text-sm font-medium"
                      style={{ color: "var(--fg)" }}
                    >
                      @{f.otherUser?.userName}
                    </span>
                    {alreadyIn ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        In group
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInvite(f.otherUser?.id)}
                        disabled={inviting === f.otherUser?.id}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium disabled:opacity-50"
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-fg)",
                        }}
                      >
                        {inviting === f.otherUser?.id ? "…" : "Invite"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </PageShell>
  );
}
