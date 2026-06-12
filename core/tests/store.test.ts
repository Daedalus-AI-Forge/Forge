import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  writeSpec, readSpec, writeStatus, readStatus, writeResult, readResult,
  listWorkerIds, markMerged, readMerged, pendingResults, isStale,
} from '../src/store.js'
import type { WorkerSpec, WorkerStatus, ResultContract } from '../src/contracts.js'

const spec = (id: string, cwd = '/tmp/projA'): WorkerSpec => ({
  workerId: id, workerName: `forge-worker: ${id}`, sourceSessionId: 'src-1',
  taskPrompt: 'task', cwd, maxTurns: 50, permissionMode: 'acceptEdits',
  createdAt: '2026-06-12T00:00:00Z',
})
const status = (id: string, state: WorkerStatus['state']): WorkerStatus => ({
  workerId: id, state, heartbeatAt: new Date().toISOString(), turns: 1,
})
const result = (id: string): ResultContract => ({
  worker: `forge-worker: ${id}`, sourceSession: 'src-1', task: 'task',
  outcome: 'completed', summary: 'did the thing',
  decisions: [], artifacts: ['a.ts'], followups: [],
})

describe('store', () => {
  beforeEach(() => {
    process.env.FORGE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'))
  })

  it('round-trips spec, status, result', () => {
    writeSpec(spec('w1'))
    writeStatus(status('w1', 'running'))
    writeResult('w1', result('w1'))
    expect(readSpec('w1')?.taskPrompt).toBe('task')
    expect(readStatus('w1')?.state).toBe('running')
    expect(readResult('w1')?.summary).toBe('did the thing')
    expect(listWorkerIds()).toEqual(['w1'])
  })

  it('writes a readable result.md mirror', () => {
    writeSpec(spec('w1'))
    writeResult('w1', result('w1'))
    const md = fs.readFileSync(
      path.join(process.env.FORGE_HOME!, 'workers', 'w1', 'result.md'), 'utf8')
    expect(md).toContain('did the thing')
    expect(md).toContain('a.ts')
  })

  it('pendingResults: done, cwd-matched, unseen by this consumer', () => {
    writeSpec(spec('w1')); writeStatus(status('w1', 'done')); writeResult('w1', result('w1'))
    writeSpec(spec('w2')); writeStatus(status('w2', 'running'))           // not finished
    writeSpec(spec('w3', '/tmp/other')); writeStatus(status('w3', 'done')); writeResult('w3', result('w3')) // other cwd

    const pending = pendingResults('/tmp/projA', 'sess-X')
    expect(pending.map(p => p.spec.workerId)).toEqual(['w1'])

    markMerged('w1', 'sess-X')
    expect(readMerged('w1')).toEqual(['sess-X'])
    expect(pendingResults('/tmp/projA', 'sess-X')).toEqual([])
    // a different consumer session still sees it
    expect(pendingResults('/tmp/projA', 'sess-Y').length).toBe(1)
  })

  it('isStale detects dead heartbeats', () => {
    const old: WorkerStatus = { ...status('w1', 'running'), heartbeatAt: '2026-06-12T00:00:00Z' }
    expect(isStale(old, new Date('2026-06-12T00:05:00Z'))).toBe(true)
    expect(isStale(status('w1', 'running'), new Date())).toBe(false)
  })

  it('readers return null on missing/corrupt files', () => {
    expect(readSpec('nope')).toBeNull()
    writeSpec(spec('w1'))
    fs.writeFileSync(path.join(process.env.FORGE_HOME!, 'workers', 'w1', 'status.json'), '{half')
    expect(readStatus('w1')).toBeNull()
  })
})
