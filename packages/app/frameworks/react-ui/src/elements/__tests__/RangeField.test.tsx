// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import { RangeField } from '../index.js'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function render(node: ReactNode): HTMLInputElement {
  act(() => root.render(node))
  const input = container.querySelector('input')
  if (!input) throw new Error('RangeField did not render an input')
  return input
}

function edit(input: HTMLInputElement, value: string): void {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setValue?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('RangeField (web)', () => {
  it('renders just one range input and leaves omitted attributes to the browser', () => {
    const input = render(<RangeField />)
    expect(container.innerHTML).toBe('<input type="range">')
    expect(input.valueAsNumber).toBe(50)
  })

  it('forwards bounds, form identity, accessibility, styles and the element handle', () => {
    const ref = createRef<ElementHandle>()
    const input = render(
      <RangeField
        min={-1}
        max={1}
        step="any"
        defaultValue={0}
        name="gain"
        disabled
        id="gain"
        aria-label="Gain"
        aria-orientation="vertical"
        data-mol-id="gain"
        style={{ width: 10, height: 100 }}
        webStyle={{ width: 20, writingMode: 'vertical-lr' }}
        ref={ref}
      />,
    )
    expect(ref.current).toBe(input)
    expect(input.min).toBe('-1')
    expect(input.max).toBe('1')
    expect(input.step).toBe('any')
    expect(input.defaultValue).toBe('0')
    expect(input.name).toBe('gain')
    expect(input.disabled).toBe(true)
    expect(input.id).toBe('gain')
    expect(input.getAttribute('aria-label')).toBe('Gain')
    expect(input.getAttribute('aria-orientation')).toBe('vertical')
    expect(input.dataset.molId).toBe('gain')
    expect(input.style.width).toBe('20px')
    expect(input.style.height).toBe('100px')
    expect(input.style.writingMode).toBe('vertical-lr')
  })

  it('reads valueAsNumber and emits once for the input and change events of one edit', () => {
    const onValueChange = vi.fn()
    const input = render(<RangeField min={0} max={1} step={0.01} onValueChange={onValueChange} />)
    const valueAsNumber = vi.spyOn(input, 'valueAsNumber', 'get')
    edit(input, '0.49')
    expect(valueAsNumber).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(0.49)
  })

  it('keeps the controlled value when a parent rejects the edit', () => {
    const onValueChange = vi.fn()
    const input = render(
      <RangeField min={0} max={1} step={0.01} value={0.5} onValueChange={onValueChange} />,
    )
    edit(input, '0.49')
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(0.49)
    expect(input.valueAsNumber).toBe(0.5)
  })
})
