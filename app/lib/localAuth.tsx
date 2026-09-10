"use client";
/**
 * Local, frontend-only stand-in for authentication.
 *
 * This app has no backend, so there is no real login. Instead, "signing in"
 * just means picking one of the seeded demo users (or creating a new local
 * one) and remembering that choice in localStorage. Every piece of code
 * that used to call Clerk's useAuth()/useUser() keeps working unchanged —
 * this module is aliased in tsconfig.json to stand in for "@clerk/nextjs".
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { db, type LocalUser } from "./db";

const CURRENT_USER_KEY = "cg:currentUserId";

export type MockUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: { emailAddress: string }[];
};

function toMockUser(u: LocalUser): MockUser {
  return {
    id: u.id,
    username: u.userName,
    firstName: u.fName,
    lastName: u.lName,
    imageUrl: u.profileImg,
    emailAddresses: [{ emailAddress: u.email }],
  };
}

type AuthCtx = {
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: MockUser | null;
  getToken: () => Promise<string>;
  signOut: () => Promise<void>;
  signIn: (userId: string) => void;
  createLocalUser: (input: { userName: string; fName: string; lName: string; email: string; profileImg?: string }) => string;
};

const Ctx = createContext<AuthCtx | null>(null);

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    db.seedIfNeeded();
    let id: string | null = null;
    try {
      id = localStorage.getItem(CURRENT_USER_KEY);
    } catch {}
    setUserId(id);
    setIsLoaded(true);
  }, []);

  const signIn = useCallback((id: string) => {
    try {
      localStorage.setItem(CURRENT_USER_KEY, id);
    } catch {}
    setUserId(id);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {}
    setUserId(null);
  }, []);

  const createLocalUser = useCallback(
    (input: { userName: string; fName: string; lName: string; email: string; profileImg?: string }) => {
      const newUser = db.createUser(input);
      signIn(newUser.id);
      return newUser.id;
    },
    [signIn],
  );

  const user = useMemo(() => {
    if (!userId) return null;
    const u = db.getUserById(userId);
    return u ? toMockUser(u) : null;
  }, [userId]);

  const getToken = useCallback(async () => "local-mock-token", []);

  const value: AuthCtx = {
    userId,
    isLoaded,
    isSignedIn: !!userId,
    user,
    getToken,
    signOut,
    signIn,
    createLocalUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useCtx(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuth/useUser must be used within <ClerkProvider>");
  }
  return ctx;
}

export function useAuth() {
  const { userId, isLoaded, isSignedIn, getToken, signOut } = useCtx();
  return { userId, isLoaded, isSignedIn, getToken, signOut };
}

export function useUser() {
  const { user, isLoaded, isSignedIn } = useCtx();
  return { user, isLoaded, isSignedIn };
}

export function useLocalAuthActions() {
  const { signIn, createLocalUser } = useCtx();
  return { signIn, createLocalUser };
}

/** Minimal stand-ins for the <SignIn/> and <SignUp/> Clerk components. */
export function SignIn(_props: { forceRedirectUrl?: string }) {
  return <LocalAuthScreen mode="sign-in" />;
}
export function SignUp(_props: { forceRedirectUrl?: string }) {
  return <LocalAuthScreen mode="sign-up" />;
}

function LocalAuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn, createLocalUser } = useLocalAuthActions();
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [tab, setTab] = useState<"existing" | "new">(mode === "sign-up" ? "new" : "existing");
  const [form, setForm] = useState({ userName: "", fName: "", lName: "", email: "" });

  useEffect(() => {
    db.seedIfNeeded();
    setUsers(db.getUsers());
  }, []);

  function goHome() {
    if (typeof window !== "undefined") window.location.href = "/";
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      <h1 className="text-lg font-semibold mb-1">
        {mode === "sign-in" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-xs mb-4" style={{ color: "var(--fg-muted)" }}>
        This is a frontend-only demo — no real accounts. Pick a demo profile
        or create a new local one; everything is saved in your browser.
      </p>

      <div className="flex gap-2 mb-4 text-xs">
        <button
          onClick={() => setTab("existing")}
          className={`px-3 py-1.5 rounded-full border ${tab === "existing" ? "font-semibold" : ""}`}
          style={{ borderColor: "var(--border)", background: tab === "existing" ? "var(--accent)" : "transparent", color: tab === "existing" ? "white" : "var(--fg)" }}
        >
          Use a demo profile
        </button>
        <button
          onClick={() => setTab("new")}
          className={`px-3 py-1.5 rounded-full border ${tab === "new" ? "font-semibold" : ""}`}
          style={{ borderColor: "var(--border)", background: tab === "new" ? "var(--accent)" : "transparent", color: tab === "new" ? "white" : "var(--fg)" }}
        >
          Create new
        </button>
      </div>

      {tab === "existing" ? (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                signIn(u.id);
                goHome();
              }}
              className="flex items-center gap-3 p-2 rounded-lg border text-left hover:opacity-80"
              style={{ borderColor: "var(--border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.profileImg} alt="" className="w-9 h-9 rounded-full object-cover" />
              <div>
                <div className="text-sm font-medium">{u.fName} {u.lName}</div>
                <div className="text-xs" style={{ color: "var(--fg-muted)" }}>@{u.userName}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.userName.trim()) return;
            createLocalUser({
              userName: form.userName.trim(),
              fName: form.fName.trim() || form.userName.trim(),
              lName: form.lName.trim(),
              email: form.email.trim() || `${form.userName.trim()}@example.com`,
            });
            goHome();
          }}
        >
          <input
            placeholder="Username"
            value={form.userName}
            onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
            className="px-3 py-2 rounded-lg border text-sm bg-transparent"
            style={{ borderColor: "var(--border)" }}
            required
          />
          <div className="flex gap-2">
            <input
              placeholder="First name"
              value={form.fName}
              onChange={(e) => setForm((f) => ({ ...f, fName: e.target.value }))}
              className="px-3 py-2 rounded-lg border text-sm bg-transparent flex-1"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              placeholder="Last name"
              value={form.lName}
              onChange={(e) => setForm((f) => ({ ...f, lName: e.target.value }))}
              className="px-3 py-2 rounded-lg border text-sm bg-transparent flex-1"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <input
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="px-3 py-2 rounded-lg border text-sm bg-transparent"
            style={{ borderColor: "var(--border)" }}
            type="email"
          />
          <button
            type="submit"
            className="mt-2 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Create account &amp; continue
          </button>
        </form>
      )}
    </div>
  );
}
