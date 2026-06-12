import { execFileSync } from 'node:child_process'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { readSpec } from '../store.js'
import { runWorker, type RunnerDeps } from '../runner.js'
import type { WorkerSpec } from '../contracts.js'

const workerId = process.argv[2]
if (!workerId) { console.error('usage: worker-run <workerId>'); process.exit(2) }
const spec = readSpec(workerId)
if (!spec) { console.error(`no spec for worker ${workerId}`); process.exit(2) }

const deps: RunnerDeps = {
  queryFn: (s: WorkerSpec, prompt: string) => query({
    prompt,
    options: {
      resume: s.sourceSessionId,
      forkSession: true,
      cwd: s.cwd,
      permissionMode: s.permissionMode,
      maxTurns: s.maxTurns,
      ...(s.model ? { model: s.model } : {}),
    },
  }) as AsyncIterable<any>,
  renameFn: async (sessionId, name) => {
    const sdk: any = await import('@anthropic-ai/claude-agent-sdk')
    if (typeof sdk.renameSession === 'function') await sdk.renameSession(sessionId, name)
  },
  gitDiffStat: (cwd) => {
    try { return execFileSync('git', ['diff', '--stat'], { cwd, encoding: 'utf8' }).trim() || undefined }
    catch { return undefined }
  },
  now: () => new Date().toISOString(),
}

runWorker(spec, deps).then(() => process.exit(0), () => process.exit(1))
