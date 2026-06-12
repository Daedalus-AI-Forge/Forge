import { describe, it, expect, beforeEach } from 'vitest'
import path from 'node:path'
import { forgeHome, workerDir, claudeProjectsRoot, encodeProjectDir } from '../src/paths.js'

describe('paths', () => {
  beforeEach(() => {
    delete process.env.FORGE_HOME
    delete process.env.CLAUDE_CONFIG_DIR
  })

  it('FORGE_HOME overrides forge home', () => {
    process.env.FORGE_HOME = '/tmp/fh'
    expect(forgeHome()).toBe('/tmp/fh')
    expect(workerDir('w1')).toBe(path.join('/tmp/fh', 'workers', 'w1'))
  })

  it('CLAUDE_CONFIG_DIR overrides projects root', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/cc'
    expect(claudeProjectsRoot()).toBe(path.join('/tmp/cc', 'projects'))
  })

  it('encodes cwd like Claude Code does (non-alphanumerics → dash)', () => {
    expect(encodeProjectDir('/Users/darren/Documents/daedalus-ai-forge/Forge'))
      .toBe('-Users-darren-Documents-daedalus-ai-forge-Forge')
  })
})
