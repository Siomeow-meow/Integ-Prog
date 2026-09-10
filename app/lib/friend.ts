import { db, type LocalFriendRecord } from "./db";

function toApiFriend(f: LocalFriendRecord, viewerId: string) {
  const otherId = f.senderId === viewerId ? f.receiverId : f.senderId;
  const other = db.getUserById(otherId);
  return {
    id: f.id,
    friendId: f.id,
    createdAt: f.createdAt,
    status: f.status,
    isSender: f.senderId === viewerId,
    senderId: f.senderId,
    receiverId: f.receiverId,
    otherUser: {
      id: otherId,
      userName: other?.userName ?? "Unknown",
      profileImg: other?.profileImg ?? "",
    },
  };
}

function me(): string {
  const id = db.getCurrentUserId();
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function getFriends(_token?: any) {
  const viewer = me();
  const store = db.loadStore();
  return store.friends
    .filter((f) => f.status === "ACCEPTED" && (f.senderId === viewer || f.receiverId === viewer))
    .map((f) => toApiFriend(f, viewer));
}

export async function getFriend(id: string, _token?: any) {
  const viewer = me();
  const store = db.loadStore();
  const f = store.friends.find((f) => String(f.id) === String(id));
  if (!f) throw new Error("Friend not found");
  return toApiFriend(f, viewer);
}

export async function getUsersFriends(_token?: any) {
  return getFriends(_token);
}

export async function getUserFriendRequests(_token?: any) {
  const viewer = me();
  const store = db.loadStore();
  return store.friends
    .filter((f) => f.status === "PENDING" && f.receiverId === viewer)
    .map((f) => toApiFriend(f, viewer));
}

export async function sendFriendRequest(request: { receiverId: string; status: "PENDING" }, _token?: any) {
  const viewer = me();
  const store = db.loadStore();
  const existing = store.friends.find(
    (f) =>
      (f.senderId === viewer && f.receiverId === request.receiverId) ||
      (f.senderId === request.receiverId && f.receiverId === viewer),
  );
  if (existing) return toApiFriend(existing, viewer);
  const record: LocalFriendRecord = {
    id: db.nextId(),
    senderId: viewer,
    receiverId: request.receiverId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  store.friends.push(record);
  db.saveFriends(store.friends);
  return toApiFriend(record, viewer);
}

export async function acceptFriendRequest(
  _request: { receiverId: string; status: "ACCEPTED" },
  id: number,
  _token?: any,
) {
  const viewer = me();
  const store = db.loadStore();
  const idx = store.friends.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error("Receiver not found");
  store.friends[idx] = { ...store.friends[idx], status: "ACCEPTED" };
  db.saveFriends(store.friends);
  return toApiFriend(store.friends[idx], viewer);
}

export async function deleteFriend(id: number, _token?: any) {
  const store = db.loadStore();
  store.friends = store.friends.filter((f) => f.id !== id);
  db.saveFriends(store.friends);
  return { success: true };
}
