// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Skeleton } from '../components/Skeleton.js'
import { Alert } from '../index.web.js'

const animations = vi.hoisted(() => {
  const start = vi.fn()
  const stop = vi.fn()
  return {
    os: 'web',
    timing: vi.fn(() => ({})),
    sequence: vi.fn(() => ({})),
    loop: vi.fn(() => ({ start, stop })),
    start,
  }
})

vi.mock('react-native', () => {
  const view = ({
    className,
    children,
    testID,
  }: {
    className?: string
    children?: ReactNode
    testID?: string
  }) => (
    <div className={className} data-testid={testID}>
      {children}
    </div>
  )

  return {
    View: view,
    Text: view,
    Platform: {
      select: (options: Record<string, unknown>) => options.default,
      get OS() {
        return animations.os
      },
    },
    Animated: {
      View: view,
      Value: class {},
      timing: animations.timing,
      sequence: animations.sequence,
      loop: animations.loop,
    },
  }
})

beforeEach(() => {
  animations.os = 'web'
  vi.clearAllMocks()
  setClassMap(classMap)
  setIconSet(iconSet)
  setProvider(createSimpleI18nProvider())
})

afterEach(cleanup)

it('fills primary and secondary alerts with the ClassMap default and preserves semantic colors', () => {
  const { getByTestId, rerender } = render(<Alert testId="alert" status="primary" />)
  expect(getByTestId('alert').className).toBe(classMap.alert({ variant: 'default' }))

  rerender(<Alert testId="alert" status="secondary" />)
  expect(getByTestId('alert').className).toBe(classMap.alert({ variant: 'default' }))

  rerender(<Alert testId="alert" status="success" />)
  expect(getByTestId('alert').className).toBe(classMap.alert({ variant: 'success' }))
})

it('uses the ClassMap pulse on web and the native driver on a device', () => {
  const web = render(<Skeleton testId="skeleton" />)
  expect(web.getByTestId('skeleton').className).toBe(classMap.skeleton())
  expect(animations.timing).not.toHaveBeenCalled()
  expect(animations.start).not.toHaveBeenCalled()
  web.unmount()

  animations.os = 'ios'
  render(<Skeleton testId="skeleton" />)
  expect(animations.timing).toHaveBeenCalledTimes(2)
  expect(animations.timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ useNativeDriver: true }),
  )
  expect(animations.start).toHaveBeenCalledOnce()
})
