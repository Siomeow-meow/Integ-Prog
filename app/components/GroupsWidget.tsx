"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Group from "@/app/types/group";
import { getUserMemberships } from "../lib/group";

function GroupAvatar({ group }: { group: Group }) {
  if (group.groupImg) {
    return (
      <img
        src={group.groupImg}
        alt={group.groupName}
        className="w-8 h-8 rounded-lg object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
      {group.groupName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function GroupsWidget() {
  const { getToken, userId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const data = await getUserMemberships(userId, token);
        setGroups(data);
        setStatus("done");
      } catch (e) {
        console.error("GroupsWidget fetch error:", e);
        setStatus("error");
      }
    })();
  }, [userId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted/10 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
        Your groups
      </h3>

      {status === "error" ? (
        <p className="text-xs text-muted py-2">Could not load groups.</p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-muted py-2">
          No groups yet.{" "}
          <Link href="/groups" className="text-primary hover:underline">
            Find one to join →
          </Link>
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-muted/10">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center gap-2.5 py-2.5 hover:opacity-80 transition-opacity"
            >
              <GroupAvatar group={group} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {group.groupName}
                </p>
                <p className="text-xs text-muted">
                  {(group.populationCount ?? 0).toLocaleString()} members
                </p>
              </div>
              {group.isAdmin && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex-shrink-0">
                  Admin
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/groups"
        className="mt-3 block text-xs text-primary hover:underline"
      >
        Explore all groups →
      </Link>
    </section>
  );
}
