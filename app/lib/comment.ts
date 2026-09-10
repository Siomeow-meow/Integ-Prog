import { db, type LocalComment } from "./db";

function buildTree(all: LocalComment[], parentId: number | null): any[] {
  const me = db.getCurrentUserId();
  return all
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((c) => {
      const commenter = db.getUserById(c.commenterId);
      return {
        id: c.id,
        postId: c.postId,
        commenterId: c.commenterId,
        commenter: {
          userName: commenter?.userName ?? "Unknown",
          profileImg: commenter?.profileImg ?? "",
        },
        content: c.content,
        createdAt: c.createdAt,
        likesCount: c.likedBy.length,
        isLiked: !!me && c.likedBy.includes(me),
        parentId: c.parentId,
        replies: buildTree(all, c.id),
      };
    });
}

export async function getComments(_token?: any) {
  const store = db.loadStore();
  return buildTree(store.comments, null);
}

export async function getComment(id: string, _token?: any) {
  const store = db.loadStore();
  const c = store.comments.find((c) => String(c.id) === String(id));
  if (!c) throw new Error("Comment not found");
  return buildTree(store.comments, c.parentId).find((x) => x.id === c.id) ?? null;
}

export async function postComment(
  request: { content: string; commenterId: string; postId: number; parentId?: number | null },
  _token?: any,
) {
  const store = db.loadStore();
  const comment: LocalComment = {
    id: db.nextId(),
    postId: request.postId,
    commenterId: request.commenterId,
    content: request.content,
    createdAt: new Date().toISOString(),
    parentId: (request as any).parentId ?? null,
    likedBy: [],
  };
  store.comments.push(comment);
  db.saveComments(store.comments);
  const commenter = db.getUserById(comment.commenterId);
  return {
    id: comment.id,
    postId: comment.postId,
    commenterId: comment.commenterId,
    commenter: { userName: commenter?.userName ?? "Unknown", profileImg: commenter?.profileImg ?? "" },
    content: comment.content,
    createdAt: comment.createdAt,
    likesCount: 0,
    isLiked: false,
    parentId: comment.parentId,
    replies: [],
  };
}

export async function getPostComments(id: string, _token?: any) {
  const store = db.loadStore();
  const forPost = store.comments.filter((c) => String(c.postId) === String(id));
  return buildTree(forPost, null);
}

export async function deleteComment(id: number, _token?: any) {
  const store = db.loadStore();
  const idsToRemove = new Set<number>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of store.comments) {
      if (c.parentId != null && idsToRemove.has(c.parentId) && !idsToRemove.has(c.id)) {
        idsToRemove.add(c.id);
        changed = true;
      }
    }
  }
  store.comments = store.comments.filter((c) => !idsToRemove.has(c.id));
  db.saveComments(store.comments);
  return { success: true };
}

export async function likeComment(request: { type: "LIKE" | "UNLIKE" }, _token: any, id: number) {
  const store = db.loadStore();
  const idx = store.comments.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Comment not found");
  const me = db.getCurrentUserId();
  if (me) {
    const set = new Set(store.comments[idx].likedBy);
    if (request.type === "LIKE") set.add(me);
    else set.delete(me);
    store.comments[idx] = { ...store.comments[idx], likedBy: [...set] };
    db.saveComments(store.comments);
  }
  return { success: true, likesCount: store.comments[idx].likedBy.length };
}

export async function patchComment(request: { content: string }, id: string, _token?: any) {
  const store = db.loadStore();
  const idx = store.comments.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) throw new Error("Comment not found");
  store.comments[idx] = { ...store.comments[idx], content: request.content };
  db.saveComments(store.comments);
  return { success: true };
}
