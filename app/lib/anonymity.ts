/**
 * Anonymous posting helpers.
 *
 * When a group has "allow anonymity" enabled, a member can post without
 * revealing their username / first name / last name. Instead of the real
 * identity we show a "Guest<N>" label.
 *
 * The guest number is derived deterministically from the author's id and
 * the group it was posted in (rather than a random or session-based
 * counter), so the *same* person always renders as the *same* GuestN inside
 * a given group — no matter who is viewing the post or when it's loaded —
 * without needing the backend to hand out sequential ids.
 */

function hashToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

/** Stable "GuestN" label for a given author within a given group/scope. */
export function getGuestLabel(
  authorId: string | null | undefined,
  scopeId: number | string | null | undefined,
): string {
  const key = `${scopeId ?? "global"}:${authorId ?? "unknown"}`;
  const n = (hashToInt(key) % 9999) + 1;
  return `Guest${n}`;
}

export type DisplayIdentity = {
  userName: string;
  profileImg?: string;
  isAnonymous: boolean;
};

/**
 * Given a post (with its real author info) and the group it belongs to,
 * returns what should actually be rendered — the real identity, or a
 * "GuestN" identity with no profile image if the post was made
 * anonymously.
 */
export function getDisplayIdentity(post: {
  isAnonymous?: boolean;
  authorId?: string;
  userId?: string;
  groupId?: number | null;
  author?: { userName?: string; profileImg?: string };
}): DisplayIdentity {
  if (!post.isAnonymous) {
    return {
      userName: post.author?.userName ?? "Unknown",
      profileImg: post.author?.profileImg,
      isAnonymous: false,
    };
  }
  const id = post.authorId ?? post.userId;
  return {
    userName: getGuestLabel(id, post.groupId),
    profileImg: undefined,
    isAnonymous: true,
  };
}
