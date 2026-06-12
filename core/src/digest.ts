import type { PendingItem } from './store.js'

/** Compact SessionStart injection: summary + artifacts; full contract stays behind forge_get_results. */
export function buildDigest(items: PendingItem[]): string {
  if (!items.length) return ''
  const blocks = items.map(({ spec, result }) => {
    const flag = result.outcome === 'failed' ? ' — FAILED' : result.outcome === 'partial' ? ' — partial' : ''
    return [
      `### ${spec.workerName}${flag} (worker \`${spec.workerId}\`)`,
      `Task: ${result.task}`,
      `\n${result.summary}`,
      result.artifacts.length ? `Artifacts:\n${result.artifacts.map(a => `- ${a}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
  })
  return [
    '## Forge: background worker results since your last session',
    ...blocks,
    '_Call the `forge_get_results` MCP tool with a workerId for the full result contract (decisions, diffs, follow-ups)._',
  ].join('\n\n')
}
