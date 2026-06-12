import { describe, it, expect, beforeEach } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listSessions, searchSessions, inspectSession } from '../src/session-reader.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_CWD = '/tmp/forge-fixture'

describe('session-reader: listSessions', () => {
  beforeEach(() => {
    process.env.CLAUDE_CONFIG_DIR = path.join(HERE, 'fixtures', 'claude-config')
  })

  it('lists only current-project sessions with scope "project"', () => {
    const sessions = listSessions('project', FIXTURE_CWD)
    expect(sessions.length).toBe(1)
    const s = sessions[0]
    expect(s.sessionId).toBe('11111111-1111-1111-1111-111111111111')
    expect(s.cwd).toBe('/tmp/forge-fixture')
    expect(s.firstUserText).toContain('Design the auth flow')      // not the sidechain/compact lines
    expect(s.lastAssistantText).toContain('OAuth route')
    expect(s.messageCount).toBe(3)                                  // u1, a1, a2 (sidechain+compact excluded)
  })

  it('lists all projects with scope "all"', () => {
    const ids = listSessions('all', FIXTURE_CWD).map(s => s.sessionId).sort()
    expect(ids).toEqual([
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ])
  })
})

describe('session-reader: search + inspect', () => {
  beforeEach(() => {
    process.env.CLAUDE_CONFIG_DIR = path.join(HERE, 'fixtures', 'claude-config')
  })

  it('finds sessions by substring, returns match snippets', () => {
    const hits = searchSessions('auth flow', 'project', FIXTURE_CWD)
    expect(hits.length).toBe(1)
    expect(hits[0].meta.sessionId).toBe('11111111-1111-1111-1111-111111111111')
    expect(hits[0].matches[0]).toContain('auth flow')
  })

  it('does not match sidechain content', () => {
    expect(searchSessions('bananas', 'project', FIXTURE_CWD)).toEqual([])
  })

  it('escalating scope finds other projects', () => {
    expect(searchSessions('billing', 'project', FIXTURE_CWD)).toEqual([])
    const all = searchSessions('billing', 'all', FIXTURE_CWD)
    expect(all[0].meta.sessionId).toBe('22222222-2222-2222-2222-222222222222')
  })

  it('inspect returns head and tail messages', () => {
    const view = inspectSession('11111111-1111-1111-1111-111111111111', 'project', FIXTURE_CWD)
    expect(view).not.toBeNull()
    expect(view!.head[0]).toContain('Design the auth flow')
    expect(view!.tail[view!.tail.length - 1]).toContain('OAuth route')
  })
})
