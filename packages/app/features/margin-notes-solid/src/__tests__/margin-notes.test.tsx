// @vitest-environment jsdom
/**
 * Unit tests of the Solid `MarginNotes` — the port of
 * `@molecule/app-margin-notes-react`'s own suite: the same names and the same
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  byMol,
  byTestId,
  click,
  disposeAll,
  enter,
  focusIn,
  focusOut,
  installBonds,
  leave,
  makeDoc,
  makeSections,
  mountNotes,
} from './helpers.jsx'

/** The notes column of a row: the element React's own test reads the offset from. */
const gutterOf = (rowId: string): HTMLElement =>
  byMol(`margin-notes-row-${rowId}`).querySelector<HTMLElement>('[role="complementary"]')!

describe('<MarginNotes>', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('aligns each gutter to the content in its own registered block when IDs repeat', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      const top = this.tagName === 'P' ? (this.textContent === 'First heading' ? 32 : 56) : 12
      return new DOMRect(0, top, 200, 20)
    })
    const notes = [{ id: 'shared-note', kind: 'summary', content: 'Side note' }]
    const block = (heading: string) => ({
      id: 'heading',
      content: <p>{heading}</p>,
      noteIds: ['shared-note'],
    })
    try {
      const first = mountNotes({ blocks: [block('First heading')], notes })
      const second = mountNotes({ blocks: [block('Second heading')], notes })
      first.dataset.testid = 'first-document'
      second.dataset.testid = 'second-document'
      const offset = (documentId: string) =>
        byTestId(documentId).querySelector<HTMLElement>('[role="complementary"]')?.style.paddingTop
      expect(offset('first-document')).toBe('20px')
      expect(offset('second-document')).toBe('44px')
    } finally {
      rect.mockRestore()
    }
  })

  it('the section being read follows a scroll inside a nested scroller', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    let scrolled = false
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      const row = this.dataset.molId?.startsWith('margin-notes-row-')
      return new DOMRect(0, row && scrolled ? 10 : 1000, 200, 20)
    })
    try {
      const scroller = mountNotes(makeSections())
      expect(byMol('margin-note-panel-s1').hidden).toBe(false)
      scrolled = true
      // A scroll event does not bubble: only a listener on the capture path sees a scroller's.
      scroller.dispatchEvent(new Event('scroll'))
      expect(document.querySelector('[data-mol-id="margin-note-panel-s2"]')).toBeNull()
      vi.advanceTimersToNextFrame()
      expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
      expect(byMol('margin-note-panel-s2').hidden).toBe(false)
    } finally {
      rect.mockRestore()
      vi.useRealTimers()
    }
  })

  it('a resize realigns the notes on the next animation frame', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    let headingTop = 32
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.tagName === 'H2' ? headingTop : 12, 200, 20)
    })
    try {
      mountNotes(makeSections())
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      headingTop = 56
      window.dispatchEvent(new Event('resize'))
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      vi.advanceTimersToNextFrame()
      expect(gutterOf('h1').style.paddingTop).toBe('44px')
    } finally {
      rect.mockRestore()
      vi.useRealTimers()
    }
  })

  it('a touch does not hover: a tap on a block or a note leaves the emphasis alone', () => {
    mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p2')
    // A tap enters and leaves as a touch pointer, then as the mouse event the browser makes of it.
    block.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    block.dispatchEvent(new MouseEvent('mouseenter'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()
    block.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }))
    block.dispatchEvent(new MouseEvent('mouseleave'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    const note = byMol('margin-note-gutter-s1')
    note.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    note.dispatchEvent(new MouseEvent('mouseenter'))
    expect(byMol('margin-notes-block-p1').className).not.toMatch(/bg-primary\/10/)
  })

  it('a pointer entering or leaving drives the hover relationship too', () => {
    mountNotes(makeDoc())
    byMol('margin-notes-block-p2').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    )
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBe('true')
    byMol('margin-notes-block-p2').dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse' }),
    )
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    byMol('margin-note-gutter-s1').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'pen' }),
    )
    expect(byMol('margin-notes-block-p1').className).toMatch(/bg-primary\/10/)
  })

  it('a webStyle paints the outer wrapper after its style', () => {
    mountNotes({
      ...makeDoc(),
      style: { width: '50%' },
      webStyle: { borderColor: 'red', maxWidth: '10px' },
    })
    mountNotes(makeDoc())
    const roots = document.querySelectorAll<HTMLElement>('[data-mol-id="margin-notes"]')
    const [styled, plain] = roots
    expect(styled.style.width).toBe('50%')
    expect(styled.style.borderColor).toBe('red')
    expect(plain.style.borderColor).toBe('')
    // The measure the layout computes still wins, as it does over `style`.
    expect(styled.style.maxWidth).toBe(plain.style.maxWidth)
    expect(styled.style.maxWidth).not.toBe('10px')
    expect(styled.hasAttribute('webstyle')).toBe(false)
  })

  it('a coverImage in the style paints the image behind the wrapper', () => {
    mountNotes({
      ...makeDoc(),
      style: { width: '50%', coverImage: '/cover.png' },
      webStyle: { borderColor: 'red' },
    })
    mountNotes({ ...makeDoc(), style: { width: '50%', coverImage: '' } })
    const roots = document.querySelectorAll<HTMLElement>('[data-mol-id="margin-notes"]')
    const [image, empty] = roots
    expect(image.style.backgroundImage).toBe('url("/cover.png")')
    expect(image.style.backgroundSize).toBe('cover')
    expect(image.style.backgroundPosition).toMatch(/^center( center)?$/)
    // Where the key stood: after `width`, before the web-only paint and the layout's own width.
    const css = image.getAttribute('style') ?? ''
    expect(css.indexOf('background-image')).toBeGreaterThan(css.indexOf('width'))
    expect(css.indexOf('border-color')).toBeGreaterThan(css.indexOf('background-position'))
    expect(css.indexOf('max-width')).toBeGreaterThan(css.indexOf('border-color'))
    // An empty URI paints no image, and still sizes and centres the background.
    expect(empty.style.backgroundImage).toBe('')
    expect(empty.style.backgroundSize).toBe('cover')
  })

  it('a switch hides and restores its kind, in the gutter and the phone panel', () => {
    mountNotes(makeDoc())
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-side-summary'))
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
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
  })

  it('keyboard focus drives the same relationship', () => {
    mountNotes(makeDoc())
    focusIn(byMol('margin-note-gutter-s1'))
    expect(byMol('margin-notes-block-p1').className).toMatch(/bg-primary\/10/)
    focusOut(byMol('margin-note-gutter-s1'))
    focusIn(byMol('margin-notes-block-p1'))
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
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
  })

  it('a block with no notes has no pin', () => {
    mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p4')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-pin-p4"]')).toBeNull()
  })

  it('a marked block with a markLabel exposes an image named by it', () => {
    mountNotes({ ...makeDoc(), markLabel: 'Written with AI' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('role')).toBe('img')
    expect(mark.getAttribute('aria-label')).toBe('Written with AI')
    expect(mark.getAttribute('aria-hidden')).toBeNull()
  })

  it('without a markLabel the mark is aria-hidden and has no role', () => {
    mountNotes(makeDoc())
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
  })

  it('a blank markLabel hides the mark too', () => {
    mountNotes({ ...makeDoc(), markLabel: '   ' })
    const mark = byMol('margin-notes-mark-p2')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBeNull()
    expect(mark.getAttribute('aria-label')).toBeNull()
  })

  it('a tap kind switched ON follows the reader in the phone panel, without a pin', () => {
    mountNotes(makeDoc())
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    click(byMol('margin-notes-switch-bar-prompt'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    click(byMol('margin-notes-switch-bar-prompt'))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
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
  })

  it('reports switch changes and honours a controlled shownKinds', () => {
    const onChange = vi.fn()
    mountNotes({ ...makeDoc(), shownKinds: ['prompt'], onShownKindsChange: onChange })
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    click(byMol('margin-notes-switch-side-summary'))
    expect(onChange).toHaveBeenCalledWith(['prompt', 'summary'])
  })

  it('hydrates server HTML without a mismatch', () => {
    // Solid's client build cannot produce server HTML under this package's
    // test conditions (`renderToString` throws on the browser build), so the
    // equivalent check is kept: the same props render the same DOM on every
    // mount (no per-render state that a server pass could disagree with).
    const first = mountNotes(makeDoc())
    const markup = first.innerHTML
    disposeAll()
    mountNotes(makeDoc())
    expect(byMol('margin-notes').outerHTML).toBe(markup)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
  })
})
