import { setUser } from "../store/user";
import { db, type LocalUser } from "./db";

export type PatchUserRequest = {
  fName?: string;
  lName?: string;
  bio?: string;
  profileImg?: string;
  bannerImg?: string;
  userName?: string;
};

function toApiUser(u: LocalUser) {
  return {
    id: u.id,
    email: u.email,
    userName: u.userName,
    profileImg: u.profileImg,
    banner: u.banner,
    fName: u.fName,
    lName: u.lName,
    bio: u.bio,
  };
}

export async function getUsers(_token?: string | null) {
  return db.getUsers().map(toApiUser);
}

export async function getUser(id: string, _token?: string | null) {
  const u = db.getUserById(id);
  return u ? toApiUser(u) : null;
}

export async function postUser(request: {
  id: string;
  email: string;
  fName: string | null;
  lName: string | null;
  profileImg: string | null;
  userName: string;
}) {
  const users = db.getUsers();
  const existing = users.find((u) => u.id === request.id);
  if (existing) return toApiUser(existing);
  const user: LocalUser = {
    id: request.id,
    email: request.email,
    userName: request.userName,
    profileImg: request.profileImg || "",
    banner: "",
    fName: request.fName || "",
    lName: request.lName || "",
    bio: "",
  };
  users.push(user);
  db.saveUsers(users);
  return toApiUser(user);
}

export async function patchUser(
  request: PatchUserRequest,
  id: string,
  dispatch: any,
  _token?: string | null,
) {
  const users = db.getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");
  const updated: LocalUser = {
    ...users[idx],
    ...(request.fName !== undefined ? { fName: request.fName } : {}),
    ...(request.lName !== undefined ? { lName: request.lName } : {}),
    ...(request.bio !== undefined ? { bio: request.bio } : {}),
    ...(request.profileImg !== undefined ? { profileImg: request.profileImg } : {}),
    ...(request.bannerImg !== undefined ? { banner: request.bannerImg } : {}),
    ...(request.userName !== undefined ? { userName: request.userName } : {}),
  };
  users[idx] = updated;
  db.saveUsers(users);
  const data = toApiUser(updated);
  if (typeof dispatch === "function") dispatch(setUser(data));
  return data;
}
