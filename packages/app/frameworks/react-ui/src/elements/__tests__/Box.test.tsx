// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Box } from '../Box.js'
import { Text } from '../Text.js'
import { TextField } from '../TextField.js'

describe('Box labels (web)', () => {
  it('renders a wrapping label and leaves control activation to the browser', () => {
    render(
      <Box as="label" data-testid="label">
        <input type="checkbox" />
        Receive updates
      </Box>,
    )
    const label = screen.getByTestId('label')
    const checkbox = screen.getByLabelText<HTMLInputElement>('Receive updates')
    expect(label.tagName).toBe('LABEL')
    expect(checkbox.checked).toBe(false)
    fireEvent.click(label)
    expect(checkbox.checked).toBe(true)
  })

  it('keeps an explicit text label associated with the original input tag', () => {
    render(
      <Box as="div">
        <Text as="label" htmlFor="email">
          Email
        </Text>
        <TextField as="input" id="email" type="email" />
      </Box>,
    )
    expect(screen.getByLabelText('Email').tagName).toBe('INPUT')
  })
})
