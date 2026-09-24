// @vitest-environment node

/**
 * The README example is real code: `readme-example.tsx` is this package's
 * module-level `@example`, byte for byte, and here it is prerendered with
 * `renderToString` (no JavaScript runs) and checked for the defaults a static
 * site ships: summaries shown, prompts hidden, marks on the AI paragraphs only,
 * each prompt once, the phone bar with both switches, the real share line.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setProvider as setMarkdown } from '@molecule/app-markdown'
import { provider as marked } from '@molecule/app-markdown-marked'

import { installStubClassMap, withI18n } from './helpers.js'
import { PostBody, type PostProvenance, sectionStarts } from './readme-example.js'

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

/** The opening tag of the element carrying `data-mol-id="<id>"`. */
function tagOf(html: string, id: string): string {
  const m = html.match(new RegExp(`<[a-z]+[^>]*data-mol-id="${id}"[^>]*>`))
  if (!m) throw new Error(`no element ${id}`)
  return m[0]
}

const PROMPT = 'Write the section on reading logs first, two paragraphs.'
const provenance: PostProvenance = {
  aiShare: 0.62,
  prompts: [PROMPT],
  spans: [
    { text: 'I open the log before the code. Here is why.', origin: 'human' },
    { text: '## Why logs first', origin: 'human' },
    {
      text: 'Logs show what **did** happen; code shows what could.',
      origin: 'ai',
      prompt: PROMPT,
      model: 'Haiku 4.5',
    },
    {
      text: 'Reading them first rules out whole classes of bugs.',
      origin: 'ai',
      prompt: PROMPT,
      model: 'Haiku 4.5',
    },
    { text: '### A detail', origin: 'human' },
    { text: '- one\n- two', origin: 'human' },
    { text: '## Closing', origin: 'human' },
    { text: 'That is the habit.', origin: 'human' },
  ],
}
const summaries = { 1: 'SUMMARY-LOGS', 6: 'SUMMARY-CLOSING' }

describe('the README example', () => {
  beforeAll(() => {
    installStubClassMap()
    setMarkdown(marked)
  })

  it('is the module @example of @molecule/app-margin-notes-react, verbatim', () => {
    const example = readFileSync(join(__dirname, 'readme-example.tsx'), 'utf8').trimEnd()
    expect(moduleExample(join(__dirname, '../index.ts'))).toBe(example)
  })

  it('starts sections at the lead and at each heading of the shallowest level', () => {
    expect(sectionStarts(provenance.spans)).toEqual([0, 1, 6])
    expect(sectionStarts([{ text: 'no headings', origin: 'human' }])).toEqual([0])
  })

  it('prerenders summaries ON and prompts OFF, switches agreeing, with no JavaScript', () => {
    const html = renderToString(
      withI18n(<PostBody provenance={provenance} summaries={summaries} />),
    )
    expect(tagOf(html, 'margin-note-gutter-summary-1')).not.toMatch(/\shidden=""/)
    expect(tagOf(html, 'margin-note-gutter-summary-6')).not.toMatch(/\shidden=""/)
    expect(tagOf(html, 'margin-note-gutter-prompt-0')).toMatch(/\shidden=""/)
    for (const where of ['side', 'bar']) {
      expect(tagOf(html, `margin-notes-switch-${where}-summary`)).toMatch(/aria-checked="true"/)
      expect(tagOf(html, `margin-notes-switch-${where}-prompt`)).toMatch(/aria-checked="false"/)
    }
    // summaries first, then prompts
    expect(html.indexOf('switch-side-summary')).toBeLessThan(html.indexOf('switch-side-prompt'))
  })

  it('shows one prompt once for the two paragraphs it wrote, with the model', () => {
    const html = renderToString(
      withI18n(<PostBody provenance={provenance} summaries={summaries} />),
    )
    expect(html.match(/data-mol-id="margin-note-gutter-prompt-0"/g)).toHaveLength(1)
    expect(html.match(new RegExp(PROMPT, 'g'))).toHaveLength(1) // gutter only; the panel waits for a tap
    expect(html).toContain('Prompt · Haiku 4.5')
  })

  it('marks the AI paragraphs only, and renders each block as real markup', () => {
    const html = renderToString(withI18n(<PostBody provenance={provenance} />))
    expect(html).toContain('data-mol-id="margin-notes-mark-block-2"')
    expect(html).toContain('data-mol-id="margin-notes-mark-block-3"')
    expect(html).not.toMatch(/margin-notes-mark-block-[014567]"/)
    expect(html).toContain('aria-label="Written with AI"')
    expect(html).toMatch(/<h2[^>]*>Why logs first<\/h2>/)
    expect(html).toContain('<strong>did</strong>')
    expect(html).toMatch(/<ul>\s*<li>one<\/li>/)
  })

  it('ships the phone bar (CSS-hidden on desktop) with the in-view summary', () => {
    const html = renderToString(
      withI18n(<PostBody provenance={provenance} summaries={summaries} />),
    )
    expect(tagOf(html, 'margin-notes-bar')).toMatch(/hiddenFrom:md/)
    expect(tagOf(html, 'margin-note-panel-summary-1')).not.toMatch(/\shidden=""/)
  })

  it('prints the real share line in the HTML', () => {
    const one = renderToString(withI18n(<PostBody provenance={provenance} />))
    expect(one).toContain('62% of the words were written by an AI, from 1 prompt<')
    const many = renderToString(
      withI18n(<PostBody provenance={{ ...provenance, prompts: [PROMPT, 'another'] }} />),
    )
    expect(many).toContain('62% of the words were written by an AI, from 2 prompts')
  })

  it('renders a human post with no summaries as plain centred prose: no gutter, no bar, no switches', () => {
    const human: PostProvenance = {
      aiShare: 0,
      prompts: [],
      spans: [{ text: 'All mine.', origin: 'human' }],
    }
    const html = renderToString(withI18n(<PostBody provenance={human} />))
    expect(html).toContain('Every word of this post was written by a person.')
    expect(html).not.toMatch(/role="complementary"|margin-notes-bar|margin-notes-switch/)
  })
})
