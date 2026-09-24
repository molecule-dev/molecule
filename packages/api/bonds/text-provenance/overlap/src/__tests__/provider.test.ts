import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { AgentSession } from '@molecule/api-agent-transcript'
import { provider as claudeCode } from '@molecule/api-agent-transcript-claude-code'

import { provider } from '../provider.js'
import { words } from '../words.js'

const DRAFT =
  'Reading the log first would have ended the search before it started. The error sat in the output the whole time, one line at the top of the stack, and none of the code we had been reading was involved at all.'
const HUMAN =
  'I have been writing software for fifteen years and I still reach for the debugger before the log.'
const PASTED =
  'This paragraph is mine, typed straight into the prompt, and the agent only copied it into the post file.'

const session: AgentSession = {
  format: 'test',
  harness: 'Test',
  model: 'model-a',
  turns: [
    { role: 'user', text: 'Write the section about the 500 errors, one incident only.', files: [] },
    {
      role: 'assistant',
      text: `Here it is.\n\n## The deploy\n\n**Reading the log first** would have ended the search before it started. ${DRAFT.slice(69)}`,
      model: 'model-b',
      files: [],
    },
    { role: 'user', text: `Add my opening paragraph as written: ${PASTED}`, files: [] },
    {
      role: 'assistant',
      text: 'Added.',
      files: [
        {
          path: 'posts/debugging.md',
          kind: 'create',
          text: `# Debugging\n\n${PASTED}\n\nThe fix was a migration we had forgotten to write, and it took about four minutes once we knew it was needed.`,
          complete: true,
        },
      ],
    },
  ],
}

describe('attribute', () => {
  it('marks an AI paragraph with the prompt it answered and the turn’s model, markdown notwithstanding', () => {
    const r = provider.attribute({ paragraphs: [DRAFT], sessions: [session] })
    expect(r.paragraphs[0]).toMatchObject({
      origin: 'ai',
      prompt: 'Write the section about the 500 errors, one incident only.',
      model: 'model-b',
      source: { session: 0, turn: 1 },
    })
    expect(r.paragraphs[0].aiWords).toBe(r.paragraphs[0].words)
  })

  it('keeps a lightly edited AI paragraph as AI', () => {
    const edited = DRAFT.replace('ended the search', 'finished the hunt').replace(
      'whole time',
      'entire time',
    )
    expect(
      provider.attribute({ paragraphs: [edited], sessions: [session] }).paragraphs[0].origin,
    ).toBe('ai')
  })

  it('marks a paragraph nobody generated as human, with no prompt', () => {
    expect(provider.attribute({ paragraphs: [HUMAN], sessions: [session] }).paragraphs[0]).toEqual({
      index: 0,
      origin: 'human',
      words: words(HUMAN).length,
      aiWords: 0,
    })
  })

  it('never credits the user’s own words to the AI, even when the agent wrote them into a file', () => {
    const r = provider.attribute({ paragraphs: [PASTED], sessions: [session] })
    expect(r.paragraphs[0].origin).toBe('human')
    expect(r.paragraphs[0].aiWords).toBe(0)
  })

  it('counts what the agent wrote into a file, with that turn’s prompt and the session model', () => {
    const r = provider.attribute({
      paragraphs: [
        'The fix was a migration we had forgotten to write, and it took about four minutes once we knew it was needed.',
      ],
      sessions: [session],
    })
    expect(r.paragraphs[0]).toMatchObject({
      origin: 'ai',
      model: 'model-a',
      prompt: expect.stringMatching(/^Add my opening paragraph/),
    })
  })

  it('totals the document: words, AI words, share and distinct prompts', () => {
    const r = provider.attribute({ paragraphs: [HUMAN, DRAFT, DRAFT, PASTED], sessions: [session] })
    expect(r.paragraphs.map((p) => p.origin)).toEqual(['human', 'ai', 'ai', 'human'])
    const w = (s: string): number => words(s).length
    expect(r.words).toBe(w(HUMAN) + 2 * w(DRAFT) + w(PASTED))
    expect(r.aiWords).toBe(2 * w(DRAFT))
    expect(r.aiShare).toBeCloseTo(r.aiWords / r.words)
    expect(r.prompts).toEqual(['Write the section about the 500 errors, one incident only.'])
  })

  it('is all human with no sessions, and zero for an empty document', () => {
    expect(provider.attribute({ paragraphs: [DRAFT], sessions: [] }).aiShare).toBe(0)
    expect(provider.attribute({ paragraphs: [], sessions: [session] })).toEqual({
      paragraphs: [],
      words: 0,
      aiWords: 0,
      aiShare: 0,
      prompts: [],
    })
  })

  it('honours minAiShare', () => {
    const half = `${DRAFT.slice(0, 69)} ${HUMAN} ${HUMAN}`
    expect(
      provider.attribute({ paragraphs: [half], sessions: [session] }).paragraphs[0].origin,
    ).toBe('human')
    expect(
      provider.attribute({ paragraphs: [half], sessions: [session], options: { minAiShare: 0.2 } })
        .paragraphs[0].origin,
    ).toBe('ai')
  })

  it('attributes a short phrase only when it appears whole in an assistant text and not in a prompt', () => {
    const s: AgentSession = {
      format: 't',
      harness: 't',
      turns: [
        { role: 'user', text: 'go', files: [] },
        { role: 'assistant', text: 'The deploy', files: [] },
      ],
    }
    expect(
      provider.attribute({ paragraphs: ['The deploy'], sessions: [s] }).paragraphs[0].origin,
    ).toBe('ai')
    expect(provider.attribute({ paragraphs: ['go'], sessions: [s] }).paragraphs[0].origin).toBe(
      'human',
    )
  })
})

describe('against a real Claude Code session', () => {
  // The same session twice: its /export (rendered, re-wrapped) and its log (markdown as written).
  const fixtures = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'agent-transcript',
    'claude-code',
    'src',
    '__tests__',
    'fixtures',
  )
  const exported = claudeCode.read({
    text: readFileSync(join(fixtures, 'export-v2.1.281.txt'), 'utf8'),
  })
  const logged = claudeCode.read({
    text: readFileSync(join(fixtures, 'session-v2.1.281.jsonl'), 'utf8'),
  })

  it('attributes each rendered paragraph of the reply to the logged turn, with its prompt and model', () => {
    const paragraphs = exported.turns[1].text.split('\n\n')
    const r = provider.attribute({ paragraphs, sessions: [logged] })
    // The heading ("Why logs first") is the user's own words — the prompt dictated it — so it stays human.
    expect(paragraphs[0]).toBe('Why logs first')
    expect(r.paragraphs.map((p) => p.origin)).toEqual(['human', 'ai', 'ai', 'ai'])
    expect(r.paragraphs.slice(1).every((p) => p.aiWords === p.words)).toBe(true)
    expect(new Set(r.paragraphs.slice(1).map((p) => p.model))).toEqual(
      new Set(['claude-haiku-4-5-20251001']),
    )
    expect(r.prompts).toEqual([logged.turns[0].text])
  })

  it('does not credit the prompt’s own text to the AI', () => {
    expect(
      provider.attribute({ paragraphs: [logged.turns[0].text], sessions: [logged] }).paragraphs[0]
        .origin,
    ).toBe('human')
  })
})
