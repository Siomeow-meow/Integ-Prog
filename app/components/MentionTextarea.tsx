"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/nextjs";
import Avatar from "./Avatar";
import {
  loadMentionDirectory,
  searchMentionUsers,
  MentionUser,
} from "@/app/lib/mentionDirectory";

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  style,
  multiline = true,
  maxLength,
  // When provided, mentions are limited to this list (e.g. a group's
  // members) instead of every user on the platform, and no directory
  // fetch happens at all.
  scopedUsers,
  onSubmitKey,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  maxLength?: number;
  scopedUsers?: MentionUser[];
  onSubmitKey?: () => void;
}) {
  const { getToken } = useAuth();
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [query, setQuery] = useState<string | null>(null); // null = dropdown closed
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (scopedUsers) {
      setUsers(scopedUsers);
      return;
    }
    (async () => {
      const token = await getToken().catch(() => null);
      const { users } = await loadMentionDirectory(token);
      setUsers(users);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedUsers]);

  // The dropdown renders through a portal (see below) so it always overlays
  // on top of the page instead of being clipped by a parent with
  // overflow-hidden (e.g. the post composer card). Position is recalculated
  // every time it opens, and tracked on scroll/resize while open so it stays
  // anchored to the field.
  useLayoutEffect(() => {
    if (query === null || !ref.current) return;
    function updateCoords() {
      const rect = ref.current!.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.left, width: rect.width });
    }
    updateCoords();
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [query]);

  const matches =
    query !== null ? searchMentionUsers(users, query) : ([] as MentionUser[]);

  function detectMention(newValue: string, caret: number) {
    const upToCaret = newValue.slice(0, caret);
    const match = /(?:^|\s)@([a-zA-Z0-9_]{0,30})$/.exec(upToCaret);
    if (match) {
      setQuery(match[1]);
      setMentionStart(caret - match[1].length - 1);
      setActiveIndex(0);
    } else {
      setQuery(null);
      setMentionStart(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const newValue = e.target.value;
    const caret = e.target.selectionStart ?? newValue.length;
    onChange(newValue);
    detectMention(newValue, caret);
  }

  function pickUser(u: MentionUser) {
    if (mentionStart == null || !ref.current) return;
    const caret = ref.current.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    const inserted = `@${u.userName} `;
    const newValue = `${before}${inserted}${after}`;
    onChange(newValue);
    setQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (query !== null && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % matches.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickUser(matches[activeIndex]);
        return;
      } else if (e.key === "Escape") {
        setQuery(null);
        setMentionStart(null);
        return;
      }
    }
    // Not multiline (e.g. a comment/reply box) and no dropdown open — Enter
    // should submit rather than insert a newline.
    if (!multiline && e.key === "Enter" && onSubmitKey) {
      e.preventDefault();
      onSubmitKey();
    }
  }

  const sharedProps = {
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    className,
    style,
    maxLength,
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          rows={rows}
          {...sharedProps}
        />
      ) : (
        <input ref={ref as React.RefObject<HTMLInputElement>} {...sharedProps} />
      )}
      {query !== null &&
        matches.length > 0 &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[200] rounded-xl shadow-lg overflow-hidden"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              left: Math.max(8, Math.min(coords.left, window.innerWidth - 264)),
              // Anchored to overlay *above* the field (bottom edge sits just
              // above it) instead of a dropdown that can get clipped by a
              // scroll/overflow container it's nested in.
              bottom: window.innerHeight - coords.top + 6,
              width: 256,
              maxHeight: 224,
              overflowY: "auto",
            }}
          >
            {matches.map((u, i) => (
              <button
                type="button"
                key={u.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickUser(u);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                style={{
                  background: i === activeIndex ? "var(--bg-subtle)" : "transparent",
                  color: "var(--fg)",
                }}
              >
                <Avatar userName={u.userName} profileImg={u.profileImg} size="sm" />
                <span className="font-medium truncate">@{u.userName}</span>
                {(u.fName || u.lName) && (
                  <span
                    className="text-xs truncate"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {`${u.fName ?? ""} ${u.lName ?? ""}`.trim()}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
