import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach } from 'vitest'
import { wrapTaskPrompt, extractContract, runWorker, type RunnerDeps } from '../src/runner.js'
import type { WorkerSpec } from '../src/contracts.js'
import { readStatus, readResult, writeSpec } from '../src/store.js'

const spec: WorkerSpec = {
  workerId: 'w1', workerName: 'forge-worker: login-page', sourceSessionId: 'src-1',
  taskPrompt: 'Implement the login page', cwd: '/tmp/p', maxTurns: 50,
  permissionMode: 'acceptEdits', createdAt: '2026-06-12T00:00:00Z',
}

describe('wrapTaskPrompt', () => {
  it('includes worker name, task, and the JSON contract instruction', () => {
    const p = wrapTaskPrompt(spec)
    expect(p).toContain('forge-worker: login-page')
    expect(p).toContain('Implement the login page')
    expect(p).toContain('"outcome"')
    expect(p).toContain('FINAL message must be ONLY a JSON object')
  })
})

describe('extractContract', () => {
  it('parses a clean JSON final message', () => {
    const r = extractContract(spec, JSON.stringify({
      outcome: 'completed', summary: 'done it', decisions: [], artifacts: ['x.ts'], followups: [],
    }))
    expect(r.outcome).toBe('completed')
    expect(r.worker).toBe('forge-worker: login-page')   // identity fields filled from spec
    expect(r.sourceSession).toBe('src-1')
    expect(r.task).toBe('Implement the login page')
  })

  it('parses JSON embedded in prose/fences', () => {
    const r = extractContract(spec,
      'Here you go:\n```json\n{"outcome":"blocked","summary":"need API key"}\n```')
    expect(r.outcome).toBe('blocked')
    expect(r.summary).toBe('need API key')
  })

  it('falls back to partial with raw text when JSON is missing/invalid', () => {
    const r = extractContract(spec, 'I finished but forgot the format, sorry.')
    expect(r.outcome).toBe('partial')
    expect(r.summary).toContain('forgot the format')
  })
})

function deps(messages: any[], overrides: Partial<RunnerDeps> = {}): RunnerDeps {
  return {
    queryFn: async function* () { for (const m of messages) yield m },
    renameFn: async () => {},
    gitDiffStat: () => undefined,
    now: () => new Date().toISOString(),
    ...overrides,
  }
}

const sdkRun = [
  { type: 'system', subtype: 'init', session_id: 'forked-123' },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'working...' }] } },
  { type: 'assistant', message: { content: [{ type: 'text',
      text: '{"outcome":"completed","summary":"login page done","artifacts":["src/login.tsx"]}' }] } },
  { type: 'result', result: '{"outcome":"completed","summary":"login page done","artifacts":["src/login.tsx"]}' },
]

describe('runWorker', () => {
  beforeEach(() => {
    process.env.FORGE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-run-'))
    writeSpec(spec)
  })

  it('happy path: records forked id, renames, writes done status + contract', async () => {
    const renamed: string[] = []
    await runWorker(spec, deps(sdkRun, {
      renameFn: async (id, name) => { renamed.push(`${id}=${name}`) },
    }))
    expect(renamed).toEqual(['forked-123=forge-worker: login-page'])
    const status = readStatus('w1')!
    expect(status.state).toBe('done')
    expect(status.forkedSessionId).toBe('forked-123')
    expect(readResult('w1')!.summary).toBe('login page done')
  })

  it('includes git diff stat when available', async () => {
    await runWorker(spec, deps(sdkRun, { gitDiffStat: () => ' 1 file changed' }))
    expect(readResult('w1')!.diffs).toBe(' 1 file changed')
  })

  it('query throwing → failed status with failure contract', async () => {
    await runWorker(spec, deps([], {
      queryFn: async function* () { throw new Error('SDK exploded') },
    }))
    expect(readStatus('w1')!.state).toBe('failed')
    const r = readResult('w1')!
    expect(r.outcome).toBe('failed')
    expect(r.summary).toContain('SDK exploded')
  })

  it('rename failure does not fail the run', async () => {
    await runWorker(spec, deps(sdkRun, {
      renameFn: async () => { throw new Error('no rename API') },
    }))
    expect(readStatus('w1')!.state).toBe('done')
  })
})
