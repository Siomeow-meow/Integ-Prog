"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import PageShell from "@/app/components/PageShell";
import PostCard from "@/app/components/PostCard";
import EditPostModal from "@/app/components/EditPostModal";
import { getPosts, deletePost } from "@/app/lib/post";
import Post from "@/app/types/post";

// Saved posts are posts the user has bookmarked.
// Until a dedicated saved endpoint exists, we filter from the feed by a local
// persisted set (localStorage keyed by userId) so saves survive navigation.

function getSavedIds(userId: string): Set<number> {
  try {
    const raw = localStorage.getItem(`saved_posts_${userId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function setSavedIds(userId: string, ids: Set<number>) {
  try { localStorage.setItem(`saved_posts_${userId}`, JSON.stringify([...ids])); } catch {}
}

export default function SavedPage() {
  const { getToken, userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedIds, setSavedIdsState] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!userId) return;
    const ids = getSavedIds(userId);
    setSavedIdsState(ids);
    (async () => {
      try {
        const token = await getToken();
        const all: Post[] = await getPosts(token);
        setPosts((Array.isArray(all) ? all : []).filter((p) => ids.has(p.id)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  function handleUnsave(postId: number) {
    if (!userId) return;
    const next = new Set(savedIds);
    next.delete(postId);
    setSavedIdsState(next);
    setSavedIds(userId, next);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <PageShell
      title="Saved"
      description={loading ? "" : `${posts.length} saved post${posts.length !== 1 ? "s" : ""}`}
    >
      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-muted/10 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🔖</p>
          <p className="text-sm text-muted">Nothing saved yet.</p>
          <p className="text-xs text-muted mt-1">Tap the bookmark on any post to save it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <div key={post.id} className="relative group">
              <PostCard
                post={post}
                showOwnerActions
                onEdit={setEditingPost}
                onDelete={handleDeletePost}
              />
              <button
                onClick={() => handleUnsave(post.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-xs px-2.5 py-1 rounded-lg bg-background border border-muted/20 text-muted hover:text-foreground transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
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
    </PageShell>
  );
}
