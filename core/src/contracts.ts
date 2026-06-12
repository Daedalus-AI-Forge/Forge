import { z } from 'zod'

export const WorkerSpec = z.object({
  workerId: z.string(),
  workerName: z.string(),
  sourceSessionId: z.string(),
  taskPrompt: z.string(),
  cwd: z.string(),
  model: z.string().optional(),
  maxTurns: z.number().int().positive().default(50),
  permissionMode: z.enum(['default', 'acceptEdits', 'plan', 'bypassPermissions']).default('acceptEdits'),
  createdAt: z.string(),
})
export type WorkerSpec = z.infer<typeof WorkerSpec>

export const WorkerStatus = z.object({
  workerId: z.string(),
  state: z.enum(['running', 'done', 'failed']),
  pid: z.number().optional(),
  heartbeatAt: z.string(),
  turns: z.number().int().default(0),
  forkedSessionId: z.string().optional(),
})
export type WorkerStatus = z.infer<typeof WorkerStatus>

export const ResultContract = z.object({
  worker: z.string(),
  sourceSession: z.string(),
  task: z.string(),
  outcome: z.enum(['completed', 'partial', 'blocked', 'failed']),
  summary: z.string(),
  decisions: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),
  diffs: z.string().optional(),
  followups: z.array(z.string()).default([]),
})
export type ResultContract = z.infer<typeof ResultContract>

export const SessionMeta = z.object({
  sessionId: z.string(),
  projectDir: z.string(),
  cwd: z.string().optional(),
  filePath: z.string(),
  modifiedAt: z.string(),
  firstUserText: z.string().optional(),
  lastAssistantText: z.string().optional(),
  messageCount: z.number().int(),
})
export type SessionMeta = z.infer<typeof SessionMeta>
