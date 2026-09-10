import { getUsers } from "@/app/lib/user";

export type MentionUser = {
  id: string;
  userName: string;
  fName?: string;
  lName?: string;
  profileImg?: string;
};

// Module-level cache so every mention-aware component on the page shares
// one fetch of the user directory instead of each post/comment/composer
// re-fetching the full user list.
let cachedUsers: MentionUser[] | null = null;
let cachedMap: Map<string, string> | null = null;
let inflight: Promise<{ users: MentionUser[]; map: Map<string, string> }> | null =
  null;

export async function loadMentionDirectory(
  token?: string | null,
): Promise<{ users: MentionUser[]; map: Map<string, string> }> {
  if (cachedUsers && cachedMap) return { users: cachedUsers, map: cachedMap };
  if (!inflight) {
    inflight = getUsers(token)
      .then((raw: any) => {
        const users: MentionUser[] = (Array.isArray(raw) ? raw : [])
          .filter((u: any) => u?.userName && u?.id)
          .map((u: any) => ({
            id: u.id,
            userName: u.userName,
            fName: u.fName,
            lName: u.lName,
            profileImg: u.profileImg,
          }));
        const map = new Map<string, string>();
        users.forEach((u) => map.set(u.userName.toLowerCase(), u.id));
        cachedUsers = users;
        cachedMap = map;
        return { users, map };
      })
      .catch(() => ({ users: [], map: new Map<string, string>() }));
  }
  return inflight;
}

export function searchMentionUsers(
  users: MentionUser[],
  query: string,
  limit = 6,
): MentionUser[] {
  const q = query.toLowerCase();
  const pool = !q
    ? users
    : users.filter(
        (u) =>
          u.userName.toLowerCase().includes(q) ||
          `${u.fName ?? ""} ${u.lName ?? ""}`.toLowerCase().includes(q),
      );
  return pool.slice(0, limit);
}

// Group member records come back from the API as
// { memberId, member: { userName, profileImg } , ... }. Mention pickers need
// the flat MentionUser shape, so this normalises the group-member list the
// same way loadMentionDirectory normalises the global user list — this is
// what lets @mentions be scoped to "people in this group" instead of every
// user on the platform.
export function mapMembersToMentionUsers(raw: any[]): MentionUser[] {
  return (Array.isArray(raw) ? raw : [])
    .map((m: any): MentionUser | null => {
      const id = m?.memberId ?? m?.id ?? m?.userId ?? m?.member?.id;
      const userName = m?.member?.userName ?? m?.userName;
      const profileImg = m?.member?.profileImg ?? m?.profileImg;
      return id && userName ? { id, userName, profileImg } : null;
    })
    .filter((u): u is MentionUser => !!u);
}

// Friend records come back as { status, otherUser: { id, userName, profileImg } }.
export function mapFriendsToMentionUsers(raw: any[]): MentionUser[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((f: any) => !f?.status || f.status === "ACCEPTED")
    .map((f: any): MentionUser | null => {
      const u = f?.otherUser;
      return u?.id && u?.userName
        ? { id: u.id, userName: u.userName, profileImg: u.profileImg }
        : null;
    })
    .filter((u): u is MentionUser => !!u);
}

// Matches "@handle" tokens (2-30 word chars) anywhere in a string.
export const MENTION_PATTERN = /@([a-zA-Z0-9_]{2,30})/g;

export function extractMentionHandles(text: string): string[] {
  const handles = new Set<string>();
  const re = new RegExp(MENTION_PATTERN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? ""))) handles.add(m[1].toLowerCase());
  return [...handles];
}
