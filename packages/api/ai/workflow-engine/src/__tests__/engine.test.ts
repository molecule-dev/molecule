const { mockHasAI, mockRequireAI, mockChat } = vi.hoisted(() => ({
  mockHasAI: vi.fn(),
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  hasProvider: mockHasAI,
  requireProvider: mockRequireAI,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkflowEngine } from '../index.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) yield { type: 'text', text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockHasAI.mockReturnValue(false)
  mockRequireAI.mockReturnValue({ chat: mockChat })
})

describe('createWorkflowEngine — triggers', () => {
  it('returns ok=false + errored trace when trigger is unknown', async () => {
    const engine = createWorkflowEngine({ triggers: {}, actions: {} })
    const run = await engine.execute({ trigger: 'nope', steps: [] })
    expect(run.ok).toBe(false)
    expect(run.trace[0].outcome).toBe('errored')
    expect(run.trace[0].error).toContain('Unknown trigger')
  })

  it('seeds context with triggerInput + merges trigger output', async () => {
    const engine = createWorkflowEngine({
      triggers: { 'web.in': async (ctx) => ({ derived: (ctx as { x: number }).x + 1 }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 'web.in',
      triggerInput: { x: 5 },
      steps: [],
    })
    expect(run.ok).toBe(true)
    expect(run.context).toEqual({ x: 5, derived: 6 })
  })

  it('catches trigger errors into trace + ok=false', async () => {
    const engine = createWorkflowEngine({
      triggers: {
        boom: () => {
          throw new Error('trigger boom')
        },
      },
      actions: {},
    })
    const run = await engine.execute({ trigger: 'boom', steps: [] })
    expect(run.ok).toBe(false)
    expect(run.trace[0].error).toBe('trigger boom')
  })
})

describe('condition step', () => {
  it('executes the step when expression is truthy', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ amount: 100 }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '$.amount > 50' }],
    })
    expect(run.ok).toBe(true)
    expect(run.trace[0].outcome).toBe('executed')
  })

  it('short-circuits subsequent steps when condition is falsy (ok=true)', async () => {
    const action = vi.fn().mockResolvedValue('done')
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ amount: 10 }) },
      actions: { 'log.it': action },
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        { type: 'condition', expression: '$.amount > 50' },
        { type: 'action', action: 'log.it' },
      ],
    })
    expect(run.ok).toBe(true)
    expect(run.trace).toHaveLength(1)
    expect(run.trace[0].outcome).toBe('skipped')
    expect(action).not.toHaveBeenCalled()
  })

  it('treats throwing expressions as false (skipped, not errored)', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '$.nope.deep.bad' }],
    })
    expect(run.ok).toBe(true)
    expect(run.trace[0].outcome).toBe('skipped')
  })
})

describe('action step', () => {
  it('resolves ${$.foo} templates in params before invoking the action', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ name: 'Alice', count: 3 }) },
      actions: { send: action },
    })
    await engine.execute({
      trigger: 't',
      steps: [
        {
          type: 'action',
          action: 'send',
          params: { greeting: 'Hello, ${$.name}!', n: '${$.count}' },
        },
      ],
    })
    expect(action).toHaveBeenCalledWith({ greeting: 'Hello, Alice!', n: '3' })
  })

  it('resolves templates recursively into nested objects + arrays', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ id: 'X' }) },
      actions: { send: action },
    })
    await engine.execute({
      trigger: 't',
      steps: [
        {
          type: 'action',
          action: 'send',
          params: { nested: { tags: ['user-${$.id}', 'env-prod'] } },
        },
      ],
    })
    expect(action).toHaveBeenCalledWith({
      nested: { tags: ['user-X', 'env-prod'] },
    })
  })

  it('writes action result to context at the `output` path (deep)', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: { gen: async () => ({ id: 42 }) },
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'action', action: 'gen', output: 'result.user' }],
    })
    expect(run.context).toMatchObject({ result: { user: { id: 42 } } })
  })

  it('errors + halts run when action is unknown', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        { type: 'action', action: 'missing' },
        { type: 'action', action: 'never' },
      ],
    })
    expect(run.ok).toBe(false)
    expect(run.trace[0].outcome).toBe('errored')
    expect(run.trace[0].error).toContain('Unknown action: missing')
    expect(run.trace).toHaveLength(1) // halts immediately
  })

  it('captures action errors into the trace + halts', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {
        boom: async () => {
          throw new Error('boom')
        },
      },
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        { type: 'action', action: 'boom' },
        { type: 'action', action: 'never' },
      ],
    })
    expect(run.ok).toBe(false)
    expect(run.trace[0].error).toBe('boom')
    expect(run.trace).toHaveLength(1)
  })

  it('templates with missing paths resolve to empty string', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ a: 1 }) },
      actions: { send: action },
    })
    await engine.execute({
      trigger: 't',
      steps: [{ type: 'action', action: 'send', params: { value: '${$.missing.deep}' } }],
    })
    expect(action).toHaveBeenCalledWith({ value: '' })
  })
})

describe('delay step', () => {
  it('records executed without using fake timers (uses short ms)', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const ms = 5
    const start = Date.now()
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'delay', ms }],
    })
    // `Date.now()` is millisecond-truncated, so a real 5ms wait can measure
    // as 4ms when `start` is captured mid-millisecond — assert `ms - 1` to
    // keep the "the delay genuinely blocked" intent without the off-by-one
    // flake.
    expect(Date.now() - start).toBeGreaterThanOrEqual(ms - 1)
    expect(run.trace[0].outcome).toBe('executed')
  })
})

describe('ai_prompt step', () => {
  it('errors when no AI provider is bonded', async () => {
    mockHasAI.mockReturnValue(false)
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'ai_prompt', prompt: 'hi', output: 'answer' }],
    })
    expect(run.ok).toBe(false)
    expect(run.trace[0].error).toContain('No AI provider bonded')
  })

  it('resolves templates in the prompt and writes answer to context', async () => {
    mockHasAI.mockReturnValue(true)
    mockChat.mockReturnValue(streamChunks(['Hi Alice']))
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ name: 'Alice' }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        {
          type: 'ai_prompt',
          prompt: 'Greet ${$.name}',
          output: 'message',
        },
      ],
    })
    expect(mockChat.mock.calls[0][0].messages[0].content).toBe('Greet Alice')
    expect(run.context.message).toBe('Hi Alice')
  })
})
