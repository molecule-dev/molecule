// @vitest-environment jsdom

/**
 * Locale-switch reactivity for InboxRow's star aria-label — the Vue port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row-locale-switch.test.tsx`.
 *
 * `useTranslation()` from `@molecule/app-vue` subscribes the calling component
 * to the provider's locale notifications; its `t` reads the notification
 * version, so a component that translates during render re-renders on a
 * switch. This test bonds a provider with an `en` and a `fr` value for a key
 * the component renders, renders it in `en`, switches to `fr`, and asserts the
 * DOM now shows the French value.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    Avatar: defineComponent({
      name: 'Avatar',
      props: { src: String, alt: String, name: String, size: String },
      setup(props) {
        return () =>
          h('img', {
            'data-avatar': props.src ?? '',
            'data-avatar-name': props.alt ?? props.name ?? '',
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { InboxRow } from '../InboxRow.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'inboxRow.star': 'Star' } },
    { code: 'fr', name: 'French', translations: { 'inboxRow.star': 'Favori' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InboxRow locale switch', () => {
  it('renders the star aria-label in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () => h(InboxRow, { sender: 'Alice', subject: 'Lunch?', onToggleStar: () => {} }),
      }),
    )
    app.mount(host)
    expect(host.querySelector('button[aria-label="Star"]')).not.toBeNull()

    // The switch itself: the row must re-render in French. Against a
    // non-reactive `t` this stays 'Star' — nothing subscribed it.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.querySelector('button[aria-label="Favori"]')).not.toBeNull()
    expect(host.querySelector('button[aria-label="Star"]')).toBeNull()
    app.unmount()
    host.remove()
  })
})
