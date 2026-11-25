// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Box, Fieldset, FormArea, Pressable, TextField } from '../index.js'

describe('Fieldset (web)', () => {
  it('uses browser disabled-fieldset semantics with no extra container', () => {
    const onPress = vi.fn()
    const onBox = vi.fn()
    const receive = vi.fn()
    const { container } = render(
      <FormArea
        as="form"
        onSubmit={(event, entries) => {
          event.preventDefault()
          receive(entries)
        }}
      >
        <Fieldset as="fieldset" disabled name="account">
          <TextField as="input" name="skip" defaultValue="Disabled" />
          <Pressable as="button" type="button" onClick={onPress}>
            Disabled button
          </Pressable>
          <Box as="div" onClick={onBox}>
            Ordinary element
          </Box>
        </Fieldset>
        <Pressable as="button" type="submit">
          Save
        </Pressable>
      </FormArea>,
    )
    const fieldset = container.querySelector('form > fieldset')
    expect(fieldset?.name).toBe('account')
    expect(fieldset?.querySelector('input')?.matches(':disabled')).toBe(true)
    const box = screen.getByText('Ordinary element')
    expect(box.matches(':disabled')).toBe(false)
    act(() => {
      screen.getByRole('button', { name: 'Disabled button' }).click()
      // jsdom's HTMLElement.click() incorrectly suppresses non-controls within a fieldset.
      fireEvent.click(box)
      screen.getByRole('button', { name: 'Save' }).click()
    })
    expect(onPress).not.toHaveBeenCalled()
    expect(onBox).toHaveBeenCalledTimes(1)
    expect(receive).toHaveBeenCalledExactlyOnceWith([])
  })
})
