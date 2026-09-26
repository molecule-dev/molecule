import { describe, expect, it } from 'vitest'

import { escapeHtml, renderMarginNotes } from '../render.js'
import type { MarginNoteKind, RenderMarginNotesOptions } from '../types.js'

const kinds: MarginNoteKind[] = [
  { id: 'summary', label: 'Summaries', defaultOn: true },
  { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
]

const post: RenderMarginNotesOptions = {
  blocks: [
    { id: 'b0', html: '<p>Lead.</p>', noteIds: ['s0'] },
    { id: 'b1', html: '<h2>One</h2>', noteIds: ['s1'] },
    { id: 'b2', html: '<p>AI text.</p>', noteIds: ['s1', 'p0'], marked: true },
    { id: 'b3', html: '<p>Plain.</p>' },
  ],
  notes: [
    { id: 's0', kind: 'summary', label: 'TL;DR', html: '<p>The lead.</p>' },
    { id: 's1', kind: 'summary', label: 'TL;DR', html: '<p>Section one.</p>' },
    { id: 'p0', kind: 'prompt', label: 'Prompt · model-x', html: '<p>write it</p>' },
  ],
  kinds,
  markLabel: 'Written with AI',
}

const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html')

describe('renderMarginNotes', () => {
  it('ships the defaults in the HTML: summaries shown, prompts hidden, switches reading so', () => {
    const { html, switchesHtml, hasNotes } = renderMarginNotes(post)
    expect(hasNotes).toBe(true)
    const doc = parse(html + switchesHtml)
    const gutter = (id: string) =>
      doc.querySelector(`[data-mn-where="gutter"][data-mn-note="${id}"]`)
    expect(gutter('s0')?.hasAttribute('hidden')).toBe(false)
    expect(gutter('p0')?.hasAttribute('hidden')).toBe(true)
    const sw = (placement: string, kind: string) =>
      doc.querySelector(`[data-mn-switches="${placement}"] [data-mn-kind="${kind}"]`)
    for (const placement of ['side', 'bar']) {
      expect(sw(placement, 'summary')?.getAttribute('aria-checked')).toBe('true')
      expect(sw(placement, 'prompt')?.getAttribute('aria-checked')).toBe('false')
      expect(sw(placement, 'summary')?.getAttribute('role')).toBe('switch')
    }
    // Switches come in kinds order: summaries first.
    const order = [...doc.querySelectorAll('[data-mn-switches="side"] [data-mn-switch]')].map((s) =>
      s.getAttribute('data-mn-kind'),
    )
    expect(order).toEqual(['summary', 'prompt'])
  })

  it('places each note once, beside the first row that refers to it', () => {
    const doc = parse(renderMarginNotes(post).html)
    const inGutter = [...doc.querySelectorAll('[data-mn-where="gutter"]')].map((n) =>
      n.getAttribute('data-mn-note'),
    )
    expect(inGutter).toEqual(['s0', 's1', 's1', 'p0'].filter((v, i, a) => a.indexOf(v) === i))
    const rows = [...doc.querySelectorAll('[data-mn-row]')].map((r) =>
      r.getAttribute('data-mn-row'),
    )
    // b2 is in b1's section (both refer to s1): one row, so s1 stays pinned
    // through the whole section and p0 joins its gutter.
    expect(rows).toEqual(['b0', 'b1', 'b3'])
  })

  it('keeps a section in one row while its summary covers it, prompts changing or not', () => {
    const doc = parse(
      renderMarginNotes({
        blocks: [
          { id: 'h', html: '<h2>S</h2>', noteIds: ['s'] },
          { id: 'a', html: '<p>a</p>', noteIds: ['s', 'p1'] },
          { id: 'b', html: '<p>b</p>', noteIds: ['s', 'p2'] },
          { id: 'c', html: '<p>c</p>', noteIds: ['s'] },
          { id: 'n', html: '<h2>Next</h2>', noteIds: ['t'] },
        ],
        notes: [
          { id: 's', kind: 'summary', label: 'TL;DR', html: '<p>s</p>' },
          { id: 't', kind: 'summary', label: 'TL;DR', html: '<p>t</p>' },
          { id: 'p1', kind: 'prompt', label: 'Prompt', html: '<p>1</p>' },
          { id: 'p2', kind: 'prompt', label: 'Prompt', html: '<p>2</p>' },
        ],
        kinds,
      }).html,
    )
    const rows = [...doc.querySelectorAll('[data-mn-row]')]
    expect(rows.map((r) => r.getAttribute('data-mn-row'))).toEqual(['h', 'n'])
    const first = [...rows[0].querySelectorAll('[data-mn-where="gutter"]')].map((n) =>
      n.getAttribute('data-mn-note'),
    )
    expect(first).toEqual(['s', 'p1', 'p2'])
    expect(rows[0].querySelectorAll('[data-mn-block]')).toHaveLength(4)
  })

  it('the phone panel starts on the lead section, with only the kinds that follow and are on', () => {
    const doc = parse(renderMarginNotes(post).html)
    const panel = doc.querySelector('[data-mn-panel]')!
    const visible = [...panel.querySelectorAll('[data-mn-note]:not([hidden])')].map((n) =>
      n.getAttribute('data-mn-note'),
    )
    expect(visible).toEqual(['s0'])
    expect(panel.hasAttribute('data-mn-open')).toBe(true)
  })

  it('a page with no notes has no gutter, no bar and no switches', () => {
    const { html, switchesHtml, hasNotes } = renderMarginNotes({
      blocks: [{ id: 'b0', html: '<p>Only prose.</p>' }],
      kinds,
    })
    expect(hasNotes).toBe(false)
    expect(switchesHtml).toBe('')
    const doc = parse(html)
    expect(doc.querySelector('[data-mn-gutter]')).toBeNull()
    expect(doc.querySelector('[data-mn-bar]')).toBeNull()
    expect(doc.querySelector('[data-mn-root]')?.hasAttribute('data-mn-has-notes')).toBe(false)
  })

  it('marks marked blocks, gives kinds distinct accents, escapes plain text', () => {
    const { html } = renderMarginNotes({
      ...post,
      notes: [...post.notes!, { id: 'x', kind: 'summary', label: '<b>&', html: '<p>ok</p>' }],
      blocks: [...post.blocks, { id: 'b4', html: '<p>x</p>', noteIds: ['x'] }],
    })
    const doc = parse(html)
    expect(doc.querySelector('#b2 [data-mn-mark]')?.getAttribute('aria-label')).toBe(
      'Written with AI',
    )
    expect(doc.querySelector('#b3 [data-mn-mark]')).toBeNull()
    const accent = (id: string) =>
      (
        doc.querySelector(`[data-mn-where="gutter"][data-mn-note="${id}"]`) as HTMLElement
      ).style.getPropertyValue('--mn-note-accent')
    expect(accent('s0')).not.toBe(accent('p0'))
    expect(html).toContain('&lt;b&gt;&amp;')
    expect(escapeHtml(`"'<>&`)).toBe('&quot;&#39;&lt;&gt;&amp;')
  })
})
