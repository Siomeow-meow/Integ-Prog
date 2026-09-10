import { db, type LocalGroup, type LocalGroupMember } from "./db";

export type PatchGroupRequest = {
  groupName?: string;
  description?: string;
  groupImg?: string;
  bannerImg?: string;
  groupThemes?: string[];
  allowAnonymity?: boolean;
};

function memberPreview(store: ReturnType<typeof db.loadStore>, groupId: number) {
  return store.groupMembers
    .filter((m) => m.groupId === groupId)
    .slice(0, 6)
    .map((m) => {
      const u = db.getUserById(m.userId);
      return { id: m.userId, userName: u?.userName ?? "Unknown", profileImg: u?.profileImg ?? "" };
    });
}

function toApiGroup(g: LocalGroup) {
  const store = db.loadStore();
  const viewer = db.getCurrentUserId();
  const membership = store.groupMembers.find((m) => m.groupId === g.id && m.userId === viewer);
  const populationCount = store.groupMembers.filter((m) => m.groupId === g.id).length;
  return {
    id: g.id,
    groupName: g.groupName,
    description: g.description,
    groupImg: g.groupImg,
    bannerImg: g.bannerImg,
    groupThemes: g.groupThemes,
    allowAnonymity: g.allowAnonymity,
    populationCount,
    isFollowed: !!membership,
    isAdmin: membership?.role === "OWNER" || membership?.role === "ADMIN",
    posts: { id: g.id },
    groupMembers: memberPreview(store, g.id),
  };
}

export async function getGroups(_token?: any) {
  const store = db.loadStore();
  return store.groups.map(toApiGroup);
}

export async function getGroup(id: string, _token?: any) {
  const store = db.loadStore();
  const g = store.groups.find((g) => String(g.id) === String(id));
  if (!g) throw new Error("Group not found");
  return toApiGroup(g);
}

export async function getUserMemberships(id: string, _token?: any) {
  const store = db.loadStore();
  const groupIds = new Set(store.groupMembers.filter((m) => m.userId === id).map((m) => m.groupId));
  return store.groups.filter((g) => groupIds.has(g.id)).map(toApiGroup);
}

export async function createGroup(
  request: { groupName: string; description: string; groupImg: string; bannerImg: string },
  _token?: any,
) {
  const owner = db.getCurrentUserId();
  if (!owner) throw new Error("Not signed in");
  const store = db.loadStore();
  const group: LocalGroup = {
    id: db.nextId(),
    groupName: request.groupName,
    description: request.description,
    groupImg: request.groupImg,
    bannerImg: request.bannerImg,
    groupThemes: [],
    allowAnonymity: false,
    createdBy: owner,
    createdAt: new Date().toISOString(),
  };
  store.groups.push(group);
  store.groupMembers.push({ groupId: group.id, userId: owner, role: "OWNER", joinedAt: group.createdAt });
  db.saveGroups(store.groups);
  db.saveGroupMembers(store.groupMembers);
  return toApiGroup(group);
}

export async function patchGroup(request: PatchGroupRequest, id: number, _token?: any) {
  const store = db.loadStore();
  const idx = store.groups.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error("Group not found");
  store.groups[idx] = { ...store.groups[idx], ...request } as LocalGroup;
  db.saveGroups(store.groups);
  return toApiGroup(store.groups[idx]);
}

export async function followGroup(_request: { role: string }, _token: any, id: number) {
  const viewer = db.getCurrentUserId();
  if (!viewer) throw new Error("Not signed in");
  const store = db.loadStore();
  const exists = store.groupMembers.find((m) => m.groupId === id && m.userId === viewer);
  if (exists) {
    store.groupMembers = store.groupMembers.filter((m) => !(m.groupId === id && m.userId === viewer));
  } else {
    store.groupMembers.push({ groupId: id, userId: viewer, role: "MEMBER", joinedAt: new Date().toISOString() });
  }
  db.saveGroupMembers(store.groupMembers);
  return { success: true, isFollowed: !exists };
}

export async function getGroupPosts(id: string, _token?: any) {
  const store = db.loadStore();
  const { getPosts } = await import("./post");
  const all = await getPosts();
  return (all as any[]).filter((p) => String(p.groupId) === String(id));
}

export async function deleteGroup(id: number, _token?: any) {
  const store = db.loadStore();
  store.groups = store.groups.filter((g) => g.id !== id);
  store.groupMembers = store.groupMembers.filter((m) => m.groupId !== id);
  store.posts = store.posts.filter((p) => p.groupId !== id);
  db.saveGroups(store.groups);
  db.saveGroupMembers(store.groupMembers);
  db.saveposts(store.posts);
  return { success: true };
}

export async function getGroupMembers(id: string, _token?: any) {
  const store = db.loadStore();
  return store.groupMembers
    .filter((m) => String(m.groupId) === String(id))
    .map((m) => {
      const u = db.getUserById(m.userId);
      return {
        id: `${m.groupId}-${m.userId}`,
        memberId: m.userId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: { userName: u?.userName ?? "Unknown", profileImg: u?.profileImg ?? "" },
      };
    });
}

export async function kickMember(groupId: number, memberId: string, _token?: any) {
  const store = db.loadStore();
  store.groupMembers = store.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === memberId));
  db.saveGroupMembers(store.groupMembers);
  return { success: true };
}

export async function updateMemberRole(groupId: number, memberId: string, role: string, _token?: any) {
  const store = db.loadStore();
  const idx = store.groupMembers.findIndex((m) => m.groupId === groupId && m.userId === memberId);
  if (idx === -1) throw new Error("Member not found");
  store.groupMembers[idx] = { ...store.groupMembers[idx], role: role as LocalGroupMember["role"] };
  db.saveGroupMembers(store.groupMembers);
  return { success: true };
}

export async function inviteMember(groupId: number, userId: string, _token?: any) {
  const store = db.loadStore();
  const exists = store.groupMembers.find((m) => m.groupId === groupId && m.userId === userId);
  if (!exists) {
    store.groupMembers.push({ groupId, userId, role: "MEMBER", joinedAt: new Date().toISOString() });
    db.saveGroupMembers(store.groupMembers);
  }
  return { success: true };
}
