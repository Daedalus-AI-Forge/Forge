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

/** Parse the worker's final message into a ResultContract; never throws. */
export function extractContract(spec: WorkerSpec, finalText: string): ResultContract {
  const identity = {
    worker: spec.workerName,
    sourceSession: spec.sourceSessionId,
    task: spec.taskPrompt,
  }
  const start = finalText.indexOf('{')
  const end = finalText.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(finalText.slice(start, end + 1))
      return ResultContract.parse({ ...identity, ...parsed })
    } catch { /* fall through */ }
  }
  return ResultContract.parse({
    ...identity,
    outcome: 'partial',
    summary: `Worker did not return a valid result contract. Final message:\n${finalText.slice(0, 2000)}`,
  })
}
