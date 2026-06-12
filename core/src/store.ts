import fs from 'node:fs'
import path from 'node:path'
import { WorkerSpec, WorkerStatus, ResultContract } from './contracts.js'
import { workerDir, workersDir } from './paths.js'

const STALE_MS = 120_000

export function atomicWriteJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2))
  fs.renameSync(tmp, file)
}

function readJson<T>(schema: { parse(v: unknown): T }, file: string): T | null {
  try {
    return schema.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
  } catch {
    return null
  }
}

export function writeSpec(spec: WorkerSpec): void {
  atomicWriteJson(path.join(workerDir(spec.workerId), 'spec.json'), spec)
}
export function readSpec(workerId: string): WorkerSpec | null {
  return readJson(WorkerSpec, path.join(workerDir(workerId), 'spec.json'))
}

export function writeStatus(status: WorkerStatus): void {
  atomicWriteJson(path.join(workerDir(status.workerId), 'status.json'), status)
}
export function readStatus(workerId: string): WorkerStatus | null {
  return readJson(WorkerStatus, path.join(workerDir(workerId), 'status.json'))
}

export function writeResult(workerId: string, result: ResultContract): void {
  atomicWriteJson(path.join(workerDir(workerId), 'result.json'), result)
  const md = [
    `# ${result.worker}`,
    `- **Outcome:** ${result.outcome}`,
    `- **Source session:** ${result.sourceSession}`,
    `- **Task:** ${result.task}`,
    `\n## Summary\n\n${result.summary}`,
    result.decisions.length ? `\n## Decisions\n\n${result.decisions.map(d => `- ${d}`).join('\n')}` : '',
    result.artifacts.length ? `\n## Artifacts\n\n${result.artifacts.map(a => `- ${a}`).join('\n')}` : '',
    result.diffs ? `\n## Diffs\n\n\`\`\`\n${result.diffs}\n\`\`\`` : '',
    result.followups.length ? `\n## Follow-ups\n\n${result.followups.map(f => `- ${f}`).join('\n')}` : '',
  ].filter(Boolean).join('\n')
  fs.writeFileSync(path.join(workerDir(workerId), 'result.md'), md)
}
export function readResult(workerId: string): ResultContract | null {
  return readJson(ResultContract, path.join(workerDir(workerId), 'result.json'))
}

export function listWorkerIds(): string[] {
  try {
    return fs.readdirSync(workersDir()).filter(d =>
      fs.existsSync(path.join(workerDir(d), 'spec.json'))).sort()
  } catch {
    return []
  }
}

export function readMerged(workerId: string): string[] {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(workerDir(workerId), 'merged.json'), 'utf8'))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
export function markMerged(workerId: string, consumerSessionId: string): void {
  const seen = readMerged(workerId)
  if (!seen.includes(consumerSessionId)) {
    atomicWriteJson(path.join(workerDir(workerId), 'merged.json'), [...seen, consumerSessionId])
  }
}

export function isStale(status: WorkerStatus, now = new Date()): boolean {
  return status.state === 'running' &&
    now.getTime() - new Date(status.heartbeatAt).getTime() > STALE_MS
}

/** Stale running worker whose pid is dead (or unknown): synthesize a failure contract
 *  so it re-enters the merge pipeline. PID liveness matters: a worker inside a long
 *  tool call legitimately stops heartbeating, so a live pid is never reaped. */
export function reapStaleWorkers(now = new Date()): string[] {
  const reaped: string[] = []
  for (const id of listWorkerIds()) {
    const spec = readSpec(id); const status = readStatus(id)
    if (!spec || !status || !isStale(status, now) || readResult(id)) continue
    if (status.pid !== undefined && pidAlive(status.pid)) continue
    writeResult(id, ResultContract.parse({
      worker: spec.workerName, sourceSession: spec.sourceSessionId, task: spec.taskPrompt,
      outcome: 'failed',
      summary: `Worker went stale: no heartbeat since ${status.heartbeatAt} and its process is gone. It may have been killed (OOM, reboot, manual kill). Check artifacts on disk; the task may be partially done.`,
    }))
    writeStatus({ ...status, state: 'failed', heartbeatAt: now.toISOString() })
    reaped.push(id)
  }
  return reaped
}

function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true } catch { return false }
}

export interface PendingItem { spec: WorkerSpec; result: ResultContract; status: WorkerStatus }

/** Finished results for this cwd not yet seen by this consumer session. */
export function pendingResults(cwd: string, consumerSessionId: string): PendingItem[] {
  reapStaleWorkers()   // covers SessionStart hook + pending pulls
  const out: PendingItem[] = []
  for (const id of listWorkerIds()) {
    const spec = readSpec(id); const status = readStatus(id); const result = readResult(id)
    if (!spec || !status || !result) continue
    if (status.state !== 'done' && status.state !== 'failed') continue
    if (spec.cwd !== cwd) continue
    if (readMerged(id).includes(consumerSessionId)) continue
    out.push({ spec, result, status })
  }
  return out
}
