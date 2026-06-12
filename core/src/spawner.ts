import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { WorkerSpec } from './contracts.js'
import { writeSpec } from './store.js'

export interface SpawnRequest {
  sourceSessionId: string
  taskPrompt: string
  cwd: string
  workerName?: string
  model?: string
  maxTurns?: number
  permissionMode?: WorkerSpec['permissionMode']
}

export interface SpawnDeps {
  /** Launch the detached runner for workerId; returns child pid. */
  launchDetached: (workerId: string) => number | undefined
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export function spawnWorker(req: SpawnRequest, deps: SpawnDeps): { workerId: string; workerName: string } {
  const slug = slugify(req.workerName ?? req.taskPrompt) || 'task'
  const workerId = `${slug}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
  const workerName = `forge-worker: ${slug}`
  writeSpec(WorkerSpec.parse({
    workerId, workerName,
    sourceSessionId: req.sourceSessionId,
    taskPrompt: req.taskPrompt,
    cwd: req.cwd,
    model: req.model,
    ...(req.maxTurns !== undefined ? { maxTurns: req.maxTurns } : {}),
    ...(req.permissionMode !== undefined ? { permissionMode: req.permissionMode } : {}),
    createdAt: new Date().toISOString(),
  }))
  deps.launchDetached(workerId)
  return { workerId, workerName }
}

/** Production launcher: detached `node dist/worker-run.cjs <workerId>`, fully disowned. */
export function realLaunchDetached(workerId: string): number | undefined {
  const runnerPath = path.join(__dirname, 'worker-run.cjs')   // sibling in plugin/dist after bundling
  const child = spawn(process.execPath, [runnerPath, workerId], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()
  return child.pid
}
