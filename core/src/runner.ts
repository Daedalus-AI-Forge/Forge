import { ResultContract, WorkerSpec } from './contracts.js'

export function wrapTaskPrompt(spec: WorkerSpec): string {
  return [
    `You are "${spec.workerName}", a background worker forked from a previous session's context. Complete the task below using that context. Work autonomously; nobody can answer questions.`,
    `TASK:\n${spec.taskPrompt}`,
    `When the task is complete (or you are blocked/out of budget), your FINAL message must be ONLY a JSON object — no prose around it — with exactly these keys:`,
    `{"outcome": "completed" | "partial" | "blocked", "summary": "<5-15 lines: what you did and what the parent session must know>", "decisions": ["<choice + why>"], "artifacts": ["<file paths created/modified>"], "followups": ["<what remains>"]}`,
  ].join('\n\n')
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
