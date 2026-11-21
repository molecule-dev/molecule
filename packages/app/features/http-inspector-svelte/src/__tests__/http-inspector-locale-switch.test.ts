// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `HttpInspector`'s labels and placeholders — a
 * port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-locale-switch.test.tsx`:
 * the same test name and assertion. Every `t(…)` runs inside a `$derived`, so
 * the component re-renders on the switch. This test bonds a provider with an
 * `en` and a `fr` table for the keys the component renders, renders it in
 * `en`, switches to `fr`, and asserts the DOM now shows the French values.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import HttpInspector from '../HttpInspector.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The current case's root element. */
const root = (): HTMLElement => document.body.firstElementChild as HTMLElement

/**
 * Mounts `HttpInspector` with the props a caller supplies.
 *
 * @returns The rendered root element.
 */
function render(): HTMLElement {
  document.body.innerHTML = ''
  mount(HttpInspector, {
    target: document.body,
    props: {
      method: 'POST',
      onMethodChange: () => {},
      url: 'https://api.test/v1',
      onUrlChange: () => {},
      headers: [{ key: 'Accept', value: 'application/json' }],
      onHeadersChange: () => {},
      body: '{}',
      onBodyChange: () => {},
      onSend: () => {},
    },
  })
  flushSync()
  return root()
}

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: {
        'httpInspector.methodLabel': 'HTTP method',
        'httpInspector.urlLabel': 'URL',
        'httpInspector.headerPlaceholder': 'Header',
        'httpInspector.valuePlaceholder': 'Value',
      },
    },
    {
      code: 'fr',
      name: 'French',
      direction: 'ltr',
      translations: {
        'httpInspector.methodLabel': 'Méthode HTTP',
        'httpInspector.urlLabel': 'URL',
        'httpInspector.headerPlaceholder': 'En-tête',
        'httpInspector.valuePlaceholder': 'Valeur',
      },
    },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the bonded i18n provider so a locale set in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HttpInspector locale switch', () => {
  it('renders the labels in French after setLocale', async () => {
    const el = render()
    const select = el.querySelector('select')!
    // The real UI inputs carry class names, not test markers: the URL field,
    // then the header row's key and value fields, in render order.
    const [url, header, value] = el.querySelectorAll('input')
    expect(select.getAttribute('aria-label')).toBe('HTTP method')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('Header')
    expect(value.getAttribute('placeholder')).toBe('Value')

    // The switch itself: the labels must follow it at once.
    await provider.setLocale('fr')
    flushSync()

    expect(select.getAttribute('aria-label')).toBe('Méthode HTTP')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('En-tête')
    expect(value.getAttribute('placeholder')).toBe('Valeur')
  })
})
