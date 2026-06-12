import { describe, it, expect } from 'vitest'
import { wrapTaskPrompt, extractContract } from '../src/runner.js'
import type { WorkerSpec } from '../src/contracts.js'

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
