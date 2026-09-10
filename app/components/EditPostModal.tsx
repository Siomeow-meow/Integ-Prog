"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import MentionTextarea from "@/app/components/MentionTextarea";
import { patchPost } from "@/app/lib/post";
import { getGroup, getGroupMembers } from "@/app/lib/group";
import { mapMembersToMentionUsers } from "@/app/lib/mentionDirectory";
import { uploadImage } from "@/app/util/storage";
import ImageAttachmentStrip from "@/app/components/ImageAttachmentStrip";
import Switch from "@/app/components/Switch";
import Post from "@/app/types/post";

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

/**
 * Modal for editing an existing post. Usable from anywhere a post shows up —
 * the group page, the feed, a profile, etc. — not just from inside a group.
 *
 * Tags are never free-typed here: if the post belongs to a group, the only
 * choices offered are that group's admin-defined tags (groupThemes). Posts
 * with no group have no tag source, so the tag picker is hidden for them.
 */
export default function EditPostModal({
  post,
  onClose,
  onSaved,
}: {
  post: Post;
  onClose: () => void;
  onSaved: (updated: Post) => void;
}) {
  const { getToken, userId } = useAuth();

  const [title, setTitle] = useState(post.title ?? "");
  const [content, setContent] = useState(post.content ?? "");
  const [existingImages, setExistingImages] = useState<string[]>(
    post.images ?? [],
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>(post.tags ?? []);
  const [availableTags, setAvailableTags] = useState<string[] | null>(null);
  const [scopedUsers, setScopedUsers] = useState<any[]>([]);
  const [allowAnonymity, setAllowAnonymity] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(!!post.isAnonymous);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // If this post lives in a group, pull that group's admin-curated tag list
  // so the user can only pick from existing tags — never create their own.
  useEffect(() => {
    if (!post.groupId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const [group, members] = await Promise.all([
          getGroup(String(post.groupId), token),
          getGroupMembers(String(post.groupId), token),
        ]);
        if (cancelled) return;
        setAvailableTags(
          Array.isArray(group?.groupThemes) ? group.groupThemes : [],
        );
        setAllowAnonymity(!!group?.allowAnonymity);
        setScopedUsers(mapMembersToMentionUsers(members));
      } catch {
        if (!cancelled) setAvailableTags([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.groupId]);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleFiles(files: FileList) {
    setNewImages((prev) => [...prev, ...Array.from(files)]);
  }

  async function handleSave() {
    if (!title.trim() || !userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        setUploading(true);
        uploadedUrls = await Promise.all(
          newImages.map(async (image) => {
            const uploaded = await uploadImage({
              file: image,
              bucket: "pancit-canton-sns",
              path: `post/${post.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
            });
            return uploaded;
          }),
        );
        setUploading(false);
      }

      const updated = await patchPost(
        {
          title: title.trim(),
          content: content.trim(),
          tags,
          images: [...existingImages, ...uploadedUrls],
          authorId: userId,
          ...(allowAnonymity ? { isAnonymous } : {}),
        },
        post.id,
        token,
      );
      onSaved({ ...post, ...updated });
      onClose();
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            Edit post
          </h3>
          <div className="flex items-center gap-2">
            {allowAnonymity && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  Anonymous
                </span>
                <Switch
                  checked={isAnonymous}
                  onChange={setIsAnonymous}
                  label="Post anonymously"
                />
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--fg-muted)" }}
            >
              <XIcon />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (required)"
            className="w-full text-sm font-semibold bg-transparent focus:outline-none"
            style={{
              color: "var(--fg)",
              borderBottom: "1px solid var(--border)",
              paddingBottom: 8,
            }}
          />

          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="What's happening? Use @ to mention someone"
            rows={4}
            className="w-full text-sm bg-transparent resize-none focus:outline-none"
            style={{ color: "var(--fg)" }}
            scopedUsers={scopedUsers.length ? scopedUsers : undefined}
          />

          {/* Images */}
          <ImageAttachmentStrip
            existing={existingImages}
            onRemoveExisting={(i) =>
              setExistingImages((p) => p.filter((_, j) => j !== i))
            }
            newFiles={newImages}
            onRemoveNew={(i) => setNewImages((p) => p.filter((_, j) => j !== i))}
            onAddFiles={handleFiles}
            uploading={uploading}
          />

          {/* Tags — only ever a picker over the group's admin-defined tags */}
          {post.groupId != null && (
            <div>
              <p
                className="text-xs font-medium mb-1.5"
                style={{ color: "var(--fg-muted)" }}
              >
                Tags
              </p>
              {availableTags === null ? (
                <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  Loading tags…
                </p>
              ) : availableTags.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  This group's admin hasn't added any tags yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                        style={
                          active
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
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-2 px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-xs flex-1" style={{ color: "#ef4444" }}>
            {saveError}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              color: "var(--fg-muted)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !title.trim()}
            className="text-xs px-4 py-1.5 rounded-full font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {uploading ? "Uploading…" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
