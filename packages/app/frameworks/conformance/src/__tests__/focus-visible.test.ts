// @vitest-environment jsdom

/**
 * The kit's `:focus-visible` judgement follows a browser's heuristics (Selectors 4 §9.4), not
 * jsdom's: jsdom 31 matches `:focus-visible` like `:focus`, and jsdom 30's engine judged a script
 * focus after a click as visible. Each case below states what a browser draws.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { installFocusVisible, resetFocusVisible } from '../ui/focus-visible.js'

/** Adds an element to the page. */
const add = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value)
  document.body.appendChild(el)
  return el
}

const key = (target: EventTarget, init: KeyboardEventInit = { key: 'Tab' }): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
}

const pointer = (target: EventTarget): void => {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
}

const visible = (el: Element): boolean => el.matches(':focus-visible')

beforeEach(() => {
  ;(document.activeElement as HTMLElement | null)?.blur()
  document.body.replaceChildren()
  resetFocusVisible()
})

describe('the kit :focus-visible judgement', () => {
  it('starts as after a click: a script focus is not visible', () => {
    const button = add('button')
    button.focus()
    expect(visible(button)).toBe(false)
  })

  it('makes a focus during keyboard input visible, and a focus after a pointer press not', () => {
    const [a, b] = [add('button'), add('button')]
    key(document.body)
    a.focus()
    expect(visible(a)).toBe(true)
    // A script moving focus on from a keyboard-focused element (a menu returning focus to its
    // trigger after Escape) keeps it visible.
    b.focus()
    expect(visible(b)).toBe(true)
    pointer(a)
    a.focus()
    expect(visible(a)).toBe(false)
    // The same script focus after that click is not visible (a menu closed by a click).
    b.focus()
    expect(visible(b)).toBe(false)
  })

  it('makes the focused element visible on a key press, and hides it on a pointer press', () => {
    const button = add('button')
    button.focus()
    key(button, { key: 'Shift', shiftKey: true })
    expect(visible(button)).toBe(true)
    pointer(button)
    expect(visible(button)).toBe(false)
  })

  it('ignores key presses with Ctrl, Alt or Meta held', () => {
    const button = add('button')
    button.focus()
    for (const held of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      key(button, { key: 'c', ...held })
      expect(visible(button)).toBe(false)
    }
  })

  it('shows a focused text field however it was focused, and no other control', () => {
    const text = add('input', { type: 'text' })
    const area = add('textarea')
    const editable = add('div', { contenteditable: '' })
    editable.tabIndex = 0
    for (const el of [text, area, editable]) {
      pointer(el)
      el.focus()
      expect(visible(el)).toBe(true)
    }
    const readonly = add('input', { type: 'text', readonly: '' })
    const checkbox = add('input', { type: 'checkbox' })
    for (const el of [readonly, checkbox]) {
      pointer(el)
      el.focus()
      expect(visible(el)).toBe(false)
    }
  })

  it('answers false for an element without focus, and after blur', () => {
    const [a, b] = [add('button'), add('button')]
    key(document.body)
    a.focus()
    expect(visible(b)).toBe(false)
    a.blur()
    expect(visible(a)).toBe(false)
  })

  it('has the answer ready inside the element’s own focus listener', () => {
    const button = add('button')
    let seen: boolean | undefined
    button.addEventListener('focus', () => {
      seen = visible(button)
    })
    key(document.body)
    button.focus()
    expect(seen).toBe(true)
  })

  it('is reset to the starting state, whatever came before', () => {
    const button = add('button')
    key(document.body)
    button.focus()
    expect(visible(button)).toBe(true)
    resetFocusVisible()
    expect(visible(button)).toBe(false)
    button.blur()
    button.focus()
    expect(visible(button)).toBe(false)
  })

  it('throws for any other query naming :focus-visible, and leaves other selectors alone', () => {
    const button = add('button', { class: 'x' })
    button.focus()
    expect(() => button.matches('button:focus-visible')).toThrow(/ask that/)
    expect(() => document.querySelector(':focus-visible')).toThrow(/querySelector/)
    expect(() => document.body.querySelectorAll(':focus-visible')).toThrow(/querySelectorAll/)
    expect(() => button.closest(':focus-visible')).toThrow(/closest/)
    expect(button.matches('.x:focus')).toBe(true)
    expect(document.querySelector('.x')).toBe(button)
  })

  it('installs once, however often it is called', () => {
    const { matches } = Element.prototype
    installFocusVisible()
    installFocusVisible()
    expect(Element.prototype.matches).toBe(matches)
  })
})
