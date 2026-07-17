const { mockHasAI, mockRequireAI, mockChat, mockHttpRequest } = vi.hoisted(() => ({
  mockHasAI: vi.fn(),
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
  mockHttpRequest: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  hasProvider: mockHasAI,
  requireProvider: mockRequireAI,
}))

vi.mock('@molecule/api-http', () => ({
  request: mockHttpRequest,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkflowEngine, safeEvaluateCondition } from '../index.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      // Real ChatEvent text payload is `content` (see @molecule/api-ai types).
      for (const text of chunks) yield { type: 'text', content: text }
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

describe('http step', () => {
  it('executes an http request via the @molecule/api-http core and traces it', async () => {
    mockHttpRequest.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { id: 7, name: 'Widget' },
      request: { url: 'https://api.example.com/items/1', method: 'GET' },
    })
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ id: '1' }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        {
          type: 'http',
          method: 'GET',
          url: 'https://api.example.com/items/${$.id}',
          output: 'item',
        },
      ],
    })
    // Routed through the swappable core (not a hardcoded fetch/axios), with the
    // ${$.id} template resolved into the URL.
    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://api.example.com/items/1',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(run.ok).toBe(true)
    expect(run.trace).toHaveLength(1)
    expect(run.trace[0].type).toBe('http')
    expect(run.trace[0].outcome).toBe('executed')
    // Response captured into context.
    expect(run.context.item).toEqual({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { id: 7, name: 'Widget' },
    })
  })

  it('resolves ${$.x} templates in headers, params, and body', async () => {
    mockHttpRequest.mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: {},
      data: null,
      request: { url: 'https://api.example.com/x', method: 'POST' },
    })
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ token: 'abc', name: 'Bo', amount: 42 }) },
      actions: {},
    })
    await engine.execute({
      trigger: 't',
      steps: [
        {
          type: 'http',
          method: 'POST',
          url: 'https://api.example.com/x',
          headers: { Authorization: 'Bearer ${$.token}' },
          params: { q: '${$.name}' },
          body: { greeting: 'Hi ${$.name}', amount: '${$.amount}' },
        },
      ],
    })
    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://api.example.com/x',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer abc' },
        params: { q: 'Bo' },
        body: { greeting: 'Hi Bo', amount: '42' },
      }),
    )
  })

  it('records an errored trace entry (not a silent skip) when the request throws', async () => {
    const httpError = Object.assign(new Error('Request failed with status code 404'), {
      response: { status: 404 },
    })
    mockHttpRequest.mockRejectedValue(httpError)
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [
        { type: 'http', method: 'GET', url: 'https://api.example.com/missing' },
        { type: 'http', method: 'GET', url: 'https://api.example.com/never' },
      ],
    })
    expect(run.ok).toBe(false)
    expect(run.trace).toHaveLength(1) // halts on error
    expect(run.trace[0].type).toBe('http')
    expect(run.trace[0].outcome).toBe('errored')
    expect(run.trace[0].error).toContain('404')
    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
  })

  it('defaults the method to GET when none is given', async () => {
    mockHttpRequest.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'ok',
      request: { url: 'https://api.example.com/ping', method: 'GET' },
    })
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    await engine.execute({
      trigger: 't',
      steps: [{ type: 'http', url: 'https://api.example.com/ping' }],
    })
    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://api.example.com/ping',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('condition evaluation — trust boundary', () => {
  it('safe default evaluator supports comparisons + boolean logic without new Function', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ amount: 100, status: 'active' }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '$.amount >= 100 && $.status === "active"' }],
    })
    expect(run.ok).toBe(true)
    expect(run.trace[0].outcome).toBe('executed')
  })

  it('safe default evaluator does NOT execute arbitrary JS (no new Function / no side effects)', async () => {
    const g = globalThis as Record<string, unknown>
    delete g.__wfHacked
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({}) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '(globalThis.__wfHacked = true)' }],
    })
    // The assignment never ran — the safe interpreter cannot execute arbitrary JS.
    expect(g.__wfHacked).toBeUndefined()
    // Unparseable under the safe grammar → false → the step short-circuits.
    expect(run.ok).toBe(true)
    expect(run.trace[0].outcome).toBe('skipped')
  })

  it('arbitrary-JS expressions (e.g. arithmetic) are NOT run by the safe default', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ a: 1, b: 2 }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '$.a + $.b === 3' }],
    })
    // `+` is outside the safe grammar → false → skipped (not executed).
    expect(run.trace[0].outcome).toBe('skipped')
  })

  it('allowUnsafeConditionEval opts INTO new Function (arbitrary JS then runs)', async () => {
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ a: 1, b: 2 }) },
      actions: {},
      allowUnsafeConditionEval: true,
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: '$.a + $.b === 3' }],
    })
    expect(run.trace[0].outcome).toBe('executed')
  })

  it('a custom conditionEvaluator replaces both built-ins', async () => {
    const evaluator = vi.fn().mockReturnValue(true)
    const engine = createWorkflowEngine({
      triggers: { t: async () => ({ x: 1 }) },
      actions: {},
      conditionEvaluator: evaluator,
    })
    const run = await engine.execute({
      trigger: 't',
      steps: [{ type: 'condition', expression: 'anything at all' }],
    })
    expect(evaluator).toHaveBeenCalledWith('anything at all', { x: 1 })
    expect(run.trace[0].outcome).toBe('executed')
  })
})

describe('safeEvaluateCondition (unit)', () => {
  it('resolves member access, comparisons, logic, grouping, and literals', () => {
    const ctx = { user: { role: 'admin', age: 30 }, active: true, list: [10, 20] }
    expect(safeEvaluateCondition('$.user.role === "admin"', ctx)).toBe(true)
    expect(safeEvaluateCondition('$.user.age >= 18 && $.active', ctx)).toBe(true)
    expect(safeEvaluateCondition('$.user.age < 18 || $.list[1] === 20', ctx)).toBe(true)
    expect(safeEvaluateCondition('!$.active', ctx)).toBe(false)
    expect(safeEvaluateCondition('($.user.age > 40) === false', ctx)).toBe(true)
  })

  it('safe-navigates missing paths to false instead of throwing', () => {
    expect(safeEvaluateCondition('$.nope.deep.bad', {})).toBe(false)
  })

  it('blocks prototype-chain access', () => {
    expect(safeEvaluateCondition('$.constructor', {})).toBe(false)
    expect(safeEvaluateCondition('$.__proto__', {})).toBe(false)
  })

  it('returns false for unsupported syntax (calls, assignment, arithmetic)', () => {
    expect(safeEvaluateCondition('$.name.toUpperCase()', { name: 'x' })).toBe(false)
    expect(safeEvaluateCondition('$.a = 1', {})).toBe(false)
    expect(safeEvaluateCondition('1 + 1', {})).toBe(false)
  })
})
