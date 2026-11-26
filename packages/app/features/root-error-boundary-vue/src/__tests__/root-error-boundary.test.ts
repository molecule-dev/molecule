// @vitest-environment jsdom
/**
 * Unit tests for the Vue `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
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

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

// No translations registered: the fallback renders its English default value.
setProvider(createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: {} }]))

const { RootErrorBoundary } = await import('../RootErrorBoundary.js')

/** A child that fails to render, so the boundary shows its recovery alert. */
const Broken = defineComponent({
  name: 'Broken',
  setup() {
    throw new Error('render failed')
  },
})

const mounted: (() => void)[] = []
afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  vi.restoreAllMocks()
})

/**
 * Mounts the boundary with the given children and returns its markup.
 *
 * @param children - The children to guard.
 * @returns The rendered markup.
 */
const mountBoundary = async (children?: () => VNodeChild): Promise<string> => {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(RootErrorBoundary, null, children ? { default: children } : undefined),
  })
  mounted.push(() => {
    app.unmount()
    container.remove()
  })
  app.mount(container)
  await nextTick()
  return container.innerHTML
}

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', async () => {
    const markup = await mountBoundary(() => [h('main', { 'data-app': '' }, 'app content')])
    expect(markup).toContain('data-app=""')
    expect(markup).toContain('app content')
  })

  it('derives the error state from a thrown error', async () => {
    // Vue reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const markup = await mountBoundary(() => [h(Broken)])
    await nextTick()
    // The caught error flipped the boundary into its error state: the children are gone.
    expect(markup).not.toContain('render failed')
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('renders the localized recovery alert once in the errored state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await mountBoundary(() => [h(Broken)])
    await nextTick()
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toBe('An unexpected error occurred.')
    expect(alert?.className).toBe('flex sp')
    expect(alert?.querySelector('p')?.className).toBe('textSize fontWeight')
  })
})
