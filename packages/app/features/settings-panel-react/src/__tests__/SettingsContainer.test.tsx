// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { useSettingsPanelContext } from '../context.js'
import { SettingsContainer } from '../SettingsContainer.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/** How many times the context consumer has rendered. */
let consumerRenders = 0

/**
 * A consumer that counts its renders and calls the published handler.
 *
 * @returns The consumer element.
 */
function Consumer(): React.ReactElement {
  consumerRenders++
  const { onClose } = useSettingsPanelContext()
  return (
    <button type="button" onClick={onClose}>
      close
    </button>
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  consumerRenders = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<SettingsContainer>', () => {
  it('keeps the context value stable while onClose keeps its identity', () => {
    const onClose = vi.fn()
    const children = <Consumer />
    const { rerender } = render(<SettingsContainer onClose={onClose}>{children}</SettingsContainer>)
    expect(consumerRenders).toBe(1)

    rerender(<SettingsContainer onClose={onClose}>{children}</SettingsContainer>)

    // A fresh context value object on every render would re-render the consumer.
    expect(consumerRenders).toBe(1)
  })

  it('publishes a new onClose to consumers when the handler changes', () => {
    const first = vi.fn()
    const second = vi.fn()
    const children = <Consumer />
    const { rerender } = render(<SettingsContainer onClose={first}>{children}</SettingsContainer>)

    rerender(<SettingsContainer onClose={second}>{children}</SettingsContainer>)

    expect(consumerRenders).toBe(2)
    screen.getByRole('button', { name: 'close' }).click()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
