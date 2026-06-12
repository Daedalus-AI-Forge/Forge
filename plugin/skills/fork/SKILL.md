---
name: fork
description: Use when the user wants to fork a previous session's context into a background worker — "fork that session and have it...", "continue that work in the background", "spawn a worker from...".
---

# Fork a session into a background worker

1. Need a source session? Use `/forge:discover` first to pin down the `sessionId`.
2. Call `forge_spawn_worker` with:
   - `sourceSessionId` — the session to fork (its full context is copied; the original is untouched).
   - `taskPrompt` — a complete, self-contained task. The worker runs autonomously; nobody can answer its questions. Include acceptance criteria and any paths it needs.
   - `workerName` — short kebab-case name; it becomes `forge-worker: <name>` in session pickers.
3. Report the returned `workerId` to the user and **keep going with your own work** — the worker is detached.
4. Check progress with `forge_worker_status` when asked or before wrapping up. A `stale: true` running worker has likely crashed; its failure contract will appear in results.
5. Results arrive via `/forge:merge` (live pull) or are auto-injected into the next session start in this project.
