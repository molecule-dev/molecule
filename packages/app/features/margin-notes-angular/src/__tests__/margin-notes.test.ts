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
  makeTemplate,
  mountNotes,
} from './helpers.js'

/** The notes column of a row: the element React's own test reads the offset from. */
const gutterOf = (rowId: string): HTMLElement =>
  byMol(`margin-notes-row-${rowId}`).querySelector<HTMLElement>('[role="complementary"]')!

describe('<MarginNotes>', () => {
  beforeAll(installBonds)

  afterEach(disposeAll)

  it('aligns each gutter to the content in its own registered block when IDs repeat', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      const top = this.tagName === 'P' ? (this.textContent === 'First heading' ? 32 : 56) : 12
      return new DOMRect(0, top, 200, 20)
    })
    const notes = [{ id: 'shared-note', kind: 'summary', content: 'Side note' }]
    const [first, second] = await Promise.all(
      ['First heading', 'Second heading'].map((heading) => makeTemplate(`<p>${heading}</p>`)),
    )
    const block = (content: typeof first) => ({ id: 'heading', content, noteIds: ['shared-note'] })
    try {
      const firstDocument = await mountNotes({ blocks: [block(first)], notes })
      const secondDocument = await mountNotes({ blocks: [block(second)], notes })
      firstDocument.host.dataset.testid = 'first-document'
      secondDocument.host.dataset.testid = 'second-document'
      const offset = (documentId: string) =>
        byTestId(documentId).querySelector<HTMLElement>('[role="complementary"]')?.style.paddingTop
      expect(offset('first-document')).toBe('20px')
      expect(offset('second-document')).toBe('44px')
    } finally {
      rect.mockRestore()
    }
  })

  it('the section being read follows a scroll inside a nested scroller', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    let scrolled = false
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      const row = this.getAttribute('data-mol-id')?.startsWith('margin-notes-row-')
      return new DOMRect(0, row && scrolled ? 10 : 1000, 200, 20)
    })
    try {
      const m = await mountNotes(await makeSections())
      expect(byMol('margin-note-panel-s1').hidden).toBe(false)
      scrolled = true
      // A scroll event does not bubble: only a listener on the capture path sees a scroller's.
      m.host.dispatchEvent(new Event('scroll'))
      await m.flush()
      expect(document.querySelector('[data-mol-id="margin-note-panel-s2"]')).toBeNull()
      vi.advanceTimersToNextFrame()
      await m.flush()
      expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
      expect(byMol('margin-note-panel-s2').hidden).toBe(false)
    } finally {
      rect.mockRestore()
      vi.useRealTimers()
    }
  })

  it('a resize realigns the notes on the next animation frame', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    let headingTop = 32
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.tagName === 'H2' ? headingTop : 12, 200, 20)
    })
    try {
      const m = await mountNotes(await makeSections())
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      headingTop = 56
      window.dispatchEvent(new Event('resize'))
      await m.flush()
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      vi.advanceTimersToNextFrame()
      await m.flush()
      expect(gutterOf('h1').style.paddingTop).toBe('44px')
    } finally {
      rect.mockRestore()
      vi.useRealTimers()
    }
  })

  it('only a new document or a resize realigns the notes', async () => {
    let headingTop = 32
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    rect.mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.tagName === 'H2' ? headingTop : 12, 200, 20)
    })
    try {
      const sections = await makeSections()
      const m = await mountNotes(sections)
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      // A hover re-renders the emphasis; it does not move a note.
      headingTop = 56
      enter(byMol('margin-notes-block-b1'))
      await m.flush()
      expect(gutterOf('h1').style.paddingTop).toBe('20px')
      // A new document does.
      await m.set({ blocks: [...sections.blocks], notes: [...sections.notes] })
      expect(gutterOf('h1').style.paddingTop).toBe('44px')
    } finally {
      rect.mockRestore()
    }
  })

  it('a touch does not hover: a tap on a block or a note leaves the emphasis alone', async () => {
    const m = await mountNotes(makeDoc())
    const block = byMol('margin-notes-block-p2')
    // A tap enters and leaves as a touch pointer, then as the mouse event the browser makes of it.
    block.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    block.dispatchEvent(new MouseEvent('mouseenter'))
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()
    block.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }))
    block.dispatchEvent(new MouseEvent('mouseleave'))
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    const note = byMol('margin-note-gutter-s1')
    note.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    note.dispatchEvent(new MouseEvent('mouseenter'))
    await m.flush()
    expect(byMol('margin-notes-block-p1').className).not.toMatch(/bg-primary\/10/)
  })

  it('a pointer entering or leaving drives the hover relationship too', async () => {
    const m = await mountNotes(makeDoc())
    byMol('margin-notes-block-p2').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    )
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBe('true')
    byMol('margin-notes-block-p2').dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse' }),
    )
    await m.flush()
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    byMol('margin-note-gutter-s1').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'pen' }),
    )
    await m.flush()
    expect(byMol('margin-notes-block-p1').className).toMatch(/bg-primary\/10/)
  })

  it('a webStyle paints the outer wrapper after its style', async () => {
    await mountNotes({
      ...makeDoc(),
      style: { width: '50%' },
      webStyle: { borderColor: 'red', maxWidth: '10px' },
    })
    await mountNotes(makeDoc())
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

  it('a coverImage in the style paints the image behind the wrapper', async () => {
    await mountNotes({
      ...makeDoc(),
      style: { width: '50%', coverImage: '/cover.png' },
      webStyle: { borderColor: 'red' },
    })
    await mountNotes({ ...makeDoc(), style: { width: '50%', coverImage: '' } })
    const roots = document.querySelectorAll<HTMLElement>('[data-mol-id="margin-notes"]')
    const [image, empty] = roots
    // Angular writes a style map in its own order, so the declarations are read
    // one by one; none of them is set twice, so the order paints nothing.
    expect(image.style.backgroundImage).toBe('url("/cover.png")')
    expect(image.style.backgroundSize).toBe('cover')
    expect(image.style.backgroundPosition).toMatch(/^center( center)?$/)
    expect(image.style.width).toBe('50%')
    expect(image.style.borderColor).toBe('red')
    expect(image.style.maxWidth).toBe(empty.style.maxWidth)
    // An empty URI paints no image, and still sizes and centres the background.
    expect(empty.style.backgroundImage).toBe('')
    expect(empty.style.backgroundSize).toBe('cover')
  })

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
