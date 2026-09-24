// @vitest-environment node

import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { MarginNotes } from '../MarginNotes.js'
import { doc, installStubClassMap, withI18n } from './helpers.js'

/** The HTML attributes of the element carrying `data-mol-id="<id>"`. */
function tagOf(html: string, id: string): string {
  const m = html.match(new RegExp(`<[a-z]+[^>]*data-mol-id="${id}"[^>]*>`))
  if (!m) throw new Error(`no element ${id}`)
  return m[0]
}

describe('server-rendered HTML (no JavaScript)', () => {
  beforeAll(installStubClassMap)

  it('ships each kind in its default state: summaries shown, prompts hidden', () => {
    const html = renderToString(withI18n(<MarginNotes {...doc} />))
    expect(tagOf(html, 'margin-note-gutter-s1')).not.toMatch(/\shidden=""/)
    expect(tagOf(html, 'margin-note-gutter-q1')).toMatch(/\shidden=""/)
    // the switches say the same thing as the notes
    expect(tagOf(html, 'margin-notes-switch-side-summary')).toMatch(/aria-checked="true"/)
    expect(tagOf(html, 'margin-notes-switch-side-prompt')).toMatch(/aria-checked="false"/)
  })

  it('splits desktop and phone surfaces in CSS, not in script', () => {
    const html = renderToString(withI18n(<MarginNotes {...doc} />))
    expect(tagOf(html, 'margin-notes-bar')).toMatch(/hiddenFrom:md/)
    expect(html).toMatch(
      /hiddenBelow:md[^"]*"[^>]*role="complementary"|role="complementary"[^>]*hiddenBelow:md/,
    )
  })

  it('shows each note once, and the phone panel starts on the first annotated section', () => {
    const html = renderToString(withI18n(<MarginNotes {...doc} />))
    expect(html.match(/data-mol-id="margin-note-gutter-q1"/g)).toHaveLength(1)
    expect(tagOf(html, 'margin-note-panel-s1')).not.toMatch(/\shidden=""/)
  })

  it('renders a document with no notes as centred prose with no gutter and no bar', () => {
    const html = renderToString(
      withI18n(<MarginNotes blocks={[{ id: 'p', content: <p>Only prose.</p> }]} />),
    )
    expect(html).not.toMatch(/role="complementary"/)
    expect(html).not.toMatch(/margin-notes-bar/)
    expect(tagOf(html, 'margin-notes')).toMatch(/max-width:38rem/)
  })

  it('draws the mark on marked blocks only', () => {
    const html = renderToString(withI18n(<MarginNotes {...doc} markLabel="Written with AI" />))
    expect(html).toMatch(
      /data-mol-id="margin-notes-mark-p2"[^>]*|aria-label="Written with AI"[^>]*data-mol-id="margin-notes-mark-p2"/,
    )
    expect(html).not.toMatch(/margin-notes-mark-p1/)
  })
})
