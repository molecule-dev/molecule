// @vitest-environment jsdom
/**
 * Locale-switch reactivity for HttpInspector's labels and placeholders.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so the component re-renders on a locale switch. This
 * test bonds a provider with an `en` and a `fr` table for the keys the
 * component renders, renders it in `en`, switches to `fr` through `act`, and
 * asserts the DOM now shows the French values.
 *
 * @module
 */

import type { ReactNode } from 'react'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

// The markers the main suite renders, carrying every attribute the component
// passes (the real components spread rest props onto the native element).
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Input: (props: {
    value?: string
    'aria-label'?: string
    placeholder?: string
    translate?: string
    className?: string
  }) =>
    createElement('input', {
      'data-input': '',
      value: props.value,
      'aria-label': props['aria-label'],
      placeholder: props.placeholder,
      translate: props.translate,
      className: props.className,
      readOnly: true,
    }),
  Select: (props: {
    value?: string
    'aria-label'?: string
    translate?: string
    options?: { value: string; label: string }[]
  }) =>
    createElement(
      'select',
      {
        'data-select': '',
        'data-value': props.value,
        'aria-label': props['aria-label'],
        translate: props.translate,
      },
      props.options?.map((option) =>
        createElement('option', { value: option.value }, option.label),
      ),
    ),
  Textarea: (props: { value?: string; placeholder?: string; translate?: string; rows?: number }) =>
    createElement('textarea', {
      'data-textarea': '',
      value: props.value,
      placeholder: props.placeholder,
      translate: props.translate,
      rows: props.rows,
      readOnly: true,
    }),
}))

const { HttpInspector } = await import('../HttpInspector.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
let root: Root | null = null
let host: HTMLElement | null = null

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

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HttpInspector locale switch', () => {
  it('renders the labels in French after setLocale', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        createElement(HttpInspector, {
          method: 'POST',
          onMethodChange: () => {},
          url: 'https://api.test/v1',
          onUrlChange: () => {},
          headers: [{ key: 'Accept', value: 'application/json' }],
          onHeadersChange: () => {},
          body: '{}',
          onBodyChange: () => {},
          onSend: () => {},
        }),
      )
    })
    const select = host.querySelector('select')!
    const url = host.querySelector('input[data-input]')!
    const header = host.querySelector('input[placeholder="Header"]')!
    const value = host.querySelector('input[placeholder="Value"]')!
    expect(select.getAttribute('aria-label')).toBe('HTTP method')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('Header')
    expect(value.getAttribute('placeholder')).toBe('Value')

    // The switch itself: the labels must follow it at once.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(select.getAttribute('aria-label')).toBe('Méthode HTTP')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('En-tête')
    expect(value.getAttribute('placeholder')).toBe('Valeur')
  })
})
