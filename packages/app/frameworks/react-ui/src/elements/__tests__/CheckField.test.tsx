// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CheckFieldHandle } from '@molecule/app-ui'

import { CheckField } from '../CheckField.js'

describe('CheckField (web)', () => {
  it('exposes the actual input and forwards both change callbacks on click', () => {
    const ref = createRef<CheckFieldHandle>()
    const changed = vi.fn()
    const checked = vi.fn()
    render(
      <CheckField
        as="input"
        type="checkbox"
        ref={ref}
        onChange={(event) => changed(event.target)}
        onCheckedChange={checked}
        aria-label="Subscribe"
      />,
    )
    const input = screen.getByRole('checkbox', { name: 'Subscribe' })
    expect(input.tagName).toBe('INPUT')
    expect(ref.current).toBe(input)
    act(() => ref.current?.click())
    expect(ref.current?.checked).toBe(true)
    expect(changed).toHaveBeenCalledExactlyOnceWith(input)
    expect(checked).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('applies and clears the mixed state through the DOM property', () => {
    const view = render(
      <CheckField as="input" type="checkbox" indeterminate aria-label="Select all" />,
    )
    const input = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all' })
    expect(input.indeterminate).toBe(true)
    expect(input.hasAttribute('indeterminate')).toBe(false)
    view.rerender(<CheckField as="input" type="checkbox" aria-label="Select all" />)
    expect(input.indeterminate).toBe(false)
  })

  it('uses browser radio and disabled semantics', () => {
    const checked = vi.fn()
    const ref = createRef<CheckFieldHandle>()
    const view = render(
      <CheckField
        as="input"
        type="radio"
        name="size"
        checked={false}
        disabled
        ref={ref}
        onCheckedChange={checked}
        aria-label="Large"
      />,
    )
    act(() => ref.current?.click())
    expect(checked).not.toHaveBeenCalled()
    view.rerender(
      <CheckField
        as="input"
        type="radio"
        name="size"
        checked={false}
        ref={ref}
        onCheckedChange={checked}
        aria-label="Large"
      />,
    )
    act(() => ref.current?.click())
    expect(checked).toHaveBeenCalledExactlyOnceWith(true)
    expect(ref.current?.checked).toBe(false)
  })
})
