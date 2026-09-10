"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { loadMentionDirectory, MENTION_PATTERN } from "@/app/lib/mentionDirectory";

export default function MentionText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { getToken } = useAuth();
  const [userMap, setUserMap] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken().catch(() => null);
      const { map } = await loadMentionDirectory(token);
      if (!cancelled) setUserMap(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!text) return null;
  if (!text.includes("@")) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  const parts: React.ReactNode[] = [];
  const re = new RegExp(MENTION_PATTERN);
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const handle = match[1];
    const userId = userMap?.get(handle.toLowerCase());
    if (userId) {
      parts.push(
        <Link
          key={`mention-${key++}`}
          href={`/user/${userId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium hover:underline"
          style={{ color: "var(--primary)" }}
        >
          @{handle}
        </Link>,
      );
    } else {
      parts.push(
        <span key={`mention-${key++}`} style={{ color: "var(--primary)" }}>
          @{handle}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <span className={className} style={style}>
      {parts}
    </span>
  );
}
