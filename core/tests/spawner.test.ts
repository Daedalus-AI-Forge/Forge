import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnWorker, slugify, type SpawnDeps } from '../src/spawner.js'
import { readSpec } from '../src/store.js'

describe('slugify', () => {
  it('makes safe slugs', () => {
    expect(slugify('Implement the Login Page!')).toBe('implement-the-login-page')
  })
})

describe('spawnWorker', () => {
  beforeEach(() => {
    process.env.FORGE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-spawn-'))
  })

  it('writes the spec then launches the detached runner with the workerId', () => {
    const calls: any[] = []
    const deps: SpawnDeps = { launchDetached: (workerId) => { calls.push(workerId); return 4242 } }
    const { workerId, workerName } = spawnWorker({
      sourceSessionId: 'src-1', taskPrompt: 'Implement the login page', cwd: '/tmp/p',
    }, deps)
    expect(workerId).toMatch(/^implement-the-login-page-/)
    expect(workerName).toBe('forge-worker: implement-the-login-page')
    expect(calls).toEqual([workerId])
    const spec = readSpec(workerId)!
    expect(spec.sourceSessionId).toBe('src-1')
    expect(spec.cwd).toBe('/tmp/p')
    expect(spec.permissionMode).toBe('acceptEdits')   // safe default, never bypass
  })

  it('explicit workerName and budgets are respected', () => {
    const deps: SpawnDeps = { launchDetached: () => 1 }
    const { workerId } = spawnWorker({
      sourceSessionId: 'src-1', taskPrompt: 'x', cwd: '/tmp/p',
      workerName: 'auth-redo', maxTurns: 10, model: 'claude-haiku-4-5-20251001',
    }, deps)
    const spec = readSpec(workerId)!
    expect(spec.workerName).toBe('forge-worker: auth-redo')
    expect(spec.maxTurns).toBe(10)
    expect(spec.model).toBe('claude-haiku-4-5-20251001')
  })
})
