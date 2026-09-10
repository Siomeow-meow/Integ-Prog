"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import ImagePositionPicker from "@/app/components/ImagePositionPicker";
import Group from "@/app/types/group";
import { uploadImage } from "../util/storage";
import {
  getGroups,
  getUserMemberships,
  createGroup,
  deleteGroup,
} from "@/app/lib/group";

function CameraIcon({ size = 5 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-${size} h-${size}`}
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
function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Safe image helper ─────────────────────────────────────────────────────────
function safeImg(src: string | null | undefined): string | null {
  if (!src || src.trim() === "") return null;
  return src;
}

export default function GroupsPage() {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ groupName: "", description: "" });

  const [groupImg, setGroupImg] = useState<File | null>(null);
  const [groupImgPreview, setGroupImgPreview] = useState<string>("");
  const [bannerImg, setBannerImg] = useState<File | null>(null);
  const [bannerImgPreview, setBannerImgPreview] = useState<string>("");

  const [bannerHover, setBannerHover] = useState(false);
  const [iconHover, setIconHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const groupImgInputRef = useRef<HTMLInputElement>(null);
  const bannerImgInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    field: "groupImg" | "bannerImg";
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const [all, joined] = await Promise.allSettled([
          getGroups(token),
          getUserMemberships(userId, token),
        ]);
        const allGroups: Group[] =
          all.status === "fulfilled" && Array.isArray(all.value)
            ? all.value
            : [];
        const joinedGroups: Group[] =
          joined.status === "fulfilled" && Array.isArray(joined.value)
            ? joined.value
            : [];
        const joinedIds = new Set(joinedGroups.map((g) => g.id));
        setMyGroups(allGroups.filter((g) => joinedIds.has(g.id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  function handleCancel() {
    setCreating(false);
    setNewGroup({ groupName: "", description: "" });
    setGroupImg(null);
    setBannerImg(null);
  }

  function handleImageFile(
    file: File,
    setFile: (file: File) => void,
    setPreview: (url: string) => void,
  ) {
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleCreate() {
    if (!newGroup.groupName.trim()) return;
    setSaving(true);
    try {
      if (!groupImg) {
        throw new Error("No image selected");
      }
      if (!bannerImg) {
        throw new Error("No banner selected");
      }

      const token = await getToken();

      const uploadedImage = await uploadImage({
        file: groupImg,
        bucket: "pancit-canton-sns",
        path: `group/${newGroup.groupName}/group-image.jpg`,
      });

      if (!uploadedImage) throw new Error("Image Upload failed");

      const uploadedBanner = await uploadImage({
        file: bannerImg,
        bucket: "pancit-canton-sns",
        path: `group/${newGroup.groupName}/banner.jpg`,
      });

      if (!uploadedBanner) throw new Error("Banner Upload failed");
      const created = await createGroup(
        {
          groupName: newGroup.groupName,
          description: newGroup.description,
          groupImg: uploadedImage,
          bannerImg: uploadedBanner,
        },
        token,
      );
      setMyGroups((prev) => [created, ...prev]);

      handleCancel();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(groupId: number) {
    setDeletingId(groupId);
    try {
      const token = await getToken();
      await deleteGroup(groupId, token);
      setMyGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const groupInitials =
    newGroup.groupName.trim().slice(0, 2).toUpperCase() || "GR";

  return (
    <PageShell
      title="My Groups"
      description="Communities you're part of"
      actions={
        <div className="flex gap-2">
          <Link
            href="/explore?tab=groups"
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--fg-muted)",
            }}
          >
            Browse all
          </Link>
          <button
            onClick={() => setCreating(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            + Create
          </button>
        </div>
      }
    >
      {/* Hidden file inputs */}
      <input
        ref={groupImgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingImage({ file: f, field: "groupImg" });
          e.target.value = "";
        }}
      />
      <input
        ref={bannerImgInputRef}
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
          aspectRatio={pendingImage.field === "groupImg" ? 1 : 3.5}
          shape={pendingImage.field === "groupImg" ? "circle" : "rect"}
          outputWidth={pendingImage.field === "groupImg" ? 400 : 1400}
          outputHeight={pendingImage.field === "groupImg" ? 400 : 400}
          title={
            pendingImage.field === "groupImg"
              ? "Reposition group photo"
              : "Reposition banner"
          }
          onCancel={() => setPendingImage(null)}
          onConfirm={(cropped) => {
            const field = pendingImage.field;
            if (field === "groupImg") handleImageFile(cropped, setGroupImg, setGroupImgPreview);
            else handleImageFile(cropped, setBannerImg, setBannerImgPreview);
            setPendingImage(null);
          }}
        />
      )}

      {/* Create form */}
      {creating && (
        <div
          className="rounded-2xl mb-5 overflow-hidden flex flex-col"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          {/* Banner upload area */}
          <div
            className="h-24 relative cursor-pointer"
            style={{
              background: bannerImgPreview
                ? "transparent"
                : "linear-gradient(135deg, color-mix(in srgb, var(--primary) 30%, transparent), color-mix(in srgb, var(--primary) 8%, transparent))",
            }}
            onMouseEnter={() => setBannerHover(true)}
            onMouseLeave={() => setBannerHover(false)}
            onClick={() => bannerImgInputRef.current?.click()}
          >
            {bannerImgPreview && (
              <img
                src={bannerImgPreview}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-150"
              style={{
                opacity: bannerHover || !bannerImgPreview ? 1 : 0,
                background: bannerImgPreview
                  ? "rgba(0,0,0,0.45)"
                  : "transparent",
                color: bannerImgPreview ? "#fff" : "var(--fg-muted)",
              }}
            >
              <CameraIcon size={5} />
              <span className="text-xs font-medium">
                {bannerImgPreview ? "Change banner" : "Add banner image"}
              </span>
            </div>
          </div>

          {/* Icon + fields */}
          <div className="px-5 pb-5">
            <div className="-mt-7 mb-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold border-4 relative overflow-hidden cursor-pointer flex-shrink-0"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 20%, var(--bg))",
                  color: "var(--primary)",
                  borderColor: "var(--bg)",
                }}
                onMouseEnter={() => setIconHover(true)}
                onMouseLeave={() => setIconHover(false)}
                onClick={() => groupImgInputRef.current?.click()}
              >
                {groupImgPreview ? (
                  <img
                    src={groupImgPreview}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  groupInitials
                )}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-150"
                  style={{
                    opacity: iconHover ? 1 : 0,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                  }}
                >
                  <CameraIcon size={4} />
                  <span className="text-[9px] font-medium leading-tight text-center px-1">
                    Edit
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={newGroup.groupName}
                onChange={(e) =>
                  setNewGroup((f) => ({ ...f, groupName: e.target.value }))
                }
                placeholder="Group name"
                className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
              />
              <textarea
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What's this group about? (optional)"
                rows={2}
                className="w-full px-3 py-2.5 text-sm rounded-xl resize-none focus:outline-none"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newGroup.groupName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-fg)",
                  }}
                >
                  {saving ? "Creating…" : "Create group"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm rounded-xl transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--fg-muted)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl animate-pulse"
              style={{ background: "var(--bg-subtle)" }}
            />
          ))}
        </div>
      ) : myGroups.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: "var(--bg-subtle)" }}
          >
            🧑‍🤝‍🧑
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--fg-muted)" }}
          >
            You haven't joined any groups
          </p>
          <p
            className="text-xs mt-1 mb-4"
            style={{ color: "var(--fg-subtle)" }}
          >
            Discover communities that match your interests.
          </p>
          <Link
            href="/explore?tab=groups"
            className="text-xs px-4 py-2 rounded-xl font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            Browse groups
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myGroups.map((group, idx) => {
            const groupImgSrc = safeImg(group.groupImg);
            const isConfirmingDelete = confirmDeleteId === group.id;
            return (
              <div key={group.id ?? `group-${idx}`} className="relative">
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border-strong)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border)")
                  }
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden relative"
                    style={{
                      background: "var(--primary-subtle)",
                      color: "var(--primary)",
                    }}
                  >
                    <span>
                      {(group.groupName ?? "").slice(0, 2).toUpperCase() ||
                        "GR"}
                    </span>
                    {groupImgSrc && (
                      <img
                        src={groupImgSrc}
                        alt={group.groupName ?? ""}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--fg)" }}
                      >
                        {group.groupName ?? "Unnamed Group"}
                      </p>
                      {group.isAdmin && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
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
                        className="text-xs mt-0.5 line-clamp-1"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {group.description}
                      </p>
                    )}
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {(group.populationCount ?? 0).toLocaleString()} members
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </Link>

                {/* Admin delete button */}
                {group.isAdmin && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(group.id);
                          }}
                          disabled={deletingId === group.id}
                          className="text-xs px-2 py-1 rounded-lg font-medium disabled:opacity-40"
                          style={{ background: "#ef4444", color: "#fff" }}
                        >
                          {deletingId === group.id ? "…" : "Confirm"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setConfirmDeleteId(null);
                          }}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{
                            border: "1px solid var(--border)",
                            color: "var(--fg-muted)",
                            background: "var(--bg)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmDeleteId(group.id);
                        }}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{
                          color: "#ef4444",
                          background:
                            "color-mix(in srgb, #ef4444 10%, transparent)",
                        }}
                        title="Delete group"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
