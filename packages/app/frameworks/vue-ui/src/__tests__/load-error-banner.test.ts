// @vitest-environment jsdom
/**
 * Render/behavior tests for LoadErrorBanner — Vue port of
 * `@molecule/app-ui-react/src/__tests__/load-error-banner.test.tsx`:
 * message/detail/children render, rest-prop locator pass-through, retry
 * pending state (disabled + "Retrying…", no double-fire), re-arming after a
 * rejection, and no retry button without onRetry.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { waitFor, within } from '@testing-library/dom'
import { type App, createApp, h, nextTick } from 'vue'

const { LoadErrorBanner } = await import('../components/LoadErrorBanner.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

/** The props the ported behaviour tests vary; the message is always present. */
interface BannerVariants {
  message?: string
  detail?: string
  onRetry?: () => void | Promise<void>
  retryMolId?: string
  'data-mol-id'?: string
}

/**
 * Mounts a LoadErrorBanner with the standard message, overridable per test.
 *
 * @param props - The props that differ from the standard banner.
 * @param children - Extra content (Vue's default slot).
 * @returns The mounted root element.
 */
function mountBanner(props: BannerVariants = {}, children?: () => unknown): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({
    render: () =>
      h(
        LoadErrorBanner,
        { message: 'Could not load decks.', ...props },
        children ? { default: children } : undefined,
      ),
  })
  apps.push(app)
  app.mount(host)
  const root = host.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error('the banner produced no element')
  return root
}

describe('LoadErrorBanner', () => {
  it('renders message, detail, children, and rest-prop locator', () => {
    mountBanner({ detail: 'HTTP 503', 'data-mol-id': 'decks-load-error' }, () =>
      h('code', { 'data-extra': '' }, 'E_TIMEOUT'),
    )
    const body = within(document.body)
    expect(body.getByText('Could not load decks.')).toBeTruthy()
    expect(body.getByText('HTTP 503')).toBeTruthy()
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
    const body = within(document.body)
    body.getByText('Retry').click()
    await nextTick()
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Pending: disabled + label swapped — a second click must not re-fire.
    const pendingButton = body.getByText('Retrying…') as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    pendingButton.click()
    await nextTick()
    expect(onRetry).toHaveBeenCalledTimes(1)
    resolveRetry()
    await waitFor(() =>
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false),
    )
  })

  it('re-arms after a rejected retry (failure keeps the banner usable)', async () => {
    const onRetry = vi.fn().mockRejectedValueOnce(new Error('still down'))
    mountBanner({ onRetry })
    within(document.body).getByText('Retry').click()
    // Vue flushes the pending render on the next tick (React's is synchronous),
    // so the button must have swapped to "Retrying…" before waiting for it back.
    await nextTick()
    expect(within(document.body).getByText('Retrying…')).toBeTruthy()
    await waitFor(() =>
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false),
    )
    ;(within(document.body).getByText('Retry') as HTMLButtonElement).click()
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('retry button carries retryMolId (default and custom)', () => {
    mountBanner({ onRetry: () => {} })
    expect(document.body.querySelector('[data-mol-id="load-error-retry"]')).toBeTruthy()
    for (const app of apps.splice(0)) app.unmount()
    for (const host of hosts.splice(0)) host.remove()
    mountBanner({ onRetry: () => {}, retryMolId: 'decks-retry' })
    expect(document.body.querySelector('[data-mol-id="decks-retry"]')).toBeTruthy()
  })
})
