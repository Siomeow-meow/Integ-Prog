"use client";
import { useCallback, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import PostCard from "./components/PostCard";
import RightSidebar from "./components/RightSidebar";
import EditPostModal from "./components/EditPostModal";
import Post from "@/app/types/post";
import { getPosts, deletePost } from "@/app/lib/post";
import Link from "next/link";

export default function Home() {
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const { userId, getToken } = useAuth();

  async function handleDeletePost(postId: number) {
    try {
      const token = await getToken();
      await deletePost(postId, token);
      setFeed((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  }

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const userFeed = await getPosts(token);
      // Sort newest first
      const sorted = Array.isArray(userFeed)
        ? [...userFeed].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];
      setFeed(sorted);
    } catch (err) {
      console.error("FETCH POSTS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-5"
          style={{ background: "var(--primary)" }}
        >
          CG
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--fg)" }}>Welcome to CommonGround</h1>
        <p className="mt-2 text-sm max-w-xs" style={{ color: "var(--fg-muted)" }}>
          Find your community. Join groups, connect with people who share your interests.
        </p>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen md:ml-60 lg:mr-72">
        <div className="max-w-xl mx-auto py-6 px-4">
          {/* Page header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-semibold" style={{ color: "var(--fg)" }}>Feed</h1>
            <Link
              href="/explore"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Explore
            </Link>
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
              ))
            ) : feed.length === 0 ? (
              <div className="text-center py-16">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  📋
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Your feed is empty</p>
                <p className="text-xs mt-1 mb-4" style={{ color: "var(--fg-subtle)" }}>
                  Join groups or connect with people to see posts here.
                </p>
                <Link
                  href="/explore"
                  className="text-xs px-4 py-2 rounded-xl font-medium transition-opacity hover:opacity-90"
                  style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                >
                  Explore communities
                </Link>
              </div>
            ) : (
              feed.map((post: Post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showOwnerActions
                  onEdit={setEditingPost}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </div>
        </div>
      </main>
      <div className="hidden lg:block">
        <RightSidebar />
      </div>
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(updated) =>
            setFeed((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            )
          }
        />
      )}
    </>
  );
}
