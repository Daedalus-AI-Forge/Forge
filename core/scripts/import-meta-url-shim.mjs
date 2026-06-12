// Injected into every CJS bundle so SDK code that reads `import.meta.url`
// (e.g. createRequire(import.meta.url)) gets a valid absolute file URL at
// runtime instead of the `undefined` esbuild emits for CJS output.
// __filename is defined in the CJS runtime; pathToFileURL yields a valid URL.
import { pathToFileURL } from 'node:url'
export const __forgeImportMetaUrl = pathToFileURL(__filename).href
