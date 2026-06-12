import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  listSessionsTool, searchSessionsTool, inspectSessionTool,
  spawnWorkerTool, workerStatusTool, getResultsTool,
} from '../src/tools.js'
import { writeSpec, writeStatus, writeResult, readMerged } from '../src/store.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_CWD = '/tmp/forge-fixture'

function seedFinishedWorker(id: string, cwd: string) {
  writeSpec({ workerId: id, workerName: `forge-worker: ${id}`, sourceSessionId: 'src-1',
    taskPrompt: 'task', cwd, maxTurns: 50, permissionMode: 'acceptEdits',
    createdAt: '2026-06-12T00:00:00Z' })
  writeStatus({ workerId: id, state: 'done', heartbeatAt: new Date().toISOString(), turns: 3 })
  writeResult(id, { worker: `forge-worker: ${id}`, sourceSession: 'src-1', task: 'task',
    outcome: 'completed', summary: 'all done', decisions: [], artifacts: [], followups: [] })
}

describe('tools', () => {
  beforeEach(() => {
    process.env.CLAUDE_CONFIG_DIR = path.join(HERE, 'fixtures', 'claude-config')
    process.env.FORGE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-tools-'))
  })

  it('list/search/inspect delegate to the reader', () => {
    expect(listSessionsTool({ scope: 'project', cwd: FIXTURE_CWD }).sessions.length).toBe(1)
    expect(searchSessionsTool({ query: 'auth', scope: 'project', cwd: FIXTURE_CWD }).hits.length).toBe(1)
    const v = inspectSessionTool({ sessionId: '11111111-1111-1111-1111-111111111111', cwd: FIXTURE_CWD })
    expect(v.found).toBe(true)
  })

  it('spawn validates source session exists before launching', () => {
    const launches: string[] = []
    const out = spawnWorkerTool(
      { sourceSessionId: '11111111-1111-1111-1111-111111111111', taskPrompt: 'do x', cwd: FIXTURE_CWD },
      { launchDetached: id => { launches.push(id); return 1 } },
    )
    expect(out.ok).toBe(true)
    expect(launches.length).toBe(1)

    const bad = spawnWorkerTool(
      { sourceSessionId: 'does-not-exist', taskPrompt: 'do x', cwd: FIXTURE_CWD },
      { launchDetached: id => { launches.push(id); return 1 } },
    )
    expect(bad.ok).toBe(false)
    expect(launches.length).toBe(1)            // no zombie launch
  })

  it('status reports stale running workers as failed-looking', () => {
    writeSpec({ workerId: 'w1', workerName: 'forge-worker: w1', sourceSessionId: 's',
      taskPrompt: 't', cwd: '/tmp/p', maxTurns: 50, permissionMode: 'acceptEdits',
      createdAt: '2026-06-12T00:00:00Z' })
    writeStatus({ workerId: 'w1', state: 'running', heartbeatAt: '2026-06-12T00:00:00Z', turns: 1 })
    const s = workerStatusTool({})
    expect(s.workers[0].stale).toBe(true)
  })

  it('getResults pending: returns contracts and marks merged', () => {
    seedFinishedWorker('w1', FIXTURE_CWD)
    const out = getResultsTool({ workerId: 'pending', cwd: FIXTURE_CWD, consumerId: 'live:test' })
    expect(out.results.length).toBe(1)
    expect(out.results[0].summary).toBe('all done')
    expect(readMerged('w1')).toEqual(['live:test'])
    expect(getResultsTool({ workerId: 'pending', cwd: FIXTURE_CWD, consumerId: 'live:test' }).results).toEqual([])
  })
})
