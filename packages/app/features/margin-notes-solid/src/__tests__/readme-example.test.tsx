// @vitest-environment jsdom
/**
 * The documented post body in Solid: a post's provenance plus its section
 * summaries, turned into blocks, notes and kinds the way the module `@example`
 * describes, then rendered and asserted on the markup. Port of
 * `@molecule/app-margin-notes-react`'s `readme-example` suites.
 *
 * The markdown rendering itself is the app's job, not this component's, so the
 * spans here are turned into real markup with a few JSX nodes instead of a
 * markdown bond.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { JSX } from 'solid-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from '../types.js'
import { byMol, click, disposeAll, i18nProvider, installBonds, mountNotes } from './helpers.jsx'

const here = dirname(fileURLToPath(import.meta.url))

/** One entry of `provenance.json`'s spans. */
interface PostSpan {
  text: string
  origin: 'human' | 'ai'
  prompt?: string
  model?: string
}

/** `provenance.json`, as the build wrote it. */
interface PostProvenance {
  aiShare: number
  prompts: string[]
  spans: PostSpan[]
}

/**
 * The span indexes that start a section: 0 (the lead), then every heading at
 * the post's shallowest heading level.
 *
 * @param spans - The provenance spans.
 * @returns The start indexes.
 */
function sectionStarts(spans: PostSpan[]): number[] {
  const level = (text: string): number => text.match(/^#{1,6}(?=\s)/)?.[0].length ?? 0
  const top = Math.min(...spans.map((span) => level(span.text) || 7))
  return spans.flatMap((span, i) => (i === 0 || level(span.text) === top ? [i] : []))
}

/**
 * One span as real markup: a heading, a list, or a paragraph with bold runs.
 *
 * @param text - The span's markdown-ish text.
 * @returns The block's content.
 */
function renderSpan(text: string): string | JSX.Element {
  if (text.startsWith('## ')) return <h2>{text.slice(3)}</h2>
  if (text.startsWith('### ')) return <h3>{text.slice(4)}</h3>
  if (text.startsWith('- '))
    return (
      <ul>
        {text.split('\n').map((line) => (
          <li>{line.replace(/^- /, '')}</li>
        ))}
      </ul>
    )
  const parts = text.split('**')
  return <p>{parts.map((part, i) => (i % 2 === 1 ? <strong>{part}</strong> : part))}</p>
}

/**
 * The post body's `<MarginNotes>` props, built from a provenance and its
 * per-section summaries (the module `@example`'s shape).
 *
 * @param provenance - The post's provenance.
 * @param summaries - TL;DR text per section start index.
 * @returns The props, with the share line the page prints above the body.
 */
function makePost(
  provenance: PostProvenance,
  summaries: Record<number, string> = {},
): MarginNotesProps & { share: string } {
  const starts = new Set(sectionStarts(provenance.spans))
  const notes: MarginNote[] = []
  const promptNoteIds = new Map<string, string>()
  let summaryId: string | undefined

  const blocks: MarginNotesBlock[] = provenance.spans.map((span, i) => {
    if (starts.has(i)) {
      summaryId = summaries[i] ? `summary-${i}` : undefined
      if (summaryId)
        notes.push({
          id: summaryId,
          kind: 'summary',
          content: (
            <>
              <p>{i18nProvider.t('post.tldr', undefined, { defaultValue: 'TL;DR' })}</p>
              <p>{summaries[i]}</p>
            </>
          ),
        })
    }
    const noteIds = summaryId ? [summaryId] : []
    if (span.origin === 'ai' && span.prompt) {
      let id = promptNoteIds.get(span.prompt)
      if (!id) {
        id = `prompt-${promptNoteIds.size}`
        promptNoteIds.set(span.prompt, id)
        notes.push({
          id,
          kind: 'prompt',
          content: (
            <>
              <p>
                {i18nProvider.t(
                  'post.promptBy',
                  { model: span.model ?? '' },
                  {
                    defaultValue: 'Prompt · {{model}}',
                  },
                )}
              </p>
              <p>{span.prompt}</p>
            </>
          ),
        })
      }
      noteIds.push(id)
    }
    return {
      id: `block-${i}`,
      content: renderSpan(span.text),
      noteIds,
      marked: span.origin === 'ai',
    }
  })

  const kinds: MarginNoteKind[] = [
    {
      id: 'summary',
      label: i18nProvider.t('post.summaries', undefined, { defaultValue: 'Summaries' }),
      defaultOn: true,
    },
    {
      id: 'prompt',
      label: i18nProvider.t('post.prompts', undefined, { defaultValue: 'Prompts' }),
      defaultOn: false,
      panel: 'tap',
    },
  ]
  const percent = Math.round(provenance.aiShare * 100)
  const count = provenance.prompts.length
  const share =
    count === 0
      ? i18nProvider.t('post.allHuman', undefined, {
          defaultValue: 'Every word of this post was written by a person.',
        })
      : i18nProvider.t(
          count === 1 ? 'post.aiShareOne' : 'post.aiShare',
          { percent, count },
          {
            defaultValue:
              count === 1
                ? '{{percent}}% of the words were written by an AI, from 1 prompt'
                : '{{percent}}% of the words were written by an AI, from {{count}} prompts',
          },
        )
  return {
    blocks,
    notes,
    kinds,
    markLabel: i18nProvider.t('post.aiWritten', undefined, { defaultValue: 'Written with AI' }),
    share,
  }
}

/** The prompt the example's two AI paragraphs share. */
const PROMPT = 'Write the section on reading logs first, two paragraphs.'
/** The example post. */
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
/** The example's summaries. */
const summaries = { 1: 'SUMMARY-LOGS', 6: 'SUMMARY-CLOSING' }

describe('the README example', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('is the module @example of @molecule/app-margin-notes-react, verbatim', () => {
    const source = readFileSync(join(here, '../index.ts'), 'utf8')
    const doc = source.slice(source.indexOf('/**'), source.indexOf('*/'))
    const lines = doc.split('\n').map((line) => line.replace(/^\s*\* ?/, ''))
    const open = lines.findIndex((line) => line.startsWith('```'))
    const close = lines.findIndex((line, i) => i > open && line.startsWith('```'))
    expect(open).toBeGreaterThan(-1)
    const example = lines.slice(open + 1, close).join('\n')
    // The port's own example: the same document shape through the Solid binding.
    expect(example).toContain("from '@molecule/app-margin-notes-solid'")
    expect(example).toContain('MarginNotes')
    expect(example).toContain('blocks')
    expect(example).toContain('notes')
    expect(example).toContain('kinds')
    expect(example).toContain('markLabel')
  })

  it('starts sections at the lead and at each heading of the shallowest level', () => {
    expect(sectionStarts(provenance.spans)).toEqual([0, 1, 6])
    expect(sectionStarts([{ text: 'no headings', origin: 'human' }])).toEqual([0])
  })

  it('prerenders summaries ON and prompts OFF, switches agreeing, with no JavaScript', () => {
    mountNotes(makePost(provenance, summaries))
    expect(byMol('margin-note-gutter-summary-1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-summary-6').hidden).toBe(false)
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(true)
    for (const where of ['side', 'bar']) {
      expect(byMol(`margin-notes-switch-${where}-summary`).getAttribute('aria-checked')).toBe(
        'true',
      )
      expect(byMol(`margin-notes-switch-${where}-prompt`).getAttribute('aria-checked')).toBe(
        'false',
      )
    }
    // summaries first, then prompts
    expect(
      byMol('margin-notes-switches-side').outerHTML.indexOf('switch-side-summary'),
    ).toBeLessThan(byMol('margin-notes-switches-side').outerHTML.indexOf('switch-side-prompt'))
  })

  it('shows one prompt once for the two paragraphs it wrote, with the model', () => {
    const host = mountNotes(makePost(provenance, summaries))
    expect(host.querySelectorAll('[data-mol-id="margin-note-gutter-prompt-0"]')).toHaveLength(1)
    expect(host.textContent?.split(PROMPT)).toHaveLength(2) // gutter only; the panel waits for a pin
    expect(host.textContent).toContain('Prompt · Haiku 4.5')
  })

  it('marks the AI paragraphs only, and renders each block as real markup', () => {
    const host = mountNotes(makePost(provenance))
    expect(byMol('margin-notes-mark-block-2')).toBeTruthy()
    expect(byMol('margin-notes-mark-block-3')).toBeTruthy()
    expect(document.querySelector('[data-mol-id="margin-notes-mark-block-0"]')).toBeNull()
    expect(byMol('margin-notes-mark-block-2').getAttribute('aria-label')).toBe('Written with AI')
    expect(host.querySelector('h2')?.textContent).toBe('Why logs first')
    expect(host.querySelector('strong')?.textContent).toBe('did')
    expect(host.querySelectorAll('ul li')).toHaveLength(2)
  })

  it('ships the phone bar (CSS-hidden on desktop) with the in-view summary', () => {
    mountNotes(makePost(provenance, summaries))
    expect(byMol('margin-notes-bar').className).toMatch(/md:hidden/)
    // The section at the reading line is the last one in view (jsdom geometry).
    expect(byMol('margin-note-panel-summary-6').hidden).toBe(false)
  })

  it('prints the real share line in the HTML', () => {
    expect(makePost(provenance).share).toContain(
      '62% of the words were written by an AI, from 1 prompt',
    )
    expect(makePost({ ...provenance, prompts: [PROMPT, 'another'] }).share).toContain(
      '62% of the words were written by an AI, from 2 prompts',
    )
  })

  it('renders a human post with no summaries as plain centred prose: no gutter, no bar, no switches', () => {
    const human: PostProvenance = {
      aiShare: 0,
      prompts: [],
      spans: [{ text: 'All mine.', origin: 'human' }],
    }
    const post = makePost(human)
    mountNotes(post)
    expect(post.share).toContain('Every word of this post was written by a person.')
    expect(document.querySelector('[role="complementary"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-bar"]')).toBeNull()
    expect(document.querySelector('[data-mol-id^="margin-notes-switch"]')).toBeNull()
  })
})

describe('the README example, interactive', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('the Prompts switch reveals and hides the prompt; the Summaries switch hides the TL;DR', () => {
    mountNotes(makePost(provenance, { 0: 'SUMMARY' }))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(false)
    click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(true)
    expect(byMol('margin-note-gutter-summary-0').hidden).toBe(false)
    click(byMol('margin-notes-switch-side-summary'))
    expect(byMol('margin-note-gutter-summary-0').hidden).toBe(true)
  })

  it('pinning an AI paragraph shows its prompt in the phone panel (Prompts still off); pressing again lets go', () => {
    mountNotes(makePost(provenance))
    const panel = byMol('margin-notes-panel')
    expect(panel.textContent).not.toContain(PROMPT)
    expect(byMol('margin-notes-switch-bar-prompt').getAttribute('aria-checked')).toBe('false')
    click(byMol('margin-notes-pin-block-2'))
    expect(panel.textContent).toContain(PROMPT)
    click(byMol('margin-notes-pin-block-2'))
    expect(panel.textContent).not.toContain(PROMPT)
  })
})
