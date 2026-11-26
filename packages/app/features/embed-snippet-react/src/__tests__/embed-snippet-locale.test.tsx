// @vitest-environment jsdom
/**
 * Locale-switch test for `EmbedSnippet`: with a provider that carries English
 * and French, switching the provider's locale re-renders every translated
 * label, while the generated embed code — marked `translate="no"` — keeps the
 * caller's template untouched.
 *
 * @module
 */

import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { EmbedSnippet } from '../EmbedSnippet.js'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

// The bonded French translations (@molecule/app-locales-embed-snippet's fr),
// inlined so this package needs no dependency on the locale bond.
const FRENCH = {
  'embedSnippet.heading': "Code d'intégration",
  'embedSnippet.eyebrow': "Copier le code d'intégration",
  'embedSnippet.copy': 'Copier',
  'embedSnippet.copied': 'Copié !',
}

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('<EmbedSnippet> locale switch', () => {
  it('switching the locale changes the translated labels', async () => {
    const i18n = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'fr', name: 'French', direction: 'ltr', translations: FRENCH },
    ])
    const { container } = render(
      <I18nProvider provider={i18n}>
        <EmbedSnippet template={TEMPLATE} />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      'Copy',
    )

    await act(async () => {
      await i18n.setLocale('fr')
    })
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      "Code d'intégration",
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      "Copier le code d'intégration",
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      'Copier',
    )
    // The embed code is code, not prose: the switch leaves it as written.
    expect(container.querySelector('[data-mol-id="embed-snippet-code"]')?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
    expect(
      container.querySelector('[data-mol-id="embed-snippet-code"]')?.getAttribute('translate'),
    ).toBe('no')

    // A copy after the switch announces the French feedback.
    fireEvent.click(
      container.querySelector('[data-mol-id="embed-snippet-copy-button"]') as HTMLButtonElement,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      'Copié !',
    )
  })
})
