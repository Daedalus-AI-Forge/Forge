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
    // The Agent SDK (ESM) calls createRequire(import.meta.url) to locate its CLI.
    // esbuild's CJS output replaces import.meta with `{}`, so import.meta.url is
    // undefined and createRequire throws. Point it at the bundle's own file URL.
    define: { 'import.meta.url': '__forgeImportMetaUrl' },
    inject: ['./scripts/import-meta-url-shim.mjs'],
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
  })
}
