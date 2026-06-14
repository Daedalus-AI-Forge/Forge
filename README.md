# Forge

A project under the [Daedalus-AI-Forge](https://github.com/Daedalus-AI-Forge) org.

Forge is a Claude Code plugin that lets you look up previous sessions, hand them off to named background workers, and catch up on their results in your current session.

## Install

This repository doubles as a Claude Code plugin marketplace. From inside Claude Code:

```
/plugin marketplace add https://github.com/Daedalus-AI-Forge/Forge
/plugin install forge@forge
```

You can also pass a local clone path to `/plugin marketplace add` instead of the URL.

## Quickstart

The plugin ships three skills that form a look-up → hand-off → catch-up flow: find an earlier session, hand its context off to a background worker, then catch up on the worker's results in your current session.

```
/forge:lookup    # look up the previous session you mean ("the one where we…")
/forge:handoff   # hand that session's context off to a named background worker
/forge:catchup   # catch up on finished workers' results in this session
```

A typical loop: use `/forge:lookup` to pin down the session ID, `/forge:handoff` to spin up a worker that continues that work in the background, and `/forge:catchup` once it finishes to fold its summary and artifacts into what you're doing now.

## Updating

When a new version is published, refresh the marketplace and update the plugin from inside Claude Code:

```
/plugin marketplace update forge
/plugin update forge@forge
```

Or open `/plugin`, switch to the **Installed** tab, select **forge**, and choose **Update**.

If an update doesn't appear, clear the cached marketplace and re-add it:

```
/plugin marketplace remove forge
/plugin marketplace add https://github.com/Daedalus-AI-Forge/Forge
```

## Layout

- `core/` — main implementation
- `plugin/` — plugin code
