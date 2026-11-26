// @vitest-environment jsdom
/** Verifies the portable callbacks alongside the genuine web events. */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Checkbox } from '../components/Checkbox.js'
import { Input } from '../components/Input.js'
import { Switch } from '../components/Switch.js'
import { Textarea } from '../components/Textarea.js'

const functions = new Set(['input', 'textarea', 'checkbox', 'switchBase', 'switchThumb'])

beforeEach(() => {
  setIconSet({ 'x-mark': { name: 'x-mark', viewBox: '0 0 16 16', paths: [] } })
  setClassMap(
    new Proxy(
      {},
      {
        get: (_target, key: string) => {
          if (key === 'cn') return (...parts: unknown[]) => parts.filter(Boolean).join(' ')
          return functions.has(key) ? () => key : key
        },
      },
    ) as UIClassMap,
  )
})

describe('web kit callbacks', () => {
  it.each([
    { field: Input, name: 'Input' },
    { field: Textarea, name: 'Textarea' },
  ])('$name delivers text alongside a genuine web change event', ({ field }) => {
    const Field = field
    const onValueChange = vi.fn<(value: string) => void>()
    const changed = vi.fn()
    render(
      <Field
        testId="field"
        onValueChange={onValueChange}
        onChange={(event) => {
          event.preventDefault()
          changed(event.currentTarget)
        }}
      />,
    )
    const control = screen.getByTestId('field')

    fireEvent.input(control, { target: { value: 'typed' } })

    expect(changed).toHaveBeenCalledExactlyOnceWith(control)
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('typed')
  })

  it('delivers an empty value and the web click when clearing Input', () => {
    const onValueChange = vi.fn<(value: string) => void>()
    const onClear = vi.fn()
    const onChange = vi.fn()
    render(
      <Input
        clearable
        value="text"
        onValueChange={onValueChange}
        onClear={onClear}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClear).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('')
  })

  it.each([
    { field: Checkbox, name: 'Checkbox' },
    { field: Switch, name: 'Switch' },
  ])('$name delivers checked state alongside the web event', ({ field }) => {
    const Field = field
    const onCheckedChange = vi.fn<(checked: boolean) => void>()
    const changed = vi.fn()
    render(
      <Field
        testId="field"
        checked={false}
        onCheckedChange={onCheckedChange}
        onChange={(event) => {
          event.stopPropagation()
          changed(event.currentTarget instanceof HTMLInputElement)
        }}
      />,
    )

    fireEvent.click(screen.getByTestId('field'))

    expect(changed).toHaveBeenCalledExactlyOnceWith(true)
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true)
  })
})
