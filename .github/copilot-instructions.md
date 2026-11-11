# AlShamsawya Studio — Copilot Instructions

## Product and UI
- Build Arabic-first, RTL interfaces; provide English secondarily where the app already supports it.
- Never remove an existing feature, preset, or component unless the user explicitly asks. If something appears unused, list it and ask before removing it.
- Work mobile-first: support 320px without horizontal scrolling, keep touch targets at least 44px and text at least 13px, and keep important controls visible without scrolling past a large preview.

## Data and AI
- Never hardcode API keys. Keep keys in server-side environment variables and route provider calls through the server proxy in `server.ts`; never expose keys to the client.
- Store images in IndexedDB as `Blob` values, not base64 strings. Compress generated scenes as WebP at about 0.9 quality; keep final exports at full quality.
- Every new feature must include an empty state, loading state, Arabic error message, and persistence in the project database (Dexie).

## Commands and Verification
- Never run `npm run dev`, Vite, Playwright, or another long-running/watch command in the foreground. If a server is essential, start it in the background, apply a hard timeout of at most 120 seconds to checks, and stop the process you started before finishing.
- Do not start servers for tasks that can be verified with finite commands. Use `npm run lint`, `npm test`, and `npm run build` as applicable.
- Before finishing, run lint, tests, and build. Remove temporary ZIPs, smoke-test images, logs, and other temporary files created during the task.
- Report in fewer than 15 lines: changes, files touched, verification performed, and anything not verified.

## Git
- At the end of each task, run `git add -A` and commit with a short English message unless lint or build fails. Never push.
