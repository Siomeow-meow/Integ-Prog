import { db, type LocalPost } from "./db";

function toApiPost(p: LocalPost) {
  const author = db.getUserById(p.authorId);
  const me = db.getCurrentUserId();
  const store = db.loadStore();
  const commentsCount = store.comments.filter((c) => c.postId === p.id).length;
  return {
    id: p.id,
    userId: p.authorId,
    authorId: p.authorId,
    author: {
      userName: author?.userName ?? "Unknown",
      profileImg: author?.profileImg ?? "",
    },
    title: p.title,
    subject: p.subject,
    content: p.content,
    images: p.images,
    tags: p.tags,
    isAnonymous: p.isAnonymous,
    createdAt: p.createdAt,
    groupId: p.groupId,
    status: p.status,
    likesCount: p.likedBy.length,
    isLiked: !!me && p.likedBy.includes(me),
    commentsCount,
  };
}

export async function getPosts(_token?: any) {
  const store = db.loadStore();
  return store.posts
    .filter((p) => p.status === "published")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toApiPost);
}

export async function getPost(id: string, _token?: any) {
  const store = db.loadStore();
  const post = store.posts.find((p) => String(p.id) === String(id));
  if (!post) throw new Error("Post not found");
  return toApiPost(post);
}

export async function getPostsByAuthor(id: string, _token?: any) {
  const store = db.loadStore();
  return store.posts
    .filter((p) => p.authorId === id && p.status === "published")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toApiPost);
}

export async function postPost(
  request: {
    title: string;
    content: string;
    tags: string[];
    images: string[];
    status: string;
    authorId: string;
    groupId?: number;
    parentId?: number;
    isAnonymous?: boolean;
  },
  _token?: any,
) {
  const store = db.loadStore();
  const post: LocalPost = {
    id: db.nextId(),
    authorId: request.authorId,
    title: request.title,
    subject: request.title,
    content: request.content,
    images: request.images ?? [],
    tags: request.tags ?? [],
    isAnonymous: !!request.isAnonymous,
    createdAt: new Date().toISOString(),
    groupId: request.groupId ?? null,
    status: (request.status as LocalPost["status"]) || "published",
    likedBy: [],
  };
  store.posts.unshift(post);
  db.saveposts(store.posts);
  return toApiPost(post);
}

export async function deletePost(id: number, _token?: any) {
  const store = db.loadStore();
  store.posts = store.posts.filter((p) => p.id !== id);
  store.comments = store.comments.filter((c) => c.postId !== id);
  db.saveposts(store.posts);
  db.saveComments(store.comments);
  return { success: true };
}

export async function patchPost(
  request: {
    title?: string;
    content?: string;
    tags?: string[];
    images?: string[];
    status?: string;
    authorId: string;
    isAnonymous?: boolean;
  },
  id: number,
  _token?: any,
) {
  const store = db.loadStore();
  const idx = store.posts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Post not found");
  const updated: LocalPost = {
    ...store.posts[idx],
    ...(request.title !== undefined ? { title: request.title, subject: request.title } : {}),
    ...(request.content !== undefined ? { content: request.content } : {}),
    ...(request.tags !== undefined ? { tags: request.tags } : {}),
    ...(request.images !== undefined ? { images: request.images } : {}),
    ...(request.status !== undefined ? { status: request.status as LocalPost["status"] } : {}),
    ...(request.isAnonymous !== undefined ? { isAnonymous: request.isAnonymous } : {}),
  };
  store.posts[idx] = updated;
  db.saveposts(store.posts);
  return toApiPost(updated);
}

export async function likePost(request: { type: string }, _token: any, id: number) {
  const store = db.loadStore();
  const idx = store.posts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Post not found");
  const me = db.getCurrentUserId();
  if (me) {
    const set = new Set(store.posts[idx].likedBy);
    if (request.type === "LIKE") set.add(me);
    else set.delete(me);
    store.posts[idx] = { ...store.posts[idx], likedBy: [...set] };
    db.saveposts(store.posts);
  }
  return toApiPost(store.posts[idx]);
}
