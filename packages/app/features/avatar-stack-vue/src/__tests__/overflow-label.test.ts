// @vitest-environment jsdom
/**
 * The Vue `AvatarStack`'s overflow chip reads both of its strings from the
 * `avatarStack.*` translations — the counterpart of
 * `@molecule/app-avatar-stack-react/src/__tests__/overflow-label.test.tsx`,
 * with the same test name.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.sp('ml', 2)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Avatar` is the only `@molecule/app-ui-vue` dependency — stub it to an
// inspectable <img>, as avatar-stack.test.ts does.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: defineComponent({
      name: 'Avatar',
      props: { src: String, alt: String, name: String, size: String },
      setup(props) {
        return () =>
          h('img', { 'data-avatar': props.src ?? '', 'data-avatar-name': props.name ?? '' })
      },
    }),
  }
})

import { type Component, createApp, defineComponent, h, nextTick, type RawProps } from 'vue'

import type { I18nProvider, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AvatarStack } from '../AvatarStack.js'

/** French values for both keys. Neither equals its English default. */
const FRENCH: Translations = {
  'avatarStack.more': '+{{count}} de plus',
  'avatarStack.overflowPrefix': '»',
}

/** The bonded provider from `beforeEach`, so a locale switch drives the one the chip reads. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('fr', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: FRENCH },
  ])
  setProvider(provider)
})

const mounted: Array<() => void> = []

afterEach(() => {
  for (const teardown of mounted.splice(0)) teardown()
  // Reset the global i18n singleton to a clean English provider so the French
  // values can't bleed into the next test.
  setProvider(createSimpleI18nProvider('en'))
})

/** Mounts one component and returns its live host element. */
const mount = (component: Component, props: RawProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

const people = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Carol' },
  { name: 'Dave' },
  { name: 'Eve' },
  { name: 'Frank' },
]

describe('AvatarStack', () => {
  it('translates the overflow label through the avatarStack keys', async () => {
    const host = mount(AvatarStack, { people, max: 4 })
    const chip = host.querySelector('span[aria-label]')
    if (!chip) throw new Error('no overflow chip rendered')
    // Six people, four visible: the count goes where the French value puts {{count}}.
    expect(chip.getAttribute('aria-label')).toBe('+2 de plus')
    expect(chip.textContent).toBe('»2')

    // The mounted chip follows the provider. English carries no value for
    // either key, so the component's own defaults render.
    await provider.setLocale('en')
    await nextTick()
    expect(chip.getAttribute('aria-label')).toBe('+2 more')
    expect(chip.textContent).toBe('+2')
  })
})
