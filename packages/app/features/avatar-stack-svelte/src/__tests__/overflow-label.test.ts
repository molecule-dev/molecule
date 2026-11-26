// @vitest-environment jsdom
/**
 * The Svelte `AvatarStack`'s overflow chip reads both of its strings from the
 * `avatarStack.*` translations — the counterpart of
 * `@molecule/app-avatar-stack-react/src/__tests__/overflow-label.test.tsx`,
 * with the same test name.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock avatar-stack.test.ts uses.
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

// `Avatar` is the only `@molecule/app-ui-svelte` dependency — the same stub
// avatar-stack.test.ts uses.
vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar }
})

import { flushSync, mount, unmount } from 'svelte'

import type { I18nProvider, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AvatarStack } from '../components.js'

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

const teardowns: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const teardown of teardowns.splice(0)) await teardown()
  // Reset the global i18n singleton to a clean English provider so the French
  // values can't bleed into the next test.
  setProvider(createSimpleI18nProvider('en'))
})

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
    const host = document.createElement('div')
    document.body.appendChild(host)
    const instance = mount(AvatarStack, { target: host, props: { people, max: 4 } })
    flushSync()
    teardowns.push(async () => {
      await unmount(instance)
      host.remove()
    })

    const chip = host.querySelector('span[aria-label]')
    if (!chip) throw new Error('no overflow chip rendered')
    // Six people, four visible: the count goes where the French value puts {{count}}.
    expect(chip.getAttribute('aria-label')).toBe('+2 de plus')
    expect(chip.textContent).toBe('»2')

    // The mounted chip follows the provider. English carries no value for
    // either key, so the component's own defaults render.
    await provider.setLocale('en')
    flushSync()
    expect(chip.getAttribute('aria-label')).toBe('+2 more')
    expect(chip.textContent).toBe('+2')
  })
})
