/**
 * Frontend-only "database".
 *
 * The original app talked to a Postgres/Prisma backend over an API proxy
 * (plus Supabase storage, a websocket server, and Clerk auth). None of that
 * exists here — everything lives in the browser's localStorage instead,
 * seeded with sample data on first load. The various app/lib/*.ts files
 * that components already import from are thin wrappers around the
 * functions below, so components themselves didn't need to change.
 */
"use client";

const NS = "cg:v1:";
const CURRENT_USER_KEY = "cg:currentUserId";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — no-op, matches the rest of the app
  }
}

let nextIdCounter: number | null = null;
function nextId(): number {
  if (nextIdCounter === null) nextIdCounter = read<number>("nextId", 1000);
  nextIdCounter += 1;
  write("nextId", nextIdCounter);
  return nextIdCounter;
}

// ── Types ────────────────────────────────────────────────────────────────

export type LocalUser = {
  id: string;
  email: string;
  userName: string;
  profileImg: string;
  banner: string;
  fName: string;
  lName: string;
  bio: string;
};

export type LocalPost = {
  id: number;
  authorId: string;
  title: string;
  subject: string;
  content: string;
  images: string[];
  tags: string[];
  isAnonymous: boolean;
  createdAt: string;
  groupId: number | null;
  status: "published" | "draft" | "archived";
  likedBy: string[];
};

export type LocalComment = {
  id: number;
  postId: number;
  commenterId: string;
  content: string;
  createdAt: string;
  parentId: number | null;
  likedBy: string[];
};

export type FriendStatus = "PENDING" | "ACCEPTED";
export type LocalFriendRecord = {
  id: number;
  senderId: string;
  receiverId: string;
  status: FriendStatus;
  createdAt: string;
};

export type LocalGroup = {
  id: number;
  groupName: string;
  description: string;
  groupImg: string;
  bannerImg: string;
  groupThemes: string[];
  allowAnonymity: boolean;
  createdBy: string;
  createdAt: string;
};

export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";
export type LocalGroupMember = {
  groupId: number;
  userId: string;
  role: GroupRole;
  joinedAt: string;
};

export type LocalConversation = {
  id: number;
  isGroup: boolean;
  name?: string;
  participantIds: string[];
  createdAt: string;
};

export type LocalMessage = {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  createdAt: string;
};

// ── Seed data ────────────────────────────────────────────────────────────

const SEED_USERS: LocalUser[] = [
  {
    id: "u_you",
    email: "you@example.com",
    userName: "you",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=you",
    banner: "https://images.unsplash.com/photo-1497294815431-9365093b7331?w=1200&q=60",
    fName: "Jordan",
    lName: "Rivera",
    bio: "Just here to figure things out one day at a time 🌱",
  },
  {
    id: "u_maya",
    email: "maya@example.com",
    userName: "maya.k",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=maya",
    banner: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=60",
    fName: "Maya",
    lName: "Kapoor",
    bio: "Therapy-going, plant-owning, chronic overthinker.",
  },
  {
    id: "u_sam",
    email: "sam@example.com",
    userName: "sam.writes",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=sam",
    banner: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=60",
    fName: "Sam",
    lName: "Okafor",
    bio: "Writer, night owl, working on being kinder to myself.",
  },
  {
    id: "u_elena",
    email: "elena@example.com",
    userName: "elena.runs",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=elena",
    banner: "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?w=1200&q=60",
    fName: "Elena",
    lName: "Petrova",
    bio: "Running helps. Talking helps more.",
  },
  {
    id: "u_theo",
    email: "theo@example.com",
    userName: "theo.b",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=theo",
    banner: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=60",
    fName: "Theo",
    lName: "Brandt",
    bio: "New here. Trying to open up more.",
  },
  {
    id: "u_priya",
    email: "priya@example.com",
    userName: "priya.s",
    profileImg: "https://api.dicebear.com/7.x/notionists/svg?seed=priya",
    banner: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=60",
    fName: "Priya",
    lName: "Sharma",
    bio: "Grad student, part-time worrier, full-time support system for my friends.",
  },
];

const SEED_GROUPS: Omit<LocalGroup, "id" | "createdAt">[] = [
  {
    groupName: "Anxiety Support Circle",
    description: "A judgment-free space to talk through anxious thoughts, share coping strategies, and remind each other we're not alone.",
    groupImg: "https://api.dicebear.com/7.x/shapes/svg?seed=anxiety",
    bannerImg: "https://images.unsplash.com/photo-1476611317561-60117649dd94?w=1200&q=60",
    groupThemes: ["Anxiety", "Coping skills", "Peer support"],
    allowAnonymity: true,
    createdBy: "u_maya",
  },
  {
    groupName: "Late Night Thoughts",
    description: "For the 2am overthinkers. Post whatever's on your mind — venting welcome, advice optional.",
    groupImg: "https://api.dicebear.com/7.x/shapes/svg?seed=latenight",
    bannerImg: "https://images.unsplash.com/photo-1470753323753-3f8091bb0232?w=1200&q=60",
    groupThemes: ["Venting", "Insomnia", "Journaling"],
    allowAnonymity: true,
    createdBy: "u_sam",
  },
  {
    groupName: "Movement & Mood",
    description: "Sharing how exercise, walks, and stretching affect mental health — small wins count.",
    groupImg: "https://api.dicebear.com/7.x/shapes/svg?seed=movement",
    bannerImg: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=60",
    groupThemes: ["Exercise", "Habits", "Motivation"],
    allowAnonymity: false,
    createdBy: "u_elena",
  },
  {
    groupName: "New Here",
    description: "Just started therapy, just downloaded this app, or just trying to open up for the first time? Start here.",
    groupImg: "https://api.dicebear.com/7.x/shapes/svg?seed=newhere",
    bannerImg: "https://images.unsplash.com/photo-1441716844725-09cedc13a4e7?w=1200&q=60",
    groupThemes: ["Beginners", "Introductions"],
    allowAnonymity: true,
    createdBy: "u_theo",
  },
];

// ── Store shape ──────────────────────────────────────────────────────────

type Store = {
  users: LocalUser[];
  posts: LocalPost[];
  comments: LocalComment[];
  friends: LocalFriendRecord[];
  groups: LocalGroup[];
  groupMembers: LocalGroupMember[];
  conversations: LocalConversation[];
  messages: LocalMessage[];
};

function loadStore(): Store {
  return {
    users: read<LocalUser[]>("users", []),
    posts: read<LocalPost[]>("posts", []),
    comments: read<LocalComment[]>("comments", []),
    friends: read<LocalFriendRecord[]>("friends", []),
    groups: read<LocalGroup[]>("groups", []),
    groupMembers: read<LocalGroupMember[]>("groupMembers", []),
    conversations: read<LocalConversation[]>("conversations", []),
    messages: read<LocalMessage[]>("messages", []),
  };
}

function saveUsers(v: LocalUser[]) { write("users", v); }
function saveposts(v: LocalPost[]) { write("posts", v); }
function saveComments(v: LocalComment[]) { write("comments", v); }
function saveFriends(v: LocalFriendRecord[]) { write("friends", v); }
function saveGroups(v: LocalGroup[]) { write("groups", v); }
function saveGroupMembers(v: LocalGroupMember[]) { write("groupMembers", v); }
function saveConversations(v: LocalConversation[]) { write("conversations", v); }
function saveMessages(v: LocalMessage[]) { write("messages", v); }

function ago(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function seedIfNeeded() {
  if (typeof window === "undefined") return;
  if (read<boolean>("seeded", false)) return;

  const users = SEED_USERS;
  saveUsers(users);

  const groups: LocalGroup[] = SEED_GROUPS.map((g, i) => ({
    ...g,
    id: 1 + i,
    createdAt: ago(60 * 24 * (30 - i * 3)),
  }));
  saveGroups(groups);

  const members: LocalGroupMember[] = [];
  groups.forEach((g) => {
    members.push({ groupId: g.id, userId: g.createdBy, role: "OWNER", joinedAt: g.createdAt });
  });
  // "you" belongs to the first two groups; a few other cross-memberships
  members.push({ groupId: 1, userId: "u_you", role: "MEMBER", joinedAt: ago(60 * 24 * 10) });
  members.push({ groupId: 2, userId: "u_you", role: "MEMBER", joinedAt: ago(60 * 24 * 5) });
  members.push({ groupId: 1, userId: "u_priya", role: "MEMBER", joinedAt: ago(60 * 24 * 20) });
  members.push({ groupId: 3, userId: "u_you", role: "MEMBER", joinedAt: ago(60 * 24 * 2) });
  members.push({ groupId: 2, userId: "u_elena", role: "MEMBER", joinedAt: ago(60 * 24 * 8) });
  members.push({ groupId: 4, userId: "u_priya", role: "MEMBER", joinedAt: ago(60 * 24 * 1) });
  saveGroupMembers(members);

  const posts: LocalPost[] = [
    {
      id: nextId(),
      authorId: "u_maya",
      title: "Small win today",
      subject: "Small win today",
      content:
        "Managed to leave the apartment and get groceries without a panic attack. Sounds tiny but it's the first time in two weeks. Celebrating the small stuff today.",
      images: [],
      tags: ["anxiety", "small-wins"],
      isAnonymous: false,
      createdAt: ago(40),
      groupId: 1,
      status: "published",
      likedBy: ["u_you", "u_priya", "u_elena"],
    },
    {
      id: nextId(),
      authorId: "u_sam",
      title: "Can't sleep, brain won't stop",
      subject: "Can't sleep, brain won't stop",
      content:
        "It's 1:47am and I'm replaying a conversation from three years ago for no reason. Anyone else's brain do this? Genuinely just need to know I'm not the only one.",
      images: [],
      tags: ["insomnia", "venting"],
      isAnonymous: true,
      createdAt: ago(120),
      groupId: 2,
      status: "published",
      likedBy: ["u_you"],
    },
    {
      id: nextId(),
      authorId: "u_elena",
      title: "10 minute walks actually work",
      subject: "10 minute walks actually work",
      content:
        "I used to think I needed a full workout to feel better. Turns out even a 10 minute walk around the block resets my mood more than I expected. Lowering the bar has helped a lot.",
      images: [
        "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=900&q=60",
      ],
      tags: ["exercise", "habits"],
      isAnonymous: false,
      createdAt: ago(240),
      groupId: 3,
      status: "published",
      likedBy: ["u_you", "u_maya", "u_sam", "u_priya"],
    },
    {
      id: nextId(),
      authorId: "u_theo",
      title: "First post, be gentle",
      subject: "First post, be gentle",
      content:
        "Hi all. Started therapy last week and my therapist suggested finding a community like this. Not really sure what to say except thanks for having this space.",
      images: [],
      tags: ["introductions"],
      isAnonymous: false,
      createdAt: ago(360),
      groupId: 4,
      status: "published",
      likedBy: ["u_priya"],
    },
    {
      id: nextId(),
      authorId: "u_priya",
      title: null as unknown as string,
      subject: "",
      content:
        "Reminder to whoever needs it: you don't have to be productive to be worthy of rest. That's it, that's the post.",
      images: [],
      tags: ["reminders"],
      isAnonymous: false,
      createdAt: ago(600),
      groupId: null,
      status: "published",
      likedBy: ["u_you", "u_sam", "u_elena", "u_maya", "u_theo"],
    },
    {
      id: nextId(),
      authorId: "u_you",
      title: "Trying this app out",
      subject: "Trying this app out",
      content:
        "New to CommonGround — looking forward to seeing what everyone's up to and finding a few groups that feel like home.",
      images: [],
      tags: ["introductions"],
      isAnonymous: false,
      createdAt: ago(900),
      groupId: null,
      status: "published",
      likedBy: ["u_maya"],
    },
  ];
  saveposts(posts);

  const comments: LocalComment[] = [
    {
      id: nextId(),
      postId: posts[0].id,
      commenterId: "u_you",
      content: "This is genuinely awesome, proud of you 🌟",
      createdAt: ago(30),
      parentId: null,
      likedBy: ["u_maya"],
    },
    {
      id: nextId(),
      postId: posts[0].id,
      commenterId: "u_priya",
      content: "Small wins are still wins. Great job today.",
      createdAt: ago(20),
      parentId: null,
      likedBy: [],
    },
    {
      id: nextId(),
      postId: posts[1].id,
      commenterId: "u_you",
      content: "Every single night lol, you're not alone",
      createdAt: ago(100),
      parentId: null,
      likedBy: ["u_sam"],
    },
    {
      id: nextId(),
      postId: posts[2].id,
      commenterId: "u_you",
      content: "Needed to hear this, thank you",
      createdAt: ago(200),
      parentId: null,
      likedBy: [],
    },
  ];
  saveComments(comments);

  const friends: LocalFriendRecord[] = [
    { id: nextId(), senderId: "u_maya", receiverId: "u_you", status: "ACCEPTED", createdAt: ago(60 * 24 * 15) },
    { id: nextId(), senderId: "u_you", receiverId: "u_priya", status: "ACCEPTED", createdAt: ago(60 * 24 * 9) },
    { id: nextId(), senderId: "u_elena", receiverId: "u_you", status: "PENDING", createdAt: ago(60 * 3) },
    { id: nextId(), senderId: "u_you", receiverId: "u_sam", status: "PENDING", createdAt: ago(60 * 6) },
  ];
  saveFriends(friends);

  const conv1: LocalConversation = {
    id: nextId(),
    isGroup: false,
    participantIds: ["u_you", "u_maya"],
    createdAt: ago(60 * 24 * 3),
  };
  const conv2: LocalConversation = {
    id: nextId(),
    isGroup: false,
    participantIds: ["u_you", "u_priya"],
    createdAt: ago(60 * 24 * 1),
  };
  saveConversations([conv1, conv2]);

  const messages: LocalMessage[] = [
    { id: nextId(), conversationId: conv1.id, senderId: "u_maya", content: "hey! saw your post, glad you're doing okay today", createdAt: ago(35) },
    { id: nextId(), conversationId: conv1.id, senderId: "u_you", content: "thank you, means a lot 🩵", createdAt: ago(33) },
    { id: nextId(), conversationId: conv2.id, senderId: "u_priya", content: "wanna do a check-in call later this week?", createdAt: ago(400) },
    { id: nextId(), conversationId: conv2.id, senderId: "u_you", content: "yes please, thursday work?", createdAt: ago(380) },
    { id: nextId(), conversationId: conv2.id, senderId: "u_priya", content: "perfect, i'll call you around 7", createdAt: ago(370) },
  ];
  saveMessages(messages);

  write("seeded", true);
  write("nextId", nextIdCounter ?? 1000);
  try {
    localStorage.setItem(CURRENT_USER_KEY, "u_you");
  } catch {}
}

// ── Public helpers used by localAuth.tsx ────────────────────────────────

function getUsersRaw(): LocalUser[] {
  return read<LocalUser[]>("users", []);
}
function getUserById(id: string): LocalUser | null {
  return getUsersRaw().find((u) => u.id === id) ?? null;
}
function createUser(input: { userName: string; fName: string; lName: string; email: string; profileImg?: string }): LocalUser {
  const users = getUsersRaw();
  const user: LocalUser = {
    id: `u_local_${nextId()}`,
    email: input.email,
    userName: input.userName,
    profileImg: input.profileImg || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(input.userName)}`,
    banner: "https://images.unsplash.com/photo-1497294815431-9365093b7331?w=1200&q=60",
    fName: input.fName,
    lName: input.lName,
    bio: "",
  };
  users.push(user);
  saveUsers(users);
  return user;
}
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

export const db = {
  seedIfNeeded,
  getUsers: getUsersRaw,
  getUserById,
  createUser,
  getCurrentUserId,
  loadStore,
  saveUsers,
  saveposts,
  saveComments,
  saveFriends,
  saveGroups,
  saveGroupMembers,
  saveConversations,
  saveMessages,
  nextId,
};
