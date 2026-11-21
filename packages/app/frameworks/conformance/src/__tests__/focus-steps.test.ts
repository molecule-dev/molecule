/**
 * The UI step runner's `focus` and `blur` steps fire `focusin` / `focusout` once, as a browser does.
 *
 * jsdom's `focus()` and `blur()` already dispatch them, so a step that dispatched another on top
 * recorded every `onFocus` / `onBlur` handler call twice in the goldens. A step that would move
 * no focus throws instead of passing silently: a case that typed into a field and blurred it
 * without focusing it first lost its commit-on-blur assertion that way (2026-11-19).
 *
 * @module
 */

import '../ui/setup.js'
import { afterEach, describe, expect, it } from 'vitest'

import { performDomInteraction } from '../ui/environment.js'

/**
 * Adds an element to the page and records the focus events that reach it.
 *
 * @param tag - The element to create.
 * @returns The element and the events it received, in order.
 */
const watched = (tag: 'input' | 'div'): { el: HTMLElement; seen: string[] } => {
  const el = document.createElement(tag)
  el.dataset.testid = 'target'
  document.body.append(el)
  const seen: string[] = []
  el.addEventListener('focusin', () => seen.push('focusin'))
  el.addEventListener('focusout', () => seen.push('focusout'))
  return { el, seen }
}

const TARGET = '[data-testid="target"]'

afterEach(() => {
  document.body.replaceChildren()
})

describe('focus and blur steps', () => {
  it('fire focusin and focusout once on a focusable element', () => {
    const { el, seen } = watched('input')
    performDomInteraction({ type: 'focus', selector: TARGET })
    expect(document.activeElement).toBe(el)
    performDomInteraction({ type: 'blur', selector: TARGET })
    expect(seen).toEqual(['focusin', 'focusout'])
    expect(document.activeElement).not.toBe(el)
  })

  it('refuse a focus step on an element that already has focus', () => {
    const { el, seen } = watched('input')
    el.focus()
    seen.length = 0
    expect(() => performDomInteraction({ type: 'focus', selector: TARGET })).toThrow(
      'focus: "[data-testid="target"]" already has focus, so a browser fires no focusin; remove the step',
    )
    expect(seen).toEqual([])
  })

  it('refuse a focus step on a disabled element', () => {
    const { el, seen } = watched('input')
    el.setAttribute('disabled', '')
    expect(() => performDomInteraction({ type: 'focus', selector: TARGET })).toThrow(
      'is disabled, so a browser moves no focus to it',
    )
    expect(seen).toEqual([])
  })

  it('still reach the handlers of an element focus cannot move to, once each', () => {
    const { el, seen } = watched('div')
    performDomInteraction({ type: 'focus', selector: TARGET })
    expect(() => performDomInteraction({ type: 'focus', selector: TARGET })).toThrow(
      'already has focus',
    )
    performDomInteraction({ type: 'blur', selector: TARGET })
    expect(seen).toEqual(['focusin', 'focusout'])
    expect(document.activeElement).not.toBe(el)
    expect(() => performDomInteraction({ type: 'blur', selector: TARGET })).toThrow(
      'does not have focus',
    )
  })

  it('refuse a blur step on an element that never had focus, naming the focus step to add', () => {
    const { seen } = watched('input')
    expect(() => performDomInteraction({ type: 'blur', selector: TARGET })).toThrow(
      `blur: "${TARGET}" does not have focus, so a browser fires no focusout; add { type: 'focus', selector: ${JSON.stringify(TARGET)} } before the step that needs it`,
    )
    expect(seen).toEqual([])
  })
})
