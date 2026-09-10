import { getGroup, getGroups } from "@/app/lib/group";

// Module-level cache so every PostCard on the page shares one fetch of the
// group list instead of each post card re-fetching it.
let cachedMap: Map<number, string> | null = null;
let inflight: Promise<Map<number, string>> | null = null;

// Per-group in-flight lookups, for groups that weren't in the bulk list
// (e.g. private groups the viewer isn't a member of, or ones added after
// the bulk list was cached). Keyed by group id so concurrent PostCards
// asking about the same group share one request.
const singleInflight = new Map<number, Promise<string | null>>();

export async function loadGroupDirectory(
  token?: string | null,
): Promise<Map<number, string>> {
  if (cachedMap) return cachedMap;
  if (!inflight) {
    inflight = getGroups(token)
      .then((raw: any) => {
        const map = new Map<number, string>();
        (Array.isArray(raw) ? raw : []).forEach((g: any) => {
          if (g?.id != null && g?.groupName) map.set(g.id, g.groupName);
        });
        cachedMap = map;
        return map;
      })
      .catch(() => new Map<number, string>());
  }
  return inflight;
}

/**
 * Resolve a single group's name, even if it wasn't present in the bulk
 * directory (private groups, groups created after the directory was
 * cached, etc). Falls back to a direct /group/:id lookup and caches the
 * result so we don't refetch it every time a PostCard re-renders.
 *
 * Returns null only if the group truly can't be resolved (e.g. deleted),
 * in which case callers should fall back to showing the id.
 */
export async function getGroupName(
  groupId: number,
  token?: string | null,
): Promise<string | null> {
  if (cachedMap?.has(groupId)) return cachedMap.get(groupId)!;

  if (!singleInflight.has(groupId)) {
    const p = getGroup(String(groupId), token)
      .then((g: any) => {
        const name = g?.groupName ?? null;
        if (name) {
          if (!cachedMap) cachedMap = new Map();
          cachedMap.set(groupId, name);
        }
        return name;
      })
      .catch(() => null)
      .finally(() => {
        singleInflight.delete(groupId);
      });
    singleInflight.set(groupId, p);
  }
  return singleInflight.get(groupId)!;
}
