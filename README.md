# Forge

A project under the [Daedalus-AI-Forge](https://github.com/Daedalus-AI-Forge) org.

Forge is a Claude Code plugin that lets you discover previous sessions, fork them into named background workers, and merge their results back into your current session.

## Install

This repository doubles as a Claude Code plugin marketplace. From inside Claude Code:

```
/plugin marketplace add https://github.com/Daedalus-AI-Forge/Forge
/plugin install forge@forge
```

You can also pass a local clone path to `/plugin marketplace add` instead of the URL.

## Quickstart

The plugin ships three skills that form a discover → fork → merge flow: find an earlier session, fork its context into a background worker, then pull the worker's results back into your current session.

```
/forge:discover   # find the previous session you mean ("the session where we…")
/forge:fork       # fork that session's context into a named background worker
/forge:merge      # merge finished workers' results back into this session
```

A typical loop: use `/forge:discover` to pin down the session ID, `/forge:fork` to spin up a worker that continues that work in the background, and `/forge:merge` once it finishes to fold its summary and artifacts into what you're doing now.

## Layout

- `core/` — main implementation
- `plugin/` — plugin code
