// @vitest-environment jsdom
/**
 * Contracts of {@link ElementPropsWriter}, the one React-compatible writer of
 * an element-prop record for the Angular ports (a navigation link entry, a
 * name link's props).
 *
 * Both ports copied these rules by hand; these tests pin each one against a
 * real element and Angular's real `Renderer2` — an attribute added, updated
 * and removed, each boolean branch, a listener added/replaced/removed, the
 * capture phase, `onDoubleClick` → `dblclick`, class composition, the style
 * object, `skip`, and `destroy`.
 *
 * @module
 */
// Register Angular's JIT compiler facade before the browser platform loads.
import '@angular/compiler'
import {
  type ApplicationRef,
  provideZonelessChangeDetection,
  type Renderer2,
  RendererFactory2,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import { ElementPropsWriter } from '../utilities/element-props.js'

let appRef: ApplicationRef
let renderer: Renderer2
let anchor: HTMLAnchorElement
let writer: ElementPropsWriter

beforeAll(async () => {
  // The platform's own renderer, not a stub: these tests are about what
  // reaches the element.
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  // `Renderer2` is a per-view service; the platform's factory is what makes one.
  renderer = appRef.injector.get(RendererFactory2).createRenderer(null, null)
})

afterAll(() => {
  appRef.destroy()
})

beforeEach(() => {
  anchor = document.createElement('a')
  document.body.appendChild(anchor)
  writer = new ElementPropsWriter(renderer, anchor)
})

afterEach(() => {
  writer.destroy()
  anchor.remove()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('attributes', () => {
  it('writes a value and stringifies one React stringifies', () => {
    writer.write({ target: '_blank', rel: 'noopener', tabIndex: 3 })
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toBe('noopener')
    expect(anchor.getAttribute('tabindex')).toBe('3')
  })

  it('updates a changed value and removes one that became null or undefined', () => {
    writer.write({ target: '_blank', rel: 'noopener' })
    writer.write({ target: '_self', rel: null })
    expect(anchor.getAttribute('target')).toBe('_self')
    expect(anchor.hasAttribute('rel')).toBe(false)
    writer.write({ target: undefined })
    expect(anchor.hasAttribute('target')).toBe(false)
  })

  it('removes a false attribute but writes "false" for a text boolean', () => {
    writer.write({ hidden: true, 'aria-hidden': true, draggable: true })
    expect(anchor.getAttribute('hidden')).toBe('')
    expect(anchor.getAttribute('aria-hidden')).toBe('true')
    expect(anchor.getAttribute('draggable')).toBe('true')
    writer.write({ hidden: false, 'aria-hidden': false, draggable: false })
    expect(anchor.hasAttribute('hidden')).toBe(false)
    expect(anchor.getAttribute('aria-hidden')).toBe('false')
    expect(anchor.getAttribute('draggable')).toBe('false')
  })

  it('writes "" for a true attribute and "true" for a text boolean', () => {
    writer.write({ download: true, 'aria-expanded': true, spellCheck: true, name: 'n' })
    expect(anchor.getAttribute('download')).toBe('')
    expect(anchor.getAttribute('aria-expanded')).toBe('true')
    expect(anchor.getAttribute('spellcheck')).toBe('true')
    expect(anchor.getAttribute('name')).toBe('n')
  })

  it('touches only the keys that changed', () => {
    const set = vi.spyOn(renderer, 'setAttribute')
    const remove = vi.spyOn(renderer, 'removeAttribute')
    writer.write({ target: '_blank', rel: 'noopener' })
    set.mockClear()
    writer.write({ target: '_blank', rel: 'noopener' })
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    writer.write({ target: '_blank', rel: 'nofollow' })
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenLastCalledWith(anchor, 'rel', 'nofollow')
  })

  it('leaves a skipped key untouched, and removes it once it is no longer skipped', () => {
    writer.write({ target: '_blank', rel: 'noopener' })
    writer.write({ target: '_self', rel: 'nofollow' }, new Set(['rel', 'target']))
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toBe('noopener')
    // The writer still tracks what it applied: dropping the key now removes it.
    writer.write({})
    expect(anchor.hasAttribute('target')).toBe(false)
    expect(anchor.hasAttribute('rel')).toBe(false)
  })
})

describe('listeners', () => {
  it('adds a listener, replaces it, and removes it when the key goes', () => {
    const first = vi.fn()
    const second = vi.fn()
    writer.write({ onClick: first })
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(first).toHaveBeenCalledTimes(1)
    writer.write({ onClick: second })
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    writer.write({})
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('removes a listener when its value stops being a function', () => {
    const handler = vi.fn()
    writer.write({ onClick: handler })
    writer.write({ onClick: undefined })
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    expect(anchor.hasAttribute('onClick')).toBe(false)
  })

  it('listens in the capture phase for a Capture key, before a bubble listener', () => {
    const order: string[] = []
    writer.write({
      onClickCapture: () => order.push('capture'),
      onClick: () => order.push('bubble'),
    })
    const child = document.createElement('span')
    anchor.appendChild(child)
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(order).toEqual(['capture', 'bubble'])
  })

  it('maps onDoubleClick to the dblclick event', () => {
    const handler = vi.fn()
    writer.write({ onDoubleClick: handler })
    anchor.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('class and style', () => {
  it('composes className and class into one class attribute', () => {
    writer.write({ className: 'one', class: 'two' })
    expect(anchor.getAttribute('class')).toBe('one two')
    writer.write({ class: 'three' })
    expect(anchor.getAttribute('class')).toBe('three')
    writer.write({})
    expect(anchor.hasAttribute('class')).toBe(false)
  })

  it('serializes a style object with React units and updates it', () => {
    writer.write({ style: { color: 'red', marginTop: 4 } })
    expect(anchor.getAttribute('style')).toBe('color: red; margin-top: 4px')
    writer.write({ style: { color: 'blue' } })
    expect(anchor.getAttribute('style')).toBe('color: blue')
    writer.write({})
    expect(anchor.hasAttribute('style')).toBe(false)
  })

  it('leaves class and style to the caller when they are skipped', () => {
    const skip = new Set(['class', 'style', 'className'])
    writer.write({ className: 'one', style: { color: 'red' } }, skip)
    expect(anchor.hasAttribute('class')).toBe(false)
    expect(anchor.hasAttribute('style')).toBe(false)
  })
})

describe('destroy', () => {
  it('removes every listener it added', () => {
    const handler = vi.fn()
    writer.write({ onClick: handler })
    writer.destroy()
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
  })
})
