---
description: Start the Talmeeha dev server and confirm it's serving both modes.
allowed-tools: Bash, Read
---

Start the local development server for Talmeeha and verify it is healthy.

1. Detect the stage:
   - If `next.config.ts`/`next.config.js` exists → run `npm run dev` (custom Next server + Socket.io).
   - Otherwise (legacy) → run `npm start` (Express on :3000).
2. Run it in the background and wait for the listening log line.
3. Confirm the server responds on `http://localhost:3000` (and `/healthz` if present).
4. Report the URL and how to open it. Remind me that real-time/multiplayer flows are best
   verified by opening two browser tabs (online mode) or one tab (host mode).

Do not run a production build for this command. If the port is busy, surface the conflicting
process instead of killing it.
