// @vitest-environment jsdom
/**
 * The web TextField element renders exactly the tag and attributes it is given, and grows a text
 * area with its text between `autoGrow`'s line counts, whether the caller holds the text (`value`)
 * or the user types into a field it does not hold (`input` events).
 */
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TextField } from '../TextField.js'

/** A jsdom text area has no layout: its scroll height is set by hand. */
function layOut(element: HTMLTextAreaElement, scrollHeight: number): void {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight })
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('TextField element (web)', () => {
  it('preserves number and date constraints and omits them on unsupported hosts', () => {
    // A JavaScript consumer can supply extra props outside the TypeScript contract.
    const unsupported: Record<string, number> = { min: 0, max: 10, step: 1 }
    act(() =>
      root.render(
        <>
          <TextField as="input" type="number" min={0} max={2} step={0.1} defaultValue="0.3" />
          <TextField as="input" type="date" min="2024-02-29" step="any" defaultValue="2024-02-29" />
          <TextField as="input" type="number" />
          <TextField as="input" type="text" {...unsupported} />
          <TextField as="textarea" {...unsupported} />
        </>,
      ),
    )
    const [number, date, omitted, text, area] = container.children
    expect(number?.getAttribute('min')).toBe('0')
    expect(number?.getAttribute('max')).toBe('2')
    expect(number?.getAttribute('step')).toBe('0.1')
    expect(date?.getAttribute('min')).toBe('2024-02-29')
    expect(date?.hasAttribute('max')).toBe(false)
    expect(date?.getAttribute('step')).toBe('any')
    if (!(number instanceof HTMLInputElement) || !(date instanceof HTMLInputElement))
      throw new Error('Missing number or date input')
    expect(number.checkValidity()).toBe(true)
    number.value = '0.35'
    expect(number.validity.stepMismatch).toBe(true)
    expect(date.checkValidity()).toBe(true)
    date.value = '2024-02-28'
    expect(date.validity.rangeUnderflow).toBe(true)
    date.value = '2024-02-30'
    expect(date.value).toBe('')
    for (const element of [omitted, text, area]) {
      expect(element?.getAttribute('min')).toBeNull()
      expect(element?.getAttribute('max')).toBeNull()
      expect(element?.getAttribute('step')).toBeNull()
    }
  })

  it('renders an input with its type and a text area with its rows, cols and wrap', () => {
    act(() =>
      root.render(
        <>
          <TextField
            as="input"
            type="date"
            name="day"
            required
            minLength={2}
            defaultValue="2026-11-25"
          />
          <TextField as="textarea" rows={4} cols={30} wrap="hard" />
        </>,
      ),
    )
    const input = container.querySelector('input')
    const area = container.querySelector('textarea')
    expect(input?.getAttribute('type')).toBe('date')
    expect(input?.required).toBe(true)
    expect(input?.minLength).toBe(2)
    expect(input?.value).toBe('2026-11-25')
    expect(area?.getAttribute('rows')).toBe('4')
    expect(area?.getAttribute('cols')).toBe('30')
    expect(area?.getAttribute('wrap')).toBe('hard')
    expect(area?.hasAttribute('type')).toBe(false)
  })

  it('passes no autoGrow attribute to the DOM, and clears its height once autoGrow is off', () => {
    act(() => root.render(<TextField as="textarea" autoGrow={{ minRows: 2 }} />))
    const area = container.querySelector('textarea')
    expect(area?.getAttributeNames().some((name) => name.toLowerCase() === 'autogrow')).toBe(false)
    expect(area?.style.minHeight).toBe('2lh')
    expect(area?.style.height).toBe('0px')
    act(() => root.render(<TextField as="textarea" />))
    expect(area?.style.height).toBe('')
    expect(area?.style.minHeight).toBe('')
  })

  it('remeasures a controlled text area and leaves the row bounds to CSS', () => {
    const render = (value: string): void =>
      act(() =>
        root.render(
          <TextField
            as="textarea"
            value={value}
            onValueChange={() => undefined}
            autoGrow={{ minRows: 2, maxRows: 4 }}
          />,
        ),
      )
    render('a')
    const area = container.querySelector('textarea')
    if (!area) throw new Error('no text area')
    expect(area.style.minHeight).toBe('2lh')
    expect(area.style.maxHeight).toBe('4lh')
    expect(area.style.height).toBe('0px')
    layOut(area, 60)
    render('abc')
    expect(area.style.height).toBe('60px')
    layOut(area, 200)
    render('long')
    expect(area.style.height).toBe('200px')
    expect(area.style.maxHeight).toBe('4lh')
  })

  it('grows a text area the caller does not hold as the user types', () => {
    act(() => root.render(<TextField as="textarea" autoGrow={{ minRows: 1 }} />))
    const area = container.querySelector('textarea')
    if (!area) throw new Error('no text area')
    layOut(area, 90)
    act(() => {
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(area.style.height).toBe('90px')
  })

  it('never sizes an input, which does not grow', () => {
    act(() => root.render(<TextField as="input" autoGrow={{ minRows: 3 }} />))
    const input = container.querySelector('input')
    expect(input?.style.height).toBe('')
    expect(input?.style.minHeight).toBe('')
  })

  it('calls onChange with the event and onValueChange with the text', () => {
    const onChange = vi.fn()
    const onValueChange = vi.fn()
    act(() =>
      root.render(
        <TextField as="input" defaultValue="" onChange={onChange} onValueChange={onValueChange} />,
      ),
    )
    const input = container.querySelector('input')
    if (!input) throw new Error('no input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(input, 'typed')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onValueChange).toHaveBeenCalledWith('typed')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
