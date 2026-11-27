// @vitest-environment jsdom
import { act, createElement, type ReactNode, type Ref } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Box } from '../elements/Box.js'
import { keyboardEvent, mouseEvent } from '../elements/events.js'
import { Text } from '../elements/Text.js'
import { TextField } from '../elements/TextField.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))

vi.mock('react-native', () => {
  interface HostProps {
    id?: string
    testID?: string
    'aria-label'?: string
    onPress?: () => void
    children?: ReactNode
    ref?: Ref<HTMLElement>
  }

  const host =
    (tag: string) =>
    ({ id, testID, onPress, children, ref, ...props }: HostProps) =>
      createElement(
        tag,
        { id, 'data-testid': testID, 'aria-label': props['aria-label'], onClick: onPress, ref },
        children,
      )
  return {
    Platform: { select: ({ default: value }: { default: string }) => value },
    useWindowDimensions: () => ({ width: 640 }),
    View: host('div'),
    Pressable: host('div'),
    Text: host('span'),
    TextInput: host('input'),
  }
})

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(() => vi.unstubAllGlobals())

describe('Native labels', () => {
  it('keeps click and key cancellation visible to the element after the handler', () => {
    for (const event of [mouseEvent(undefined), keyboardEvent('Enter')]) {
      expect(event.defaultPrevented).toBe(false)
      event.preventDefault()
      expect(event.defaultPrevented).toBe(true)
    }
  })

  it('updates the accessible name and focuses the field associated with htmlFor', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const render = (label: string, ariaLabel?: string): void => {
      act(() =>
        root.render(
          <>
            <Text as="label" htmlFor="email" data-testid="label">
              {label}
            </Text>
            <TextField as="input" id="email" aria-label={ariaLabel} />
          </>,
        ),
      )
    }
    try {
      render('Email')
      const input = container.querySelector('input')
      expect(input?.getAttribute('aria-label')).toBe('Email')
      act(() => container.querySelector<HTMLElement>('[data-testid="label"]')?.click())
      expect(document.activeElement).toBe(input)
      render('Work email')
      expect(input?.getAttribute('aria-label')).toBe('Work email')
      render('Work email', 'Override')
      expect(input?.getAttribute('aria-label')).toBe('Override')
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('activates and labels the first control inside a wrapping label', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      act(() =>
        root.render(
          <Box as="label" data-testid="label">
            <TextField as="input" />
            <Text as="span">Name</Text>
            <TextField as="input" />
          </Box>,
        ),
      )
      const [first, second] = container.querySelectorAll('input')
      expect(first.getAttribute('aria-label')).toBe('Name')
      expect(second.hasAttribute('aria-label')).toBe(false)
      act(() => container.querySelector<HTMLElement>('[data-testid="label"]')?.click())
      expect(document.activeElement).toBe(first)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
