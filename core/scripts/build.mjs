import { build } from 'esbuild'

const entries = {
  'mcp-server': 'src/entries/mcp-server.ts',
  'worker-run': 'src/entries/worker-run.ts',
  'session-start': 'src/entries/session-start.ts',
  cli: 'src/entries/cli.ts',
}
for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: `../plugin/dist/${name}.cjs`,
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
  })
}
