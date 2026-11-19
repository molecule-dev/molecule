// @vitest-environment jsdom
/**
 * Render/behavior tests for LoadErrorBanner: message/detail/children render,
 * rest-prop locator pass-through, retry pending state (disabled +
 * "Retrying…", no double-fire), re-arm after a rejection, retryMolId, and no
 * retry button without onRetry.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/load-error-banner.test.tsx`.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { createRawSnippet, flushSync, mount, unmount } from 'svelte'

const { default: LoadErrorBanner } = await import('../components/LoadErrorBanner.svelte')

const { fireEvent, waitFor, within } = await import('@testing-library/dom')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

/** Unmounts every mounted instance and empties the body. */
function clearAll(): void {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
}

afterEach(clearAll)

const base = { message: 'Could not load decks.' }

/**
 * Mounts a LoadErrorBanner.
 *
 * @param props - Props merged over the base message.
 * @returns The mount host.
 */
function mountBanner(props: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(LoadErrorBanner, { target: host, props: { ...base, ...props } }))
  flushSync()
  return host
}

describe('LoadErrorBanner', () => {
  it('renders message, detail, children, and rest-prop locator', () => {
    mountBanner({
      detail: 'HTTP 503',
      'data-mol-id': 'decks-load-error',
      children: createRawSnippet(() => ({ render: () => '<code data-extra="">E_TIMEOUT</code>' })),
    })
    expect(within(document.body).getByText('Could not load decks.')).toBeTruthy()
    expect(within(document.body).getByText('HTTP 503')).toBeTruthy()
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
    expect(document.body.querySelector('[data-mol-id="decks-load-error"]')).toBeTruthy()
  })

  it('renders no retry button without onRetry', () => {
    mountBanner()
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
    mountBanner({ onRetry })
    const retry = within(document.body).getByText('Retry') as HTMLButtonElement
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Pending: disabled + label swapped — a second click must not re-fire.
    flushSync()
    const pendingButton = within(document.body).getByText('Retrying…') as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
    resolveRetry()
    await waitFor(() =>
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false),
    )
  })

  it('re-arms after a rejected retry (failure keeps the banner usable)', async () => {
    const onRetry = vi.fn().mockRejectedValueOnce(new Error('still down'))
    mountBanner({ onRetry })
    fireEvent.click(within(document.body).getByText('Retry'))
    flushSync()
    await waitFor(() =>
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false),
    )
    fireEvent.click(within(document.body).getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('retry button carries retryMolId (default and custom)', () => {
    mountBanner({ onRetry: () => {} })
    expect(document.body.querySelector('[data-mol-id="load-error-retry"]')).toBeTruthy()
    clearAll()
    mountBanner({ onRetry: () => {}, retryMolId: 'decks-retry' })
    expect(document.body.querySelector('[data-mol-id="decks-retry"]')).toBeTruthy()
  })
})
