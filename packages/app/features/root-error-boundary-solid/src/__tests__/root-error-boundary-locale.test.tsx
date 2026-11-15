// @vitest-environment jsdom
/**
 * Locale test for the Solid `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary-locale.test.tsx`:
 * after a language switch the errored boundary's recovery message is in the
 * new language.
 *
 * @module
 */

import { render } from 'solid-js/web'
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
    const container = document.createElement('div')
    document.body.append(container)
    disposers.push(
      render(
        () => (
          <RootErrorBoundary>
            <Broken />
          </RootErrorBoundary>
        ),
        container,
      ),
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'An unexpected error occurred.',
    )

    await provider.setLocale('fr')

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Une erreur inattendue s'est produite.",
    )
  })
})
