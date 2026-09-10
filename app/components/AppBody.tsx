"use client";

import { usePathname } from "next/navigation";

// The mobile top bar (MobileNav) is fixed and 56px tall, so page content
// normally needs pt-14 to clear it — except on /messages, where MobileNav
// hides itself entirely and the messages UI wants the full viewport.
export default function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith("/messages");

  return (
    <body
      className={`min-h-full ${hideChrome ? "" : "pt-14 md:pt-0"}`}
      style={{ background: "var(--bg)", color: "var(--fg)" }}
      suppressHydrationWarning
    >
      {children}
    </body>
  );
}
