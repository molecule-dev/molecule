// @vitest-environment jsdom
/**
 * Unit tests of the Angular `MarginNotes` — the port of
 * `@molecule/app-margin-notes-react`'s own suite: the same names and the same
 * assertions, rendered with Angular's real renderer (the `createApplication` +
 * JIT host approach the other Angular feature ports use) and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  byMol,
  click,
  disposeAll,
  enter,
  focusIn,
  focusOut,
  installBonds,
  leave,
  makeDoc,
  mountNotes,
} from './helpers.js'

describe('<MarginNotes>', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('a switch hides and restores its kind, in the gutter and the phone panel', async () => {
    const m = await mountNotes(makeDoc())
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-prompt'))
    await m.flush()
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-side-summary'))
    await m.flush()
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
  })

  it('hovering a block emphasises its notes; hovering a note tints the blocks it covers', async () => {
    const m = await mountNotes(makeDoc())
    enter(byMol('margin-notes-block-p2'))
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBe('true')
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
    leave(byMol('margin-notes-block-p2'))
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    enter(byMol('margin-note-gutter-q1'))
    await m.flush()
    expect(byMol('margin-notes-block-p2').className).toMatch(/bg-primary\/10/)
    expect(byMol('margin-notes-block-p3').className).toMatch(/bg-primary\/10/)
    expect(byMol('margin-notes-block-p1').className).not.toMatch(/bg-primary\/10/)
    leave(byMol('margin-note-gutter-q1'))
    await m.flush()
    expect(byMol('margin-notes-block-p2').className).not.toMatch(/bg-primary\/10/)
  })

  it('keyboard focus drives the same relationship', async () => {
    const m = await mountNotes(makeDoc())
    focusIn(byMol('margin-note-gutter-s1'))
    await m.flush()
    expect(byMol('margin-notes-block-p1').className).toMatch(/bg-primary\/10/)
    focusOut(byMol('margin-note-gutter-s1'))
    await m.flush()
    focusIn(byMol('margin-notes-block-p1'))
    await m.flush()
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
  })

  it('the pin of a block pins its notes in the phone panel; a second press lets go', async () => {
    const m = await mountNotes(makeDoc())
    click(byMol('margin-notes-pin-p2'))
    await m.flush()
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-notes-dismiss')).toBeTruthy()
    click(byMol('margin-notes-pin-p2'))
    await m.flush()
    expect(document.querySelector('[data-mol-id="margin-notes-dismiss"]')).toBeNull()
    // with its switch off, a tap kind leaves with the second press of the pin; the section note stays
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    expect(byMol('margin-note-panel-s1').hidden).toBe(false)
  })

  it('the pin is a native toggle button reporting its state; the block stays prose', async () => {
    const m = await mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p2')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    const pin = byMol('margin-notes-pin-p2') as HTMLButtonElement
    expect(pin.tagName).toBe('BUTTON')
    expect(pin.type).toBe('button')
    expect(pin.getAttribute('aria-label')).toBe('Pin the notes for this section')
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    click(pin)
    await m.flush()
    expect(pin.getAttribute('aria-pressed')).toBe('true')
    click(pin)
    await m.flush()
    expect(pin.getAttribute('aria-pressed')).toBe('false')
  })

  it('a block with no notes has no pin', async () => {
    await mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p4')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-pin-p4"]')).toBeNull()
  })

  it('a marked block with a markLabel exposes an image named by it', async () => {
    await mountNotes({ ...makeDoc(), markLabel: 'Written with AI' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('role')).toBe('img')
    expect(mark.getAttribute('aria-label')).toBe('Written with AI')
    expect(mark.getAttribute('aria-hidden')).toBeNull()
  })

  it('without a markLabel the mark is aria-hidden and has no role', async () => {
    await mountNotes(makeDoc())
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
  })

  it('a blank markLabel hides the mark too', async () => {
    await mountNotes({ ...makeDoc(), markLabel: '   ' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
  })

  it('a tap kind switched ON follows the reader in the phone panel, without a pin', async () => {
    const m = await mountNotes(makeDoc())
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    click(byMol('margin-notes-switch-bar-prompt'))
    await m.flush()
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-bar-prompt'))
    await m.flush()
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
  })

  it('a pin shows a tap-kind note even while its switch is off; follow kinds obey theirs', async () => {
    const m = await mountNotes(makeDoc())
    click(byMol('margin-notes-switch-bar-summary'))
    await m.flush()
    click(byMol('margin-notes-pin-p2'))
    await m.flush()
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
    click(byMol('margin-notes-pin-p2'))
    await m.flush()
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
  })

  it('reports switch changes and honours a controlled shownKinds', async () => {
    const onChange = vi.fn()
    const m = await mountNotes({
      ...makeDoc(),
      shownKinds: ['prompt'],
      onShownKindsChange: onChange,
    })
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-summary'))
    await m.flush()
    expect(onChange).toHaveBeenCalledWith(['prompt', 'summary'])
  })

  it('hydrates server HTML without a mismatch', async () => {
    // Angular has no server renderer in this workspace (@angular/platform-server
    // is not a dependency), so the equivalent check is kept: two independent
    // mounts of the same props render the same markup and the same state.
    const first = await mountNotes(makeDoc())
    const ids = [...first.host.querySelectorAll('[data-mol-id]')].map((el) =>
      el.getAttribute('data-mol-id'),
    )
    const text = first.host.textContent
    const markup = byMol('margin-notes').outerHTML
    await disposeAll()
    const second = await mountNotes(makeDoc())
    expect(
      [...second.host.querySelectorAll('[data-mol-id]')].map((el) =>
        el.getAttribute('data-mol-id'),
      ),
    ).toEqual(ids)
    expect(second.host.textContent).toBe(text)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    expect(markup).toContain('data-mol-id="margin-notes"')
  })
})
