---
name: merge
description: Use when checking on or consuming background worker results — "what did the worker find", "merge the worker's results", before final summaries, or after a SessionStart digest mentions finished workers.
---

# Merge worker results into this session

1. Call `forge_get_results` — with a `workerId` for one worker, or no argument for **all pending results in this project**. Pulled results are marked merged (you won't see duplicates).
2. Treat the contract as a teammate's handoff:
   - `summary` — fold the relevant facts into your current work.
   - `decisions` — respect them or flag conflicts to the user explicitly.
   - `artifacts` — read changed files before building on them.
   - `outcome: failed/blocked/partial` — tell the user plainly; check `followups` for what remains.
3. Good habit: call `forge_get_results` before composing any final summary of multi-worker tasks, and `forge_worker_status` to mention still-running workers.

A SessionStart digest (injected automatically) is the compact form; `forge_get_results` returns the full contracts.
