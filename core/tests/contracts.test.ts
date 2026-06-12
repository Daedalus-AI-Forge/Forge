import { describe, it, expect } from 'vitest'
import { WorkerSpec, WorkerStatus, ResultContract, SessionMeta } from '../src/contracts.js'

describe('contracts', () => {
  it('applies WorkerSpec defaults', () => {
    const spec = WorkerSpec.parse({
      workerId: 'w1', workerName: 'forge-worker: test', sourceSessionId: 's1',
      taskPrompt: 'do it', cwd: '/tmp/p', createdAt: '2026-06-12T00:00:00Z',
    })
    expect(spec.maxTurns).toBe(50)
    expect(spec.permissionMode).toBe('acceptEdits')
  })

  it('rejects bad outcome in ResultContract', () => {
    expect(() => ResultContract.parse({
      worker: 'w', sourceSession: 's', task: 't', outcome: 'nope', summary: 'x',
    })).toThrow()
  })

  it('ResultContract defaults arrays', () => {
    const r = ResultContract.parse({
      worker: 'w', sourceSession: 's', task: 't', outcome: 'completed', summary: 'done',
    })
    expect(r.decisions).toEqual([])
    expect(r.artifacts).toEqual([])
    expect(r.followups).toEqual([])
  })

  it('parses WorkerStatus and SessionMeta', () => {
    expect(WorkerStatus.parse({
      workerId: 'w1', state: 'running', heartbeatAt: '2026-06-12T00:00:00Z',
    }).turns).toBe(0)
    expect(SessionMeta.parse({
      sessionId: 's1', projectDir: '-tmp-p', filePath: '/x/s1.jsonl',
      modifiedAt: '2026-06-12T00:00:00Z', messageCount: 2,
    }).sessionId).toBe('s1')
  })
})
