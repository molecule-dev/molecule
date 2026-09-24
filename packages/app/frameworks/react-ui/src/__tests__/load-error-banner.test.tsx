// @vitest-environment jsdom
/**
 * Render/behavior tests for LoadErrorBanner: message/detail/children
 * render, rest-prop locator pass-through, retry pending state (disabled +
 * "Retrying…", no double-fire), and no retry button without onRetry.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LoadErrorBanner } from '../components/LoadErrorBanner.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set(['stack', 'flex', 'sp', 'textSize', 'fontWeight', 'button', 'alert'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

afterEach(cleanup)

const base = { message: 'Could not load decks.' }

describe('LoadErrorBanner', () => {
  it('renders message, detail, children, and rest-prop locator', () => {
    const d = render(
      createElement(LoadErrorBanner, {
        ...base,
        detail: 'HTTP 503',
        'data-mol-id': 'decks-load-error',
        children: createElement('code', { 'data-extra': '' }, 'E_TIMEOUT'),
      }),
    )
    expect(d.getByText('Could not load decks.')).toBeTruthy()
    expect(d.getByText('HTTP 503')).toBeTruthy()
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
    expect(document.body.querySelector('[data-mol-id="decks-load-error"]')).toBeTruthy()
  })

  it('renders no retry button without onRetry', () => {
    const d = render(createElement(LoadErrorBanner, base, null))
    expect(d.queryByText('Retry')).toBeNull()
  })

  it('calls onRetry and shows the pending label while pending', async () => {
    let resolveRetry: () => void = () => {}
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        }),
    )
    const d = render(createElement(LoadErrorBanner, { ...base, onRetry }, null))
    const retry = d.getByText('Retry') as HTMLButtonElement
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Pending: disabled + label swapped — a second click must not re-fire.
    const pendingButton = d.getByText('Retrying…') as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
    resolveRetry()
    await waitFor(() => expect((d.getByText('Retry') as HTMLButtonElement).disabled).toBe(false))
  })

  it('re-arms after a rejected retry (failure keeps the banner usable)', async () => {
    const onRetry = vi.fn().mockRejectedValueOnce(new Error('still down'))
    const d = render(createElement(LoadErrorBanner, { ...base, onRetry }, null))
    fireEvent.click(d.getByText('Retry'))
    await waitFor(() => expect((d.getByText('Retry') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(d.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('retry button carries retryMolId (default and custom)', () => {
    render(createElement(LoadErrorBanner, { ...base, onRetry: () => {} }, null))
    expect(document.body.querySelector('[data-mol-id="load-error-retry"]')).toBeTruthy()
    cleanup()
    render(
      createElement(
        LoadErrorBanner,
        { ...base, onRetry: () => {}, retryMolId: 'decks-retry' },
        null,
      ),
    )
    expect(document.body.querySelector('[data-mol-id="decks-retry"]')).toBeTruthy()
  })
})
