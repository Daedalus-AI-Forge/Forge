import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  listSessionsTool, searchSessionsTool, inspectSessionTool,
  spawnWorkerTool, workerStatusTool, getResultsTool,
} from '../tools.js'
import { realLaunchDetached } from '../spawner.js'

const server = new McpServer({ name: 'forge', version: '0.1.0' })
const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 2) }] })

server.registerTool('forge_list_sessions',
  { description: 'List Claude Code sessions (scope: project=current cwd, all=every project), newest first.',
    inputSchema: { scope: z.enum(['project', 'all']).optional(), limit: z.number().optional() } },
  async (a) => text(listSessionsTool(a)))

server.registerTool('forge_search_sessions',
  { description: 'Full-text search previous sessions. Start scope=project, escalate to all if no hits.',
    inputSchema: { query: z.string(), scope: z.enum(['project', 'all']).optional() } },
  async (a) => text(searchSessionsTool(a)))

server.registerTool('forge_inspect_session',
  { description: 'Head/tail snippets and metadata for one session id.',
    inputSchema: { sessionId: z.string() } },
  async (a) => text(inspectSessionTool(a)))

server.registerTool('forge_spawn_worker',
  { description: 'Fork a previous session into a named, detached headless worker. Returns workerId immediately.',
    inputSchema: { sourceSessionId: z.string(), taskPrompt: z.string(),
      workerName: z.string().optional(), model: z.string().optional(),
      maxTurns: z.number().optional() } },
  async (a) => text(spawnWorkerTool(a, { launchDetached: realLaunchDetached })))

server.registerTool('forge_worker_status',
  { description: 'Status of one worker (workerId) or all workers.',
    inputSchema: { workerId: z.string().optional() } },
  async (a) => text(workerStatusTool(a)))

server.registerTool('forge_get_results',
  { description: 'Pull finished worker result contracts into context (workerId, or omit for all pending in this project). Marks them merged.',
    inputSchema: { workerId: z.string().optional() } },
  async (a) => text(getResultsTool(a)))

server.connect(new StdioServerTransport()).catch((err) => {
  console.error(err)
  process.exit(1)
})
