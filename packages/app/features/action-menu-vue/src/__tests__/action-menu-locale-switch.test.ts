// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `ActionMenu`'s trigger label — a port
 * of `@molecule/app-action-menu-react/src/__tests__/action-menu-locale-switch.test.tsx`:
 * the same test name and assertion. The label used to be a prop default
 * (`'Actions'`), which no provider could ever translate or re-render. It now
 * flows through `useTranslation()` from `@molecule/app-vue` and is read in the
 * render function, so the trigger re-renders on a locale switch. This test
 * bonds a provider with an `en` and a `de` value for the key, renders in
 * `en`, switches to `de`, and asserts the aria-label now shows the German
 * value.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

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

vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      emits: ['click'],
      setup(_props, { attrs, slots, emit }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              onClick: (event: MouseEvent) => emit('click', event),
              'aria-label': attrs['aria-label'],
              'aria-haspopup': attrs['aria-haspopup'],
              'aria-expanded': attrs['aria-expanded'],
              'data-mol-id': attrs['data-mol-id'],
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { ActionMenu } from '../ActionMenu.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'actionMenu.aria.trigger': 'Actions' } },
    { code: 'de', name: 'German', translations: { 'actionMenu.aria.trigger': 'Aktionen' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ActionMenu locale switch', () => {
  it('the trigger label follows a locale switch', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () =>
          h(ActionMenu, {
            items: [
              { id: 'edit', label: 'Edit' },
              { id: 'delete', label: 'Delete', destructive: true },
            ],
          }),
      }),
    )
    app.mount(host)
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')

    // The switch itself: the trigger must re-render in German. Against the old
    // prop default this stayed 'Actions' — nothing read the provider.
    await provider.setLocale('de')
    await nextTick()

    expect(trigger?.getAttribute('aria-label')).toBe('Aktionen')
    app.unmount()
  })
})
