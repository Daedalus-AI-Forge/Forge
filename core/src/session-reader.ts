import fs from 'node:fs'
import path from 'node:path'
import { SessionMeta } from './contracts.js'
import { claudeProjectsRoot, encodeProjectDir } from './paths.js'

export type Scope = 'project' | 'all'

interface Record_ {
  type?: string
  isSidechain?: boolean
  isCompactSummary?: boolean
  cwd?: string
  timestamp?: string
  message?: { role?: string; content?: unknown }
}

/** Extract plain text from a message content value (string or content-block array). */
export function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text: string } =>
        !!b && typeof b === 'object' && (b as any).type === 'text' && typeof (b as any).text === 'string')
      .map(b => b.text)
      .join('\n')
  }
  return ''
}

function* records(filePath: string): Generator<Record_> {
  let raw: string
  try { raw = fs.readFileSync(filePath, 'utf8') } catch { return }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try { yield JSON.parse(line) as Record_ } catch { /* tolerate mid-write/garbage lines */ }
  }
}

/** A "main-line conversation message": user/assistant, not sidechain, not a compaction summary. */
function isMainMessage(r: Record_): boolean {
  return (r.type === 'user' || r.type === 'assistant') &&
    r.isSidechain !== true && r.isCompactSummary !== true && !!r.message
}

export function readSessionMeta(filePath: string, projectDir: string): SessionMeta | null {
  const sessionId = path.basename(filePath, '.jsonl')
  let cwd: string | undefined
  let firstUserText: string | undefined
  let lastAssistantText: string | undefined
  let messageCount = 0
  for (const r of records(filePath)) {
    if (!isMainMessage(r)) continue
    messageCount++
    cwd ??= r.cwd
    if (!firstUserText && r.type === 'user') {
      const t = extractText(r.message!.content)
      if (t) firstUserText = t.slice(0, 200)
    }
    if (r.type === 'assistant') {
      const t = extractText(r.message!.content)
      if (t) lastAssistantText = t.slice(0, 200)
    }
  }
  if (messageCount === 0) return null
  const stat = fs.statSync(filePath)
  return SessionMeta.parse({
    sessionId, projectDir, cwd, filePath,
    modifiedAt: stat.mtime.toISOString(),
    firstUserText, lastAssistantText, messageCount,
  })
}

function projectDirs(scope: Scope, cwd: string): string[] {
  const root = claudeProjectsRoot()
  if (scope === 'project') return [encodeProjectDir(cwd)]
  try { return fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()) }
  catch { return [] }
}

export function listSessions(scope: Scope, cwd: string): SessionMeta[] {
  const root = claudeProjectsRoot()
  const out: SessionMeta[] = []
  for (const dir of projectDirs(scope, cwd)) {
    const abs = path.join(root, dir)
    let files: string[] = []
    try { files = fs.readdirSync(abs).filter(f => f.endsWith('.jsonl')) } catch { continue }
    for (const f of files) {
      const meta = readSessionMeta(path.join(abs, f), dir)
      if (meta) out.push(meta)
    }
  }
  return out.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}
