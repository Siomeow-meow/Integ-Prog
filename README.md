# CommonGround — Frontend-only build

This is a **frontend-only** version of CommonGround: no backend, no API server,
no Supabase, no Clerk, no websocket server. Everything (users, posts,
comments, friends, groups, messages, mood check-ins) is stored in your
browser's `localStorage` and seeded with sample demo data the first time you
load the app.

## What changed from the original

- **Auth** — Clerk was replaced with a local mock (`app/lib/localAuth.tsx`,
  aliased in `tsconfig.json` in place of `@clerk/nextjs`). "Signing in" just
  means picking one of the seeded demo profiles or creating a new local one.
- **Data** — All the `app/lib/*.ts` files (`post.ts`, `comment.ts`,
  `friend.ts`, `group.ts`, `user.ts`, `conversation.ts`) now read/write a
  local "database" (`app/lib/db.ts`) backed by `localStorage`, instead of
  calling a remote API through `/api/proxy`.
- **Real-time messaging** — the websocket connection (`app/util/websocket.ts`)
  was replaced with an in-memory pub/sub that simulates message delivery
  instantly within your browser tab.
- **Image uploads** — Supabase Storage was replaced with a simple
  File → base64 data URL conversion (`app/util/storage.ts`,
  `app/lib/uploadImage.ts`), so uploaded images stay entirely in the browser.
- **Removed**: `app/api/*` routes (proxy + mood AI analysis), Supabase
  client, Clerk server helpers, Prisma dependency, and the onboarding
  server-action page.

## Running it

```bash
npm install
npm run dev
```

(`dev`/`build`/`start` all invoke Next.js via `node node_modules/next/dist/bin/next ...`
rather than relying on the `next` binary being directly executable.)

Then open http://localhost:3000. Use "Sign in" to pick a demo profile
(6 seeded users) or create your own local account.

## Notes / limitations

- Data lives only in your browser. Clearing site data / localStorage resets
  everything back to the seed data.
- "Real-time" messaging only works within the same browser tab/session —
  there's no server to push messages across devices or tabs.
