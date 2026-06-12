import { pendingResults, markMerged } from '../store.js'
import { buildDigest } from '../digest.js'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const raw = await readStdin()
  let input: { session_id?: string; cwd?: string } = {}
  try { input = JSON.parse(raw) } catch { /* no input → exit silently */ }
  const cwd = input.cwd ?? process.cwd()
  const sessionId = input.session_id ?? 'unknown-session'

  const pending = pendingResults(cwd, sessionId)
  if (!pending.length) return
  const digest = buildDigest(pending)
  for (const p of pending) markMerged(p.spec.workerId, sessionId)
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: digest },
  }))
}
main().then(() => process.exit(0), () => process.exit(0))  // hooks must never block session start
