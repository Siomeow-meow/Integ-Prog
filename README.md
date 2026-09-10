# CommonGround — Frontend-only build

This is a **frontend-only** version of CommonGround. Everything (users, posts,
comments, friends, groups, messages, mood check-ins) is stored in your
browser's `localStorage` and seeded with sample demo data the first time you
load the app.

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
