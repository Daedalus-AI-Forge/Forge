import { describe, it, expect } from 'vitest'
import { buildDigest } from '../src/digest.js'
import type { PendingItem } from '../src/store.js'

const item = (id: string, outcome: 'completed' | 'failed'): PendingItem => ({
  spec: {
    workerId: id, workerName: `forge-worker: ${id}`, sourceSessionId: 'src-1',
    taskPrompt: 'implement login page', cwd: '/tmp/p', maxTurns: 50,
    permissionMode: 'acceptEdits', createdAt: '2026-06-12T00:00:00Z',
  },
  status: { workerId: id, state: outcome === 'failed' ? 'failed' : 'done',
    heartbeatAt: '2026-06-12T01:00:00Z', turns: 8 },
  result: {
    worker: `forge-worker: ${id}`, sourceSession: 'src-1', task: 'implement login page',
    outcome, summary: 'Implemented the login page with OAuth.',
    decisions: ['used cookie sessions'], artifacts: ['src/login.tsx'], followups: ['add tests'],
  },
})

describe('buildDigest', () => {
  it('renders one block per finished worker with summary and artifacts', () => {
    const text = buildDigest([item('w1', 'completed'), item('w2', 'failed')])
    expect(text).toContain('forge-worker: w1')
    expect(text).toContain('Implemented the login page with OAuth.')
    expect(text).toContain('src/login.tsx')
    expect(text).toContain('FAILED')
    expect(text).toContain('forge_get_results')   // tells the agent how to pull the full contract
  })

  it('returns empty string for no items', () => {
    expect(buildDigest([])).toBe('')
  })
})
