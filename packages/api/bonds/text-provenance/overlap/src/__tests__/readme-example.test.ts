/**
 * The README example is real code: `readme-example.ts` is the module-level
 * `@example` of this package AND of `@molecule/api-text-provenance`,
 * `@molecule/api-agent-transcript` and `@molecule/api-agent-transcript-autodetect`
 * — byte for byte — and it runs here against a real Claude Code export.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { markdownBlocks, postProvenance, writeProvenance } from './readme-example.js'

/** The code inside the first `@example` fence of a file's module JSDoc, `*` gutters removed. */
function moduleExample(file: string): string {
  const source = readFileSync(file, 'utf8')
  const doc = source.slice(source.indexOf('/**'), source.indexOf('*/'))
  const lines = doc.split('\n').map((line) => line.replace(/^\s*\* ?/, ''))
  const start = lines.findIndex((line) => line.startsWith('@example'))
  const open = lines.findIndex((line, i) => i > start && line.startsWith('```'))
  const close = lines.findIndex((line, i) => i > open && line.startsWith('```'))
  if (start < 0 || open < 0 || close < 0) throw new Error(`no @example fence in ${file}`)
  return lines.slice(open + 1, close).join('\n')
}

const PACKAGES = join(__dirname, '../../../../../..')
const EXAMPLE = readFileSync(join(__dirname, 'readme-example.ts'), 'utf8').trimEnd()

describe('the README example', () => {
  it.each([
    ['@molecule/api-text-provenance-overlap', 'api/bonds/text-provenance/overlap'],
    ['@molecule/api-text-provenance', 'api/core/text-provenance'],
    ['@molecule/api-agent-transcript', 'api/core/agent-transcript'],
    ['@molecule/api-agent-transcript-autodetect', 'api/bonds/agent-transcript/autodetect'],
  ])('is the module @example of %s, verbatim', (_name, dir) => {
    expect(moduleExample(join(PACKAGES, dir, 'src/index.ts'))).toBe(EXAMPLE)
  })
})

const LEAD = 'I asked an agent why I open the log before the code, and I kept what it wrote.'
const AI_ONE =
  'When debugging, logs are your most direct window into what the code actually did. Before diving into source code, read the logs because they reveal the execution path, state transitions, and where things diverged from expectations. Logs show you the timeline of events — the order in which things happened, the values that flowed through the system, and the exact point where something broke. Source code tells you what could happen; logs tell you what did happen.'
const AI_TWO =
  "Reading logs first saves you from overthinking. You won't waste time tracing through conditional branches the code never hit, or wondering about race conditions that didn't occur. Logs compress hours of mental simulation into seconds. Once you know the actual failure point from the logs, you can jump directly to the relevant code section and understand why it failed in that specific scenario."
const AI_LIST = [
  '- Log context is temporal — it captures the full sequence of events leading up to the failure, which code inspection alone cannot reconstruct.',
  '- Logs eliminate false paths — they rule out entire categories of bugs immediately, letting you focus your code review on what actually matters.',
].join('\n')
const CODE = '```sh\ntail -f /var/log/app.log\n\ngrep ERROR /var/log/app.log\n```'
const CLOSING = 'That is the whole habit, and it has never once let me down.'
const PROMPT =
  'Reply with a markdown heading "## Why logs first", then two short paragraphs about reading logs before code, one with bold words, then a bullet list of two items. Do not use any tools.'

const POST = [
  '---',
  'title: Why logs first',
  'date: 2026-09-20',
  'description: Read the log before the code.',
  '---',
  '',
  LEAD,
  '',
  '## Why logs first',
  '',
  AI_ONE,
  '',
  AI_TWO,
  '',
  AI_LIST,
  '',
  CODE,
  '',
  CLOSING,
  '',
].join('\n')

describe('running it on a post with a real Claude Code export', () => {
  let root: string
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'provenance-example-'))
    mkdirSync(join(root, 'posts'))
    writeFileSync(join(root, 'posts/logs.md'), POST)
    writeFileSync(join(root, 'posts/notes.md'), `---\ntitle: Notes\n---\n\n${LEAD}\n\n${CLOSING}\n`)
    mkdirSync(join(root, 'transcripts/logs/archive'), { recursive: true })
    copyFileSync(
      join(__dirname, 'fixtures/claude-code-export.txt'),
      join(root, 'transcripts/logs/claude-code-export.txt'),
    )
    writeFileSync(join(root, 'transcripts/logs/README.md'), '# How this post was written\n')
  })
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('splits the body into blocks, front matter dropped, a fence with a blank line kept whole', () => {
    expect(markdownBlocks(POST)).toEqual([
      LEAD,
      '## Why logs first',
      AI_ONE,
      AI_TWO,
      AI_LIST,
      CODE,
      CLOSING,
    ])
  })

  it('marks the AI paragraphs with the prompt as typed and the model, and the rest human', () => {
    const map = postProvenance(join(root, 'posts/logs.md'), join(root, 'transcripts/logs'))
    expect(map.spans.map((s) => s.origin)).toEqual([
      'human', // the person's lead
      'human', // the heading: its words are in the person's prompt
      'ai',
      'ai',
      'ai',
      'human', // the code block is not in the transcript
      'human',
    ])
    for (const span of map.spans.filter((s) => s.origin === 'ai')) {
      expect(span).toEqual({ text: span.text, origin: 'ai', prompt: PROMPT, model: 'Haiku 4.5' })
    }
    expect(map.spans[0]).toEqual({ text: LEAD, origin: 'human' })
    expect(map.prompts).toEqual([PROMPT])
    expect(map.aiWords).toBeGreaterThan(0)
    expect(map.aiShare).toBeCloseTo(map.aiWords / map.words)
    expect(map.aiShare).toBeGreaterThan(0.7)
  })

  it('writes provenance.json with every ai span carrying its own prompt and model', () => {
    const out = join(root, 'dist/logs/provenance.json')
    writeProvenance(
      out,
      postProvenance(join(root, 'posts/logs.md'), join(root, 'transcripts/logs')),
    )
    const written = JSON.parse(readFileSync(out, 'utf8'))
    expect(written.spans).toHaveLength(7)
    expect(written.spans.filter((s: { prompt?: string }) => s.prompt === PROMPT)).toHaveLength(3)
    expect(Object.keys(written)).toEqual(['aiShare', 'words', 'aiWords', 'prompts', 'spans'])
  })

  it('reads a post with no transcript folder as 100% human, with no prompt or model keys', () => {
    const map = postProvenance(join(root, 'posts/notes.md'), join(root, 'transcripts/notes'))
    expect(map).toMatchObject({ aiShare: 0, aiWords: 0, prompts: [] })
    expect(map.spans).toEqual([
      { text: LEAD, origin: 'human' },
      { text: CLOSING, origin: 'human' },
    ])
  })
})
