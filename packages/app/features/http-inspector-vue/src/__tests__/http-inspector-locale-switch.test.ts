// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `HttpInspector`'s labels and
 * placeholders — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from `@molecule/app-vue`
 * subscribes to the provider, so the component re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` table for the keys the
 * component renders, renders it in `en`, switches to `fr`, and asserts the DOM
 * now shows the French values.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type PropType } from 'vue'

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

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  const button = defineComponent({
    name: 'MockButton',
    inheritAttrs: false,
    props: { disabled: { type: Boolean, default: undefined } },
    setup(props, { slots }) {
      return () => h('button', { 'data-button': '', disabled: props.disabled }, slots.default?.())
    },
  })
  const input = defineComponent({
    name: 'MockInput',
    inheritAttrs: false,
    props: { value: { type: String, default: undefined } },
    setup(props, { attrs }) {
      return () =>
        h('input', {
          'data-input': '',
          value: props.value,
          'aria-label': attrs['aria-label'],
          placeholder: attrs.placeholder,
          translate: attrs.translate,
          readOnly: true,
        })
    },
  })
  const select = defineComponent({
    name: 'MockSelect',
    inheritAttrs: false,
    props: {
      value: { type: String, default: undefined },
      options: { type: Array as PropType<{ value: string; label: string }[]>, default: () => [] },
    },
    setup(props, { attrs }) {
      return () =>
        h(
          'select',
          {
            'data-select': '',
            'data-value': props.value,
            'aria-label': attrs['aria-label'],
            translate: attrs.translate,
          },
          props.options.map((option) => h('option', { value: option.value }, [option.label])),
        )
    },
  })
  const textarea = defineComponent({
    name: 'MockTextarea',
    inheritAttrs: false,
    props: { value: { type: String, default: undefined } },
    setup(props, { attrs }) {
      return () =>
        h('textarea', {
          'data-textarea': '',
          value: props.value,
          placeholder: attrs.placeholder,
          translate: attrs.translate,
          readOnly: true,
        })
    },
  })
  return { Button: button, Input: input, Select: select, Textarea: textarea }
})

const { HttpInspector } = await import('../HttpInspector.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

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
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HttpInspector locale switch', () => {
  it('renders the labels in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(HttpInspector, {
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
      }),
    )
    app.mount(host)
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
    await nextTick()

    expect(select.getAttribute('aria-label')).toBe('Méthode HTTP')
    expect(url.getAttribute('aria-label')).toBe('URL')
    expect(header.getAttribute('placeholder')).toBe('En-tête')
    expect(value.getAttribute('placeholder')).toBe('Valeur')
  })
})
