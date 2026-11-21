// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid `HttpInspector`'s labels and
 * placeholders — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-solid` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * table for the keys the component renders, renders it in `en`, switches to
 * `fr`, and asserts the DOM now shows the French values.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; disabled?: boolean }) => (
    <button data-button="" disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Input: (props: {
    value?: string
    'aria-label'?: string
    placeholder?: string
    translate?: string
    className?: string
  }) => (
    <input
      data-input=""
      attr:value={props.value}
      aria-label={props['aria-label']}
      placeholder={props.placeholder}
      attr:translate={props.translate}
      class={props.className}
      readOnly
    />
  ),
  Select: (props: {
    value?: string
    'aria-label'?: string
    translate?: string
    options?: { value: string; label: string }[]
  }) => (
    <select
      data-select=""
      data-value={props.value}
      aria-label={props['aria-label']}
      attr:translate={props.translate}
    >
      {props.options?.map((option) => (
        <option value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  Textarea: (props: {
    value?: string
    placeholder?: string
    translate?: string
    rows?: number
  }) => (
    <textarea
      data-textarea=""
      value={props.value}
      placeholder={props.placeholder}
      attr:translate={props.translate}
      rows={props.rows}
      readOnly
    />
  ),
}))

const { HttpInspector } = await import('../HttpInspector.jsx')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

const disposers: Array<() => void> = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
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
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('HttpInspector locale switch', () => {
  it('renders the labels in French after setLocale', async () => {
    const host = mount(() => (
      <HttpInspector
        method="POST"
        onMethodChange={() => {}}
        url="https://api.test/v1"
        onUrlChange={() => {}}
        headers={[{ key: 'Accept', value: 'application/json' }]}
        onHeadersChange={() => {}}
        body="{}"
        onBodyChange={() => {}}
        onSend={() => {}}
      />
    ))
    const select = host.querySelector('select')!
    const url = host.querySelector('input[data-input]')!
    const header = host.querySelector('input[placeholder="Header"]')!
    const value = host.querySelector('input[placeholder="Value"]')!
    expect(select.getAttribute('aria-label')).toBe('HTTP method')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('Header')
    expect(value.getAttribute('placeholder')).toBe('Value')

    // The switch itself: the labels must follow it at once.
    await provider.setLocale('fr')

    expect(select.getAttribute('aria-label')).toBe('Méthode HTTP')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('En-tête')
    expect(value.getAttribute('placeholder')).toBe('Valeur')
  })
})
