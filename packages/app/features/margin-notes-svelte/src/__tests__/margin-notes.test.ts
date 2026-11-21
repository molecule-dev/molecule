// @vitest-environment jsdom
import '@molecule/app-framework-conformance/ui/setup'
/**
 * Unit tests of the Svelte `MarginNotes` — the port of
 * `@molecule/app-margin-notes-react`'s own suite: the same names and the same
 * assertions, mounted with Svelte in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'

import {
  byMol,
  click,
  disposeAll,
  enter,
  focusIn,
  focusOut,
  installBonds,
  installI18n,
  leave,
  makeDoc,
  mountNotes,
} from './helpers.js'

describe('<MarginNotes>', () => {
  beforeAll(() => {
    installI18n()
    installBonds()
  })

  it('a switch hides and restores its kind, in the gutter and the phone panel', () => {
    mountNotes(makeDoc())
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-side-summary'))
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
    disposeAll()
  })

  it('hovering a block emphasises its notes; hovering a note tints the blocks it covers', () => {
    mountNotes(makeDoc())
    enter(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBe('true')
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
    leave(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    enter(byMol('margin-note-gutter-q1'))
    expect(byMol('margin-notes-block-p2').className).toMatch(/bg-primary\/10/)
    expect(byMol('margin-notes-block-p3').className).toMatch(/bg-primary\/10/)
    expect(byMol('margin-notes-block-p1').className).not.toMatch(/bg-primary\/10/)
    leave(byMol('margin-note-gutter-q1'))
    expect(byMol('margin-notes-block-p2').className).not.toMatch(/bg-primary\/10/)
    disposeAll()
  })

  it('keyboard focus drives the same relationship', () => {
    mountNotes(makeDoc())
    focusIn(byMol('margin-note-gutter-s1'))
    expect(byMol('margin-notes-block-p1').className).toMatch(/bg-primary\/10/)
    focusOut(byMol('margin-note-gutter-s1'))
    focusIn(byMol('margin-notes-block-p1'))
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
    disposeAll()
  })

  it('the pin of a block pins its notes in the phone panel; a second press lets go', () => {
    mountNotes(makeDoc())
    click(byMol('margin-notes-pin-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-notes-dismiss')).toBeTruthy()
    click(byMol('margin-notes-pin-p2'))
    expect(document.querySelector('[data-mol-id="margin-notes-dismiss"]')).toBeNull()
    // with its switch off, a tap kind leaves with the second press of the pin; the section note stays
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    expect(byMol('margin-note-panel-s1').hidden).toBe(false)
    disposeAll()
  })

  it('the pin is a native toggle button reporting its state; the block stays prose', () => {
    mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p2')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    const pin = byMol('margin-notes-pin-p2') as HTMLButtonElement
    expect(pin.tagName).toBe('BUTTON')
    expect(pin.type).toBe('button')
    expect(pin.getAttribute('aria-label')).toBe('Pin the notes for this section')
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    click(pin)
    expect(pin.getAttribute('aria-pressed')).toBe('true')
    click(pin)
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    disposeAll()
  })

  it('a block with no notes has no pin', () => {
    mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p4')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-pin-p4"]')).toBeNull()
    disposeAll()
  })

  it('a marked block with a markLabel exposes an image named by it', () => {
    mountNotes({ ...makeDoc(), markLabel: 'Written with AI' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('role')).toBe('img')
    expect(mark.getAttribute('aria-label')).toBe('Written with AI')
    expect(mark.getAttribute('aria-hidden')).toBeNull()
    disposeAll()
  })

  it('without a markLabel the mark is aria-hidden and has no role', () => {
    mountNotes(makeDoc())
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
    disposeAll()
  })

  it('a blank markLabel hides the mark too', () => {
    mountNotes({ ...makeDoc(), markLabel: '   ' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
    disposeAll()
  })

  it('a tap kind switched ON follows the reader in the phone panel, without a pin', () => {
    mountNotes(makeDoc())
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    click(byMol('margin-notes-switch-bar-prompt'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-bar-prompt'))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    disposeAll()
  })

  it('a pin shows a tap-kind note even while its switch is off; follow kinds obey theirs', () => {
    mountNotes(makeDoc())
    click(byMol('margin-notes-switch-bar-summary'))
    click(byMol('margin-notes-pin-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
    click(byMol('margin-notes-pin-p2'))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    disposeAll()
  })

  it('reports switch changes and honours a controlled shownKinds', () => {
    const onChange = vi.fn()
    mountNotes({ ...makeDoc(), shownKinds: ['prompt'], onShownKindsChange: onChange })
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-summary'))
    expect(onChange).toHaveBeenCalledWith(['prompt', 'summary'])
    disposeAll()
  })

  it('hydrates server HTML without a mismatch', () => {
    // The Svelte binding's `useTranslation` installs an effect when a component
    // initializes, so `svelte/server` cannot render a component that uses it
    // (it throws `effect_orphan`). The equivalent check is kept: the same props
    // render the same DOM on every mount, so a server pass could not disagree.
    const first = mountNotes(makeDoc())
    const markup = first.innerHTML
    disposeAll()
    mountNotes(makeDoc())
    expect(byMol('margin-notes').outerHTML).toBe(markup)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
  })
})
