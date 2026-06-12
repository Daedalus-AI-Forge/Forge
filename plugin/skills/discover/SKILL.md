---
name: discover
description: Use when the user wants to find a previous Claude Code session — "find the session where...", "which session did we...", or before forking work that builds on earlier context.
---

# Discover previous sessions

Find the previous session the user is referring to, without polluting this context with transcript noise.

1. **Dispatch a finder subagent** (Task/Agent tool, or search inline only if the query is trivially specific). The finder:
   - Calls `forge_search_sessions` with the user's key phrases and `scope: "project"`.
   - If no good hits, escalates once to `scope: "all"`.
   - For promising candidates, calls `forge_inspect_session` to confirm relevance.
   - Returns the top 1–3 candidates: sessionId, age, first/last message snippets, why it matches.
2. **Confirm with the user** when more than one candidate is plausible. Show title-ish snippets, not raw IDs alone.
3. Hand the chosen `sessionId` to `/forge:fork` (or `forge_spawn_worker` directly) if the goal is to fork it.

Tip: `forge_list_sessions` (newest first) beats search when the user says "my last session".
