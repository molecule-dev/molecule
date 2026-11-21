// @vitest-environment node
/**
 * The Vue HTML that needs no JavaScript: server-rendered markup must already
 * ship each kind in its default state, the desktop/phone split must be CSS, and
 * a document with no notes must be plain prose. Port of
 * `@molecule/app-margin-notes-react`'s `ssr.test.tsx`.
 *
 * @module
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { h } from 'vue'

import { MarginNotes } from '../MarginNotes.js'
import { installStubClassMap, installStubIcons, makeDoc, renderHtml } from './helpers.js'

/**
 * The opening tag of the element carrying `data-mol-id="<id>"`.
 *
 * @param html - The rendered HTML.
 * @param id - The `data-mol-id` value.
 * @returns The opening tag.
 */
function tagOf(html: string, id: string): string {
  const m = html.match(new RegExp(`<[a-z]+[^>]*data-mol-id="${id}"[^>]*>`))
  if (!m) throw new Error(`no element ${id}`)
  return m[0]
}

describe('server-rendered HTML (no JavaScript)', () => {
  beforeAll(() => {
    installStubClassMap()
    installStubIcons()
  })

  it('ships each kind in its default state: summaries shown, prompts hidden', async () => {
    const html = await renderHtml(() => h(MarginNotes, makeDoc()))
    expect(tagOf(html, 'margin-note-gutter-s1')).not.toMatch(/\shidden\b/)
    expect(tagOf(html, 'margin-note-gutter-q1')).toMatch(/\shidden\b/)
    // the switches say the same thing as the notes
    expect(tagOf(html, 'margin-notes-switch-side-summary')).toMatch(/aria-checked="true"/)
    expect(tagOf(html, 'margin-notes-switch-side-prompt')).toMatch(/aria-checked="false"/)
  })

  it('splits desktop and phone surfaces in CSS, not in script', async () => {
    const html = await renderHtml(() => h(MarginNotes, makeDoc()))
    expect(tagOf(html, 'margin-notes-bar')).toMatch(/md:hidden/)
    expect(html).toMatch(
      /max-md:hidden[^"]*"[^>]*role="complementary"|role="complementary"[^>]*max-md:hidden/,
    )
  })

  it('shows each note once, and the phone panel starts on the first annotated section', async () => {
    const html = await renderHtml(() => h(MarginNotes, makeDoc()))
    expect(html.match(/data-mol-id="margin-note-gutter-q1"/g)).toHaveLength(1)
    expect(tagOf(html, 'margin-note-panel-s1')).not.toMatch(/\shidden\b/)
  })

  it('renders a document with no notes as centred prose with no gutter and no bar', async () => {
    const html = await renderHtml(() =>
      h(MarginNotes, { blocks: [{ id: 'p', content: h('p', 'Only prose.') }] }),
    )
    expect(html).not.toMatch(/role="complementary"/)
    expect(html).not.toMatch(/margin-notes-bar/)
    expect(tagOf(html, 'margin-notes')).toMatch(/max-width:\s*38rem/)
  })

  it('draws the mark on marked blocks only', async () => {
    const html = await renderHtml(() =>
      h(MarginNotes, { ...makeDoc(), markLabel: 'Written with AI' }),
    )
    expect(html).toMatch(
      /data-mol-id="margin-notes-mark-p2"[^>]*|aria-label="Written with AI"[^>]*data-mol-id="margin-notes-mark-p2"/,
    )
    expect(html).not.toMatch(/margin-notes-mark-p1/)
  })
})
