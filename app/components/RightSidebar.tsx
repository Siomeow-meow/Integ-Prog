"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { getGroups, getUserMemberships } from "@/app/lib/group";
import Group from "@/app/types/group";

export default function RightSidebar() {
  const { getToken, userId } = useAuth();
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const [all, joined] = await Promise.allSettled([
          getGroups(token),
          getUserMemberships(userId, token),
        ]);
        const allGroups: Group[] = all.status === "fulfilled" && Array.isArray(all.value) ? all.value : [];
        const joinedIds = new Set(
          (joined.status === "fulfilled" && Array.isArray(joined.value) ? joined.value : []).map((g: Group) => g.id)
        );
        // Show groups user hasn't joined yet
        setSuggestedGroups(allGroups.filter((g) => !joinedIds.has(g.id)).slice(0, 5));
      } catch (e) { console.error(e); }
    })();
  }, [userId]);

  return (
    <aside
      className="fixed right-0 top-0 h-full w-72 flex flex-col gap-5 px-4 py-5 overflow-y-auto z-20"
      style={{ background: "var(--bg)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Suggested groups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
            Suggested Groups
          </p>
          <Link href="/explore?tab=groups" className="text-xs" style={{ color: "var(--primary)" }}>
            See all
          </Link>
        </div>
        {suggestedGroups.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>No suggestions right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {suggestedGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                style={{ color: "inherit" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
                  style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}
                >
                  {group.groupImg
                    ? <img src={group.groupImg} alt={group.groupName} className="w-full h-full object-cover" />
                    : group.groupName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--fg)" }}>
                    {group.groupName}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                    {(group.populationCount ?? 0).toLocaleString()} members
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Quick links */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--fg-muted)" }}>
          Quick Links
        </p>
        <div className="flex flex-col gap-0.5">
          {[
            { href: "/messages", label: "Messages" },
            { href: "/saved", label: "Saved posts" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all"
              style={{ color: "var(--fg-muted)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
