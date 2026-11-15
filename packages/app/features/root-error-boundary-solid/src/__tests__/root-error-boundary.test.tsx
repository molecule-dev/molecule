// @vitest-environment jsdom
/**
 * Unit tests for the Solid `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'

vi.mock('@molecule/app-ui', () => ({
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

const { RootErrorBoundary } = await import('../RootErrorBoundary.jsx')

/** A child that fails to render, so the boundary shows its recovery alert. */
function Broken(): never {
  throw new Error('render failed')
}

const disposers: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
})

/**
 * Render with Solid's browser renderer and return the markup.
 *
 * @param view - The tree to render.
 * @returns The rendered markup.
 */
function mount(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', () => {
    const markup = mount(() => (
      <RootErrorBoundary>
        <main data-app="">app content</main>
      </RootErrorBoundary>
    ))
    expect(markup).toContain('data-app=""')
    expect(markup).toContain('app content')
  })

  it('derives the error state from a thrown error', () => {
    const markup = mount(() => (
      <RootErrorBoundary>
        <Broken />
      </RootErrorBoundary>
    ))
    // The caught error flipped the boundary into its error state: the children are gone.
    expect(markup).not.toContain('render failed')
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('renders the localized recovery alert once in the errored state', () => {
    mount(() => (
      <RootErrorBoundary>
        <Broken />
      </RootErrorBoundary>
    ))
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toBe('An unexpected error occurred.')
    expect(alert?.className).toBe('flex sp')
    expect(alert?.querySelector('p')?.className).toBe('textSize fontWeight')
  })
})
