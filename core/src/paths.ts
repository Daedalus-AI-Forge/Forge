import os from 'node:os'
import path from 'node:path'

export function forgeHome(): string {
  return process.env.FORGE_HOME ?? path.join(os.homedir(), '.forge')
}

export function workersDir(): string {
  return path.join(forgeHome(), 'workers')
}

export function workerDir(workerId: string): string {
  return path.join(workersDir(), workerId)
}

export function settingsFile(): string {
  return path.join(forgeHome(), 'settings.json')
}

export function claudeProjectsRoot(): string {
  const cfg = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude')
  return path.join(cfg, 'projects')
}

/** Claude Code encodes a project cwd by replacing every non-alphanumeric char with '-'. */
export function encodeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-')
}
