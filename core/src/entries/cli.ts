import {
  listSessionsTool, searchSessionsTool, inspectSessionTool,
  spawnWorkerTool, workerStatusTool, getResultsTool,
} from '../tools.js'
import { realLaunchDetached } from '../spawner.js'

const [cmd, ...rest] = process.argv.slice(2)
const out = (v: unknown) => console.log(JSON.stringify(v, null, 2))

switch (cmd) {
  case 'list': out(listSessionsTool({ scope: (rest[0] as any) ?? 'project' })); break
  case 'search': out(searchSessionsTool({ query: rest[0] ?? '', scope: (rest[1] as any) ?? 'project' })); break
  case 'inspect': out(inspectSessionTool({ sessionId: rest[0] ?? '' })); break
  case 'spawn': out(spawnWorkerTool(
    { sourceSessionId: rest[0] ?? '', taskPrompt: rest.slice(1).join(' ') },
    { launchDetached: realLaunchDetached })); break
  case 'status': out(workerStatusTool({ workerId: rest[0] })); break
  case 'results': out(getResultsTool({ workerId: rest[0] })); break
  default:
    console.error('usage: forge <list [scope]|search <q> [scope]|inspect <id>|spawn <sessionId> <task...>|status [id]|results [id]>')
    process.exit(2)
}
