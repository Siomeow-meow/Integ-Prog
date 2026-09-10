"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { NAV_LINKS, useThemeToggle, SunIcon, MoonIcon, LogoutIcon } from "./NavBar";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}
function SavedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}
// Not part of the shared desktop NAV_LINKS (RightSidebar handles these on
// desktop, but that sidebar is hidden below the lg breakpoint) — so mobile
// needs its own way in.
const QUICK_LINKS = [
  { href: "/messages", label: "Messages", icon: <MessagesIcon /> },
  { href: "/saved", label: "Saved posts", icon: <SavedIcon /> },
];

// Mobile navigation: instead of a fixed bottom tab bar, this is a slim top
// bar with a hamburger button that toggles the same sidebar content used on
// desktop (nav links, dark/light toggle, sign out) as an off-canvas drawer.
// That gives mobile the same feature set as the desktop sidebar — including
// dark/light mode and sign out, which the old bottom bar didn't have room
// for — without permanently eating screen space.
export default function MobileNav() {
  const pathname = usePathname();
  const { userId, signOut } = useAuth();
  const { isDark, toggle } = useThemeToggle();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!userId) return null;
  if (pathname?.startsWith("/messages")) return null;

  return (
    <>
      {/* Slim top bar — mobile only */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          height: 56,
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-1 -ml-1 rounded-lg"
          style={{ color: "var(--fg)" }}
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: "var(--primary)" }}
          >
            CG
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--fg)" }}>
            CommonGround
          </span>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Off-canvas drawer */}
      <aside
        className="md:hidden fixed top-0 left-0 h-full w-72 max-w-[80vw] z-50 flex flex-col transition-transform duration-200"
        style={{
          background: "var(--bg)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--primary)" }}
            >
              CG
            </div>
            <span className="font-semibold text-base tracking-tight" style={{ color: "var(--fg)" }}>
              CommonGround
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-1.5 rounded-lg"
            style={{ color: "var(--fg-muted)" }}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 flex-1 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? "var(--primary-subtle)" : "transparent",
                  color: active ? "var(--primary)" : "var(--fg-muted)",
                }}
              >
                <span className="w-5 h-5 flex-shrink-0">{icon(active)}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 mb-1">
          <div style={{ height: 1, background: "var(--border)" }} className="mb-2 mx-1" />
          <p
            className="text-[11px] font-semibold uppercase tracking-wider px-3 mb-1"
            style={{ color: "var(--fg-muted)" }}
          >
            Quick Links
          </p>
          {QUICK_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? "var(--primary-subtle)" : "transparent",
                  color: active ? "var(--primary)" : "var(--fg-muted)",
                }}
              >
                <span className="w-5 h-5 flex-shrink-0">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>

        <div className="px-3 pb-6 flex flex-col gap-0.5">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all"
            style={{ color: "var(--fg-muted)" }}
          >
            <span className="w-5 h-5">{isDark ? <SunIcon /> : <MoonIcon />}</span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all"
            style={{ color: "var(--fg-muted)" }}
          >
            <span className="w-5 h-5">
              <LogoutIcon />
            </span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
