// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

const { RootErrorBoundary } = await import('../components.js')

/** A snippet whose render fails, so the boundary shows its recovery alert. */
function Broken(): Snippet {
  return createRawSnippet(() => ({
    render: () => {
      throw new Error('render failed')
    },
  }))
}

const mounted: Array<{ unmount: () => void }> = []
afterEach(() => {
  for (const instance of mounted.splice(0)) instance.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the boundary with the given children and returns the document markup.
 *
 * @param children - The children to guard.
 * @returns The rendered markup.
 */
const mountBoundary = (children?: Snippet): string => {
  const instance = mount(RootErrorBoundary, {
    target: document.body,
    props: children ? { children } : {},
  })
  mounted.push({ unmount: () => void unmount(instance) })
  flushSync()
  return document.body.innerHTML
}

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', () => {
    const markup = mountBoundary(
      createRawSnippet(() => ({ render: () => '<main data-app="">app content</main>' })),
    )
    expect(markup).toContain('data-app=""')
    expect(markup).toContain('app content')
  })

  it('derives the error state from a thrown error', () => {
    const markup = mountBoundary(Broken())
    // The caught error flipped the boundary into its error state: the children are gone.
    expect(markup).not.toContain('render failed')
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('renders the localized recovery alert once in the errored state', () => {
    mountBoundary(Broken())
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toBe('An unexpected error occurred.')
    expect(alert?.className).toBe('flex sp')
    expect(alert?.querySelector('p')?.className).toBe('textSize fontWeight')
  })
})
