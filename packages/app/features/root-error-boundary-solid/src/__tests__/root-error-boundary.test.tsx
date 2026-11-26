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
import { createRoot } from 'solid-js'
import { insert } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
 * Mounts the boundary around `view` in a fresh container.
 *
 * `<RootErrorBoundary>` cannot be written as a TSX element: the component is
 * declared as returning an `Accessor` (the memo Solid's own `ErrorBoundary`
 * renders), and `JSX.Element` is not a function type, so TSX rejects it with
 * TS2786. Solid renders that accessor as a reactive computation, so the mount
 * hands it to `insert` — the same call `render` makes for a TSX element.
 *
 * `children` is a getter because that is what a JSX child compiles to: the
 * boundary reads it inside its own error scope, so a throwing child is caught
 * by the boundary instead of the mount.
 *
 * @param view - The tree the boundary guards.
 * @returns The container the boundary rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = createRoot((disposeRoot) => {
    insert(
      container,
      RootErrorBoundary({
        get children() {
          return view()
        },
      }),
    )
    return disposeRoot
  })
  // `render`'s disposer also empties the container; without it a fallback alert
  // from an earlier test would stay in the document and answer a later query.
  disposers.push(() => {
    dispose()
    container.textContent = ''
  })
  return container
}

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', () => {
    const markup = mount(() => <main data-app="">app content</main>).innerHTML
    expect(markup).toContain('data-app=""')
    expect(markup).toContain('app content')
  })

  it('derives the error state from a thrown error', () => {
    const markup = mount(() => <Broken />).innerHTML
    // The caught error flipped the boundary into its error state: the children are gone.
    expect(markup).not.toContain('render failed')
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('renders the localized recovery alert once in the errored state', () => {
    mount(() => <Broken />)
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toBe('An unexpected error occurred.')
    expect(alert?.className).toBe('flex sp')
    expect(alert?.querySelector('p')?.className).toBe('textSize fontWeight')
  })
})
