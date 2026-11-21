// @vitest-environment jsdom
/**
 * i18n tests for `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real mount (jsdom), the
 * bonded ClassMap and the wired i18n provider. The provider maps each key the
 * component renders to a marked string, so a default that bypassed t() would
 * show up as plain English, and the `translate="no"` elements carrying
 * protocol tokens and example inputs are asserted on the DOM.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import HttpInspector from '../HttpInspector.svelte'
import type { HttpInspectorProps } from '../types.js'

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
const marks = (key: string): string => `«${key}»`
const marked = ['methodLabel', 'urlLabel', 'headerPlaceholder', 'valuePlaceholder'].map((name) => [
  `httpInspector.${name}`,
  marks(`httpInspector.${name}`),
])

/** The i18n provider a wired app supplies to the inspector. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: Object.fromEntries(marked) },
])
setProvider(i18n)

/** The current case's root element. */
const root = (): HTMLElement => document.body.firstElementChild as HTMLElement

/**
 * Mounts `HttpInspector` in a wired molecule context.
 *
 * @param props - The inspector props.
 * @returns The rendered root element.
 */
function render(props: Partial<HttpInspectorProps> = {}): HTMLElement {
  document.body.innerHTML = ''
  mount(HttpInspector, {
    target: document.body,
    props: {
      method: 'GET',
      onMethodChange: () => {},
      url: 'https://api.test/v1',
      onUrlChange: () => {},
      headers: [{ key: 'Accept', value: 'application/json' }],
      onHeadersChange: () => {},
      body: '',
      onBodyChange: () => {},
      onSend: () => {},
      ...props,
    },
  })
  flushSync()
  return root()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('HttpInspector i18n', () => {
  it('takes the method and URL labels through i18n', () => {
    const el = render()
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe(
      marks('httpInspector.methodLabel'),
    )
    expect(el.querySelector('input[aria-label]')?.getAttribute('aria-label')).toBe(
      marks('httpInspector.urlLabel'),
    )
  })

  it('takes the header and value placeholders through i18n', () => {
    const el = render()
    // The header row's key and value fields are the second and third inputs
    // (the first is the URL field).
    const [, header, value] = el.querySelectorAll('input')
    expect(header.getAttribute('placeholder')).toBe(marks('httpInspector.headerPlaceholder'))
    expect(value.getAttribute('placeholder')).toBe(marks('httpInspector.valuePlaceholder'))
  })

  it('marks the method options as never translatable', () => {
    const el = render()
    expect(el.querySelector('select')?.getAttribute('translate')).toBe('no')
    expect(el.querySelector('option')?.textContent).toBe('GET')
  })

  it('marks the example URL and body placeholders as never translatable', () => {
    const el = render({ method: 'POST', headers: [], body: '{}' })
    expect(
      el
        .querySelector('input[placeholder="https://api.example.com/v1/resources"]')
        ?.getAttribute('translate'),
    ).toBe('no')
    expect(el.querySelector('textarea')?.getAttribute('translate')).toBe('no')
  })
})
