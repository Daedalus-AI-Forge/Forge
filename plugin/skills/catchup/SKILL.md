---
name: catchup
description: Use when catching up on background worker results — "what did the worker find", "catch me up on the worker", "pull the worker's results in", before final summaries, or after a SessionStart digest mentions finished workers.
---

# Catch up on worker results

1. Call `forge_get_results` — with a `workerId` for one worker, or no argument for **all pending results in this project**. Pulled results are marked merged (you won't see duplicates).
2. Treat the contract as a colleague's handoff back to you:
   - `summary` — fold the relevant facts into your current work.
   - `decisions` — respect them or flag conflicts to the user explicitly.
   - `artifacts` — read changed files before building on them.
   - `outcome: failed/blocked/partial` — tell the user plainly; check `followups` for what remains.
3. Good habit: call `forge_get_results` before composing any final summary of multi-worker tasks, and `forge_worker_status` to mention still-running workers.

A SessionStart digest (injected automatically) is the compact form; `forge_get_results` returns the full contracts.
