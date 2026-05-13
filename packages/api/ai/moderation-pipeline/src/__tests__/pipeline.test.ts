const { mockCreate, mockRequireAI, mockChat } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
}))

vi.mock('@molecule/api-ai', () => ({
  requireProvider: mockRequireAI,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyPolicy, classify, DEFAULT_POLICY, moderate } from '../pipeline.js'
import type { ModerationCategory, ModerationPolicy, ModerationScore } from '../types.js'

/** Build an async-iterable chat stream that yields {type:'text', text} chunks. */
function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) yield { type: 'text', text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireAI.mockReturnValue({ chat: mockChat })
})

describe('DEFAULT_POLICY', () => {
  it('has thresholds for every category in [0, 1]', () => {
    for (const [, t] of Object.entries(DEFAULT_POLICY.thresholds)) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(1)
    }
  })

  it('self_harm threshold is the lowest (most cautious)', () => {
    const sh = DEFAULT_POLICY.thresholds.self_harm!
    const others = Object.entries(DEFAULT_POLICY.thresholds)
      .filter(([k]) => k !== 'self_harm')
      .map(([, v]) => v as number)
    for (const v of others) expect(v).toBeGreaterThanOrEqual(sh)
  })

  it('action=flag and defaultAction=allow', () => {
    expect(DEFAULT_POLICY.action).toBe('flag')
    expect(DEFAULT_POLICY.defaultAction).toBe('allow')
  })
})

describe('classify', () => {
  it('parses a well-formed JSON response into ModerationScores', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '{"scores":{"hate":0.1,"harassment":0.2,"sexual":0,"self_harm":0,',
        '"violence":0.05,"illegal":0,"spam":0,"misinformation":0,"pii":0},',
        '"reasoning":"benign"}',
      ]),
    )
    const out = await classify('hello world')
    expect(out.reasoning).toBe('benign')
    const byCat = Object.fromEntries(out.scores.map((s) => [s.category, s.score]))
    expect(byCat.hate).toBeCloseTo(0.1)
    expect(byCat.harassment).toBeCloseTo(0.2)
  })

  it('strips ```json fences before parsing', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '```json\n{"scores":{"hate":0.05,"harassment":0,"sexual":0,"self_harm":0,',
        '"violence":0,"illegal":0,"spam":0,"misinformation":0,"pii":0},',
        '"reasoning":"safe"}\n```',
      ]),
    )
    const out = await classify('x')
    expect(out.reasoning).toBe('safe')
    expect(out.scores.length).toBe(9)
  })

  it('clamps out-of-range scores to [0,1]', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '{"scores":{"hate":2.5,"harassment":-0.3,"sexual":0,"self_harm":0,',
        '"violence":0,"illegal":0,"spam":0,"misinformation":0,"pii":0},',
        '"reasoning":"clamped"}',
      ]),
    )
    const out = await classify('x')
    const byCat = Object.fromEntries(out.scores.map((s) => [s.category, s.score]))
    expect(byCat.hate).toBe(1)
    expect(byCat.harassment).toBe(0)
  })

  it('coerces non-numeric scores (NaN / null / "abc") to 0', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '{"scores":{"hate":"not-a-number","harassment":null,"sexual":0,"self_harm":0,',
        '"violence":0,"illegal":0,"spam":0,"misinformation":0,"pii":0},',
        '"reasoning":"r"}',
      ]),
    )
    const out = await classify('x')
    const byCat = Object.fromEntries(out.scores.map((s) => [s.category, s.score]))
    expect(byCat.hate).toBe(0)
    expect(byCat.harassment).toBe(0)
  })

  it('returns empty scores + diagnostic when the model returns garbage', async () => {
    mockChat.mockReturnValue(streamChunks(['not json at all']))
    const out = await classify('x')
    expect(out.scores).toEqual([])
    expect(out.reasoning).toBe('classifier returned malformed JSON')
  })

  it('ignores non-text events in the stream', async () => {
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'tool_use', name: 'x' } // ignored
        yield { type: 'text', text: '{"scores":{},"reasoning":"r"}' }
        yield { type: 'end' } // ignored
      },
    })
    const out = await classify('x')
    expect(out.reasoning).toBe('r')
  })

  it('passes temperature=0 to AI for deterministic classification', async () => {
    mockChat.mockReturnValue(streamChunks(['{"scores":{},"reasoning":""}']))
    await classify('x')
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0 }))
  })

  it('substitutes content into the classifier prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"scores":{},"reasoning":""}']))
    await classify('TEST PAYLOAD')
    const args = mockChat.mock.calls[0][0]
    expect(args.messages[0].content).toContain('TEST PAYLOAD')
    expect(args.messages[0].content).not.toContain('{{CONTENT}}')
  })
})

describe('applyPolicy', () => {
  const score = (category: ModerationCategory, n: number): ModerationScore => ({
    category,
    score: n,
  })

  it('returns defaultAction with no thresholds crossed', () => {
    const decision = applyPolicy([score('hate', 0.1), score('spam', 0.2)], 'r')
    expect(decision.action).toBe('allow')
    expect(decision.flagged).toBe(false)
    expect(decision.matched_category).toBeNull()
  })

  it('returns policy.action when one threshold is crossed', () => {
    const decision = applyPolicy([score('hate', 0.9)], 'r')
    expect(decision.action).toBe('flag')
    expect(decision.flagged).toBe(true)
    expect(decision.matched_category).toBe('hate')
  })

  it('matches the category with the LARGEST over-threshold delta', () => {
    // hate threshold 0.7, score 0.75 → over 0.05
    // violence threshold 0.8, score 0.99 → over 0.19 (winner)
    const decision = applyPolicy(
      [score('hate', 0.75), score('violence', 0.99), score('spam', 0.95)],
      'r',
    )
    expect(decision.matched_category).toBe('violence')
  })

  it('ignores categories not present in policy thresholds', () => {
    const customPolicy: ModerationPolicy = {
      thresholds: { hate: 0.5 },
      action: 'block',
      defaultAction: 'allow',
    }
    // 'violence' has no threshold in this policy — only 'hate' counts
    const decision = applyPolicy([score('violence', 1.0), score('hate', 0.6)], 'r', customPolicy)
    expect(decision.matched_category).toBe('hate')
    expect(decision.action).toBe('block')
  })

  it('falls back to "allow" when defaultAction is not provided', () => {
    const policy: ModerationPolicy = { thresholds: { hate: 0.9 }, action: 'block' }
    const decision = applyPolicy([score('hate', 0.1)], 'r', policy)
    expect(decision.action).toBe('allow')
  })

  it('preserves scores + reasoning on the decision object', () => {
    const scores = [score('hate', 0.1)]
    const decision = applyPolicy(scores, 'because reasons')
    expect(decision.scores).toBe(scores)
    expect(decision.reasoning).toBe('because reasons')
  })

  it('flags an exact-equal score (>= threshold counts as crossing)', () => {
    // self_harm threshold is 0.6 — exactly 0.6 must match. Earlier impl
    // used `over > maxOver` with maxOver=0, which silently dropped
    // exact-threshold crossings; fixed to also accept when no category
    // has matched yet.
    const decision = applyPolicy([score('self_harm', 0.6)], 'r')
    expect(decision.matched_category).toBe('self_harm')
    expect(decision.flagged).toBe(true)
  })
})

describe('moderate (end-to-end pipeline)', () => {
  function arrangeClassifier(scores: Partial<Record<ModerationCategory, number>>) {
    const fullScores = {
      hate: 0,
      harassment: 0,
      sexual: 0,
      self_harm: 0,
      violence: 0,
      illegal: 0,
      spam: 0,
      misinformation: 0,
      pii: 0,
      ...scores,
    }
    mockChat.mockReturnValue(
      streamChunks([`{"scores":${JSON.stringify(fullScores)},"reasoning":"reasoning"}`]),
    )
  }

  it('writes an audit row by default with content_excerpt + decision', async () => {
    arrangeClassifier({ hate: 0.9 })
    mockCreate.mockResolvedValue({ data: { id: 'audit-1' } })
    const decision = await moderate({ content: 'evil words', ownerId: 'user-1' })
    expect(decision.action).toBe('flag')
    expect(decision.matched_category).toBe('hate')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate.mock.calls[0][0]).toBe('moderation_audit_log')
    const row = mockCreate.mock.calls[0][1]
    expect(row.decision).toBe('flag')
    expect(row.matched_category).toBe('hate')
    expect(row.content_excerpt).toBe('evil words')
    expect(row.owner_id).toBe('user-1')
  })

  it('truncates content_excerpt to 500 chars (does NOT log full payloads)', async () => {
    arrangeClassifier({})
    const long = 'a'.repeat(1500)
    await moderate({ content: long })
    const excerpt = mockCreate.mock.calls[0][1].content_excerpt
    expect(excerpt.length).toBe(500)
  })

  it('passes resource type + id when provided', async () => {
    arrangeClassifier({})
    await moderate({ content: 'x', resource: { type: 'comment', id: 'c-9' } })
    const row = mockCreate.mock.calls[0][1]
    expect(row.resource_type).toBe('comment')
    expect(row.resource_id).toBe('c-9')
  })

  it('skips audit entirely when audit: false', async () => {
    arrangeClassifier({})
    await moderate({ content: 'x', audit: false })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('swallows audit-write errors (best-effort logging)', async () => {
    arrangeClassifier({ hate: 0.9 })
    mockCreate.mockRejectedValue(new Error('audit log down'))
    // Should NOT throw — decision still returned
    const decision = await moderate({ content: 'x' })
    expect(decision.action).toBe('flag') // pipeline survived
  })

  it('end-to-end below-threshold path → allow + no flag', async () => {
    arrangeClassifier({ hate: 0.1, spam: 0.2 })
    const decision = await moderate({ content: 'hi', audit: false })
    expect(decision.action).toBe('allow')
    expect(decision.flagged).toBe(false)
    expect(decision.matched_category).toBeNull()
  })

  it('honors a custom policy passed in', async () => {
    arrangeClassifier({ spam: 0.95 })
    const policy: ModerationPolicy = {
      thresholds: { spam: 0.5 },
      action: 'block',
      defaultAction: 'allow',
    }
    const decision = await moderate({ content: 'x', policy, audit: false })
    expect(decision.action).toBe('block')
    expect(decision.matched_category).toBe('spam')
  })

  it('owner_id defaults to null when not provided', async () => {
    arrangeClassifier({})
    await moderate({ content: 'x' })
    expect(mockCreate.mock.calls[0][1].owner_id).toBeNull()
  })
})
