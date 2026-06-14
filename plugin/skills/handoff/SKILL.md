---
name: handoff
description: Use when the user wants to hand a previous session's context off to a background worker — "hand that session off to a worker", "fork that session and have it...", "continue that work in the background", "spawn a worker from...".
---

# Hand a session off to a background worker

1. Need a source session? Use `/forge:lookup` first to pin down the `sessionId`.
2. Call `forge_spawn_worker` with:
   - `sourceSessionId` — the session to hand off (its full context is copied; the original is untouched).
   - `taskPrompt` — a complete, self-contained task. The worker runs autonomously; nobody can answer its questions. Include acceptance criteria and any paths it needs.
   - `workerName` — short kebab-case name; it becomes `forge-worker: <name>` in session pickers.
3. Report the returned `workerId` to the user and **keep going with your own work** — the worker is detached.
4. Check progress with `forge_worker_status` when asked or before wrapping up. A `stale: true` running worker has likely crashed; its failure contract will appear in results.
5. Get the worker's results back via `/forge:catchup` (live pull) or have them auto-injected into the next session start in this project.
