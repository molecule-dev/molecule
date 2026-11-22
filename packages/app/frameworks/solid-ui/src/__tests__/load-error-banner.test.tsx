// @vitest-environment jsdom
/**
 * Render/behavior tests for LoadErrorBanner: message/detail/children
 * render, rest-prop locator pass-through, retry pending state (disabled +
 * "Retrying…", no double-fire), and no retry button without onRetry. Solid
 * counterpart of `@molecule/app-ui-react`'s `load-error-banner.test.tsx`.
 *
 * @module
 */
import { fireEvent, waitFor, within } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import type { LoadErrorBannerProps } from '../components/LoadErrorBanner.jsx'

const { LoadErrorBanner } = await import('../components/LoadErrorBanner.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Props the tests mount the banner with, including its `data-*` locator. */
type BannerTestProps = Partial<LoadErrorBannerProps> & { 'data-mol-id'?: string }

/** Mounts a LoadErrorBanner with the base message, overridden by `props`. */
function mount(props: BannerTestProps = {}, children?: JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <LoadErrorBanner message="Could not load decks." {...props}>
          {children}
        </LoadErrorBanner>
      ),
      container,
    ),
  )
}

describe('LoadErrorBanner', () => {
  it('renders message, detail, children, and rest-prop locator', () => {
    mount(
      { detail: 'HTTP 503', 'data-mol-id': 'decks-load-error' },
      <code data-extra="">E_TIMEOUT</code>,
    )
    const view = within(document.body)
    expect(view.getByText('Could not load decks.')).toBeTruthy()
    expect(view.getByText('HTTP 503')).toBeTruthy()
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
    expect(document.body.querySelector('[data-mol-id="decks-load-error"]')).toBeTruthy()
  })

  it('renders no retry button without onRetry', () => {
    mount()
    expect(within(document.body).queryByText('Retry')).toBeNull()
  })

  it('calls onRetry and shows the pending label while pending', async () => {
    let resolveRetry: () => void = () => {}
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        }),
    )
    mount({ onRetry })
    const view = within(document.body)
    const retry = view.getByText('Retry') as HTMLButtonElement
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Pending: disabled + label swapped — a second click must not re-fire.
    const pendingButton = view.getByText('Retrying…') as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
    resolveRetry()
    await waitFor(() => expect((view.getByText('Retry') as HTMLButtonElement).disabled).toBe(false))
  })

  it('re-arms after a rejected retry (failure keeps the banner usable)', async () => {
    const onRetry = vi.fn().mockRejectedValueOnce(new Error('still down'))
    mount({ onRetry })
    const view = within(document.body)
    fireEvent.click(view.getByText('Retry'))
    await waitFor(() => expect((view.getByText('Retry') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(view.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('retry button carries retryMolId (default and custom)', () => {
    mount({ onRetry: () => {} })
    expect(document.body.querySelector('[data-mol-id="load-error-retry"]')).toBeTruthy()
    for (const dispose of disposers.splice(0)) dispose()
    document.body.innerHTML = ''
    mount({ onRetry: () => {}, retryMolId: 'decks-retry' })
    expect(document.body.querySelector('[data-mol-id="decks-retry"]')).toBeTruthy()
  })
})
