// @vitest-environment jsdom
/**
 * The Angular markup that needs no interaction: each kind ships in its default
 * state, the desktop/phone split is CSS, and a document with no notes is plain
 * prose. Port of `@molecule/app-margin-notes-react`'s `ssr.test.tsx`.
 *
 * Angular has no server renderer in this workspace (`@angular/platform-server`
 * is not a dependency), so the same expectations are held against the FIRST
 * client render — the defaults below come from props, never from an effect.
 *
 * @module
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { byMol, disposeAll, installBonds, makeDoc, mountNotes } from './helpers.js'

describe('server-rendered HTML (no JavaScript)', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('ships each kind in its default state: summaries shown, prompts hidden', async () => {
    await mountNotes(makeDoc())
    expect(byMol('margin-note-gutter-s1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    // the switches say the same thing as the notes
    expect(byMol('margin-notes-switch-side-summary').getAttribute('aria-checked')).toBe('true')
    expect(byMol('margin-notes-switch-side-prompt').getAttribute('aria-checked')).toBe('false')
  })

  it('splits desktop and phone surfaces in CSS, not in script', async () => {
    await mountNotes(makeDoc())
    expect(byMol('margin-notes-bar').className).toMatch(/md:hidden/)
    const gutter = document.querySelector('[role="complementary"]')
    expect(gutter?.className).toMatch(/max-md:hidden/)
  })

  it('shows each note once, and the phone panel starts on the first annotated section', async () => {
    await mountNotes(makeDoc())
    expect(document.querySelectorAll('[data-mol-id="margin-note-gutter-q1"]')).toHaveLength(1)
    expect(byMol('margin-note-panel-s1').hidden).toBe(false)
  })

  it('renders a document with no notes as centred prose with no gutter and no bar', async () => {
    await mountNotes({ blocks: [{ id: 'p', content: 'Only prose.' }] })
    expect(document.querySelector('[role="complementary"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-bar"]')).toBeNull()
    expect(byMol('margin-notes').style.maxWidth).toBe('38rem')
  })

  it('draws the mark on marked blocks only', async () => {
    await mountNotes({ ...makeDoc(), markLabel: 'Written with AI' })
    expect(byMol('margin-notes-mark-p2').getAttribute('aria-label')).toBe('Written with AI')
    expect(document.querySelector('[data-mol-id="margin-notes-mark-p1"]')).toBeNull()
  })
})
