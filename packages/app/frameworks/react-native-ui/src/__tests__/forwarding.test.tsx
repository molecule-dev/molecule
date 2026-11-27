// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { Box } from '../elements/Box.js'
import { Pressable } from '../elements/Pressable.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))

vi.mock('react-native', () => {
  interface Props {
    children?: ReactNode
    accessible?: boolean
    role?: string
    'aria-label'?: string
    onPress?: () => void
  }
  const host = (tag: string, defaultAccessible: boolean) => (props: Props) =>
    createElement(
      tag,
      {
        role: props.role,
        'aria-label': props['aria-label'],
        'data-accessible': props.accessible ?? defaultAccessible,
        onClick: props.onPress,
      },
      props.children,
    )
  return {
    Platform: { OS: 'ios', select: ({ default: fallback }: { default: unknown }) => fallback },
    Pressable: host('div', true),
    Text: host('span', true),
    View: host('div', false),
    useWindowDimensions: () => ({ width: 360, height: 720 }),
  }
})

afterEach(cleanup)

it('leaves a passive status box and its close action independently accessible', () => {
  const close = vi.fn()
  const view = render(
    <Box as="div" role="status" accessibilityGroup={false} onMouseEnter={() => {}}>
      Saved
      <Pressable as="button" type="button" aria-label="Close" onClick={close}>
        Close
      </Pressable>
    </Box>,
  )
  const status = view.getByRole('status')
  const dismiss = view.getByRole('button', { name: 'Close' })

  expect(status.getAttribute('data-accessible')).toBe('false')
  expect(dismiss.getAttribute('data-accessible')).toBe('true')
  fireEvent.click(dismiss)
  expect(close).toHaveBeenCalledOnce()
})
