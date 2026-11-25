// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { FormAreaHandle, FormEntries, KitEvent } from '@molecule/app-ui'

import { FormArea, Pressable, TextField } from '../index.js'

describe('FormArea (web)', () => {
  it('hands the caller the real form event and successful controls in order', () => {
    const ref = createRef<FormAreaHandle>()
    const receive = vi.fn()
    const { container } = render(
      <FormArea
        as="form"
        ref={ref}
        method="post"
        autoComplete="off"
        onSubmit={(event: KitEvent, entries: FormEntries) => {
          event.preventDefault()
          receive(event.currentTarget, entries)
        }}
      >
        <TextField as="input" name="person" defaultValue="Ann" />
        <TextField as="input" name="person" defaultValue="Bea" />
        <TextField as="input" name="skip" defaultValue="Cai" disabled />
        <input type="file" name="attachment" />
        <Pressable as="button" type="submit" name="button" value="submit">
          Save
        </Pressable>
      </FormArea>,
    )
    const form = container.querySelector('form')
    expect(ref.current).toBe(form)
    expect(form?.method).toBe('post')
    expect(form?.getAttribute('autocomplete')).toBe('off')
    act(() => screen.getByRole('button', { name: 'Save' }).click())
    expect(receive).toHaveBeenCalledExactlyOnceWith(form, [
      ['person', 'Ann'],
      ['person', 'Bea'],
      ['attachment', expect.any(File)],
    ])
  })

  it('validates requestSubmit and leaves reset to the browser', () => {
    const ref = createRef<FormAreaHandle>()
    const receive = vi.fn((event: KitEvent) => event.preventDefault())
    const { container } = render(
      <FormArea as="form" ref={ref} onSubmit={receive}>
        <TextField as="input" name="email" type="email" required />
        <Pressable as="button" type="reset">
          Reset
        </Pressable>
      </FormArea>,
    )
    const input = container.querySelector('input')
    if (!input) throw new Error('Expected the email input')
    act(() => ref.current?.requestSubmit())
    expect(receive).not.toHaveBeenCalled()
    input.value = 'person@example.com'
    act(() => ref.current?.requestSubmit())
    expect(receive).toHaveBeenCalledTimes(1)
    act(() => screen.getByRole('button', { name: 'Reset' }).click())
    expect(input.value).toBe('')
  })
})
