// @vitest-environment jsdom
/**
 * Locale test for the Svelte `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary-locale.test.tsx`:
 * after a language switch the errored boundary's recovery message is in the
 * new language.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...classes: unknown[]) => classes.filter((c) => typeof c === 'string').join(' ')
            : () => String(prop),
      },
    ),
}))

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

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

describe('RootErrorBoundary after a language switch', () => {
  it('shows its recovery message in the new language', async () => {
    const provider = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'error.unknown': 'An unexpected error occurred.' },
      },
      {
        code: 'fr',
        name: 'Français',
        translations: { 'error.unknown': "Une erreur inattendue s'est produite." },
      },
    ])
    setProvider(provider)
    const instance = mount(RootErrorBoundary, {
      target: document.body,
      props: { children: Broken() },
    })
    mounted.push({ unmount: () => void unmount(instance) })
    flushSync()
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      'An unexpected error occurred.',
    )

    await provider.setLocale('fr')
    flushSync()

    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "Une erreur inattendue s'est produite.",
    )
  })
})
