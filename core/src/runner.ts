import { ResultContract, WorkerSpec } from './contracts.js'
import { writeResult, writeStatus } from './store.js'
import { extractText } from './session-reader.js'

export function wrapTaskPrompt(spec: WorkerSpec): string {
  return [
    `You are "${spec.workerName}", a background worker forked from a previous session's context. Complete the task below using that context. Work autonomously; nobody can answer questions.`,
    `TASK:\n${spec.taskPrompt}`,
    `When the task is complete (or you are blocked/out of budget), your FINAL message must be ONLY a JSON object — no prose around it — with exactly these keys:`,
    `{"outcome": "completed" | "partial" | "blocked", "summary": "<5-15 lines: what you did and what the parent session must know>", "decisions": ["<choice + why>"], "artifacts": ["<file paths created/modified>"], "followups": ["<what remains>"]}`,
  ].join('\n\n')
}

export interface RunnerDeps {
  /** Yields Agent SDK messages for a forked run of spec. */
  queryFn: (spec: WorkerSpec, prompt: string) => AsyncIterable<any>
  renameFn: (sessionId: string, name: string) => Promise<void>
  gitDiffStat: (cwd: string) => string | undefined
  now: () => string
}

export async function runWorker(spec: WorkerSpec, deps: RunnerDeps): Promise<void> {
  let forkedSessionId: string | undefined
  let turns = 0
  let lastAssistantText = ''
  const heartbeat = (state: 'running' | 'done' | 'failed') => writeStatus({
    workerId: spec.workerId, state, pid: process.pid,
    heartbeatAt: deps.now(), turns, forkedSessionId,
  })
  heartbeat('running')
  try {
    for await (const msg of deps.queryFn(spec, wrapTaskPrompt(spec))) {
      if (msg?.type === 'system' && msg.subtype === 'init' && msg.session_id) {
        forkedSessionId = msg.session_id
        try { await deps.renameFn(forkedSessionId!, spec.workerName) } catch { /* cosmetic */ }
      }
      if (msg?.type === 'assistant') {
        turns++
        const t = extractText(msg.message?.content)
        if (t) lastAssistantText = t
      }
      if (msg?.type === 'result' && typeof msg.result === 'string' && msg.result) {
        lastAssistantText = msg.result
      }
      heartbeat('running')
    }
    const contract = extractContract(spec, lastAssistantText)
    contract.diffs = deps.gitDiffStat(spec.cwd)
    writeResult(spec.workerId, contract)
    heartbeat('done')
  } catch (err) {
    let diffs: string | undefined
    try { diffs = deps.gitDiffStat(spec.cwd) } catch { /* keep original failure */ }
    writeResult(spec.workerId, ResultContract.parse({
      worker: spec.workerName, sourceSession: spec.sourceSessionId, task: spec.taskPrompt,
      outcome: 'failed',
      summary: `Worker crashed: ${err instanceof Error ? err.message : String(err)}` +
        (lastAssistantText ? `\nLast activity:\n${lastAssistantText.slice(0, 1000)}` : ''),
      diffs,
    }))
    heartbeat('failed')
  }
}

/** Contents of ```json (or plain ```) fenced code blocks, in order of appearance. */
function fencedJsonBlocks(text: string): string[] {
  const blocks: string[] = []
  const re = /```(?:json)?\s*\n?([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) blocks.push(m[1].trim())
  return blocks
}

/** Every complete top-level {...} object in the text, in order of appearance.
 *  Tracks string literals so braces inside JSON values don't throw off the count. */
function balancedObjects(text: string): string[] {
  const objects: string[] = []
  let depth = 0, start = -1, inString = false, escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}' && depth > 0) {
      depth--
      if (depth === 0 && start >= 0) { objects.push(text.slice(start, i + 1)); start = -1 }
    }
  }
  return objects
}

/** Parse the worker's final message into a ResultContract; never throws. */
export function extractContract(spec: WorkerSpec, finalText: string): ResultContract {
  const identity = {
    worker: spec.workerName,
    sourceSession: spec.sourceSessionId,
    task: spec.taskPrompt,
  }
  // Try the most reliable shapes first: fenced JSON blocks, then the LAST
  // balanced-brace object (the real contract usually comes last), and finally
  // the original first-brace/last-brace slice as a last resort.
  const candidates: string[] = []
  for (const block of fencedJsonBlocks(finalText)) candidates.push(block, ...balancedObjects(block))
  candidates.push(...balancedObjects(finalText).reverse())
  const start = finalText.indexOf('{')
  const end = finalText.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(finalText.slice(start, end + 1))

  for (const candidate of candidates) {
    try {
      return ResultContract.parse({ ...identity, ...JSON.parse(candidate) })
    } catch { /* try the next candidate */ }
  }
  return ResultContract.parse({
    ...identity,
    outcome: 'partial',
    summary: `Worker did not return a valid result contract. Final message:\n${finalText.slice(0, 2000)}`,
  })
}
