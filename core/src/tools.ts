import { listSessions, searchSessions, inspectSession, type Scope } from './session-reader.js'
import { spawnWorker, type SpawnDeps, type SpawnRequest } from './spawner.js'
import {
  listWorkerIds, readSpec, readStatus, readResult, markMerged, pendingResults, isStale,
  reapStaleWorkers,
} from './store.js'

export function listSessionsTool(args: { scope?: Scope; cwd?: string; limit?: number }) {
  const cwd = args.cwd ?? process.cwd()
  return { sessions: listSessions(args.scope ?? 'project', cwd).slice(0, args.limit ?? 20) }
}

export function searchSessionsTool(args: { query: string; scope?: Scope; cwd?: string }) {
  const cwd = args.cwd ?? process.cwd()
  return { hits: searchSessions(args.query, args.scope ?? 'project', cwd) }
}

export function inspectSessionTool(args: { sessionId: string; scope?: Scope; cwd?: string }) {
  const cwd = args.cwd ?? process.cwd()
  const view = inspectSession(args.sessionId, args.scope ?? 'all', cwd)
  return view ? { found: true as const, ...view } : { found: false as const }
}

export function spawnWorkerTool(
  args: Omit<SpawnRequest, 'cwd'> & { cwd?: string }, deps: SpawnDeps,
) {
  const cwd = args.cwd ?? process.cwd()
  const source = inspectSession(args.sourceSessionId, 'all', cwd)
  if (!source) {
    return { ok: false as const, error: `source session not found: ${args.sourceSessionId}` }
  }
  const { workerId, workerName } = spawnWorker({ ...args, cwd }, deps)
  return { ok: true as const, workerId, workerName,
    note: 'Worker runs detached; check forge_worker_status, results arrive via forge_get_results.' }
}

export function workerStatusTool(args: { workerId?: string }) {
  const ids = args.workerId ? [args.workerId] : listWorkerIds()
  const workers = ids.flatMap(id => {
    const spec = readSpec(id); const status = readStatus(id)
    if (!spec || !status) return []
    return [{ workerId: id, name: spec.workerName, task: spec.taskPrompt,
      state: status.state, turns: status.turns, heartbeatAt: status.heartbeatAt,
      forkedSessionId: status.forkedSessionId, stale: isStale(status) }]
  })
  return { workers }
}

export function getResultsTool(args: { workerId?: string; cwd?: string; consumerId?: string }) {
  reapStaleWorkers()   // covers SessionStart hook + pending pulls
  const consumerId = args.consumerId ?? `live:${args.cwd ?? process.cwd()}`
  if (args.workerId && args.workerId !== 'pending') {
    const result = readResult(args.workerId)
    if (!result) return { results: [] }
    markMerged(args.workerId, consumerId)
    return { results: [result] }
  }
  const cwd = args.cwd ?? process.cwd()
  const pending = pendingResults(cwd, consumerId)
  for (const p of pending) markMerged(p.spec.workerId, consumerId)
  return { results: pending.map(p => p.result) }
}
