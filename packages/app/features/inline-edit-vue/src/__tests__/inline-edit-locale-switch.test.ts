// @vitest-environment jsdom
/**
 * The Vue `InlineEdit`'s editor field label follows the provider's locale — a
 * port of `@molecule/app-inline-edit-react`'s `inline-edit-locale-switch.test.tsx`:
 * the same test name and assertion, rendered with Vue in jsdom.
 *
 * `useTranslation()` subscribes the component to the provider's locale
 * notifications, so its template re-renders on `setLocale`. This test bonds a
 * provider with an `en` and a `fr` value for `inlineEdit.aria.edit`, opens the
 * editor in `en` (the key is untranslated there, so the English default
 * shows), switches to `fr`, and asserts the label is now French.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The same markers the React suite's UI mocks render.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, size: String, color: String, disabled: Boolean },
      emits: ['click'],
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Input: defineComponent({
      name: 'Input',
      props: { type: String, value: String, ariaLabel: String },
      setup(props) {
        return () => h('input', { 'data-input': '', 'aria-label': props.ariaLabel })
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      props: { value: String, ariaLabel: String },
      setup(props) {
        return () => h('textarea', { 'data-textarea': '', 'aria-label': props.ariaLabel })
      },
    }),
  }
})

import { InlineEdit } from '../InlineEdit.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: { 'inlineEdit.aria.edit': 'Modifier' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InlineEdit locale switch', () => {
  it('switches the editor field label with the provider locale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () => h(InlineEdit, { value: 'Hello world', onSubmit: () => {} }),
      }),
    )
    app.mount(host)
    const trigger = host.querySelector('[role="button"]')
    if (!trigger) throw new Error('no read-state trigger rendered')
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Edit')

    // The switch itself: the label must follow the provider. Against the
    // hardcoded `placeholder ?? 'Edit'` fallback this stayed English.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Modifier')
    app.unmount()
  })
})
