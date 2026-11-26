// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `NoteCard`'s pinned marker label —
 * a port of `@molecule/app-note-card-react/src/__tests__/note-card-locale-switch.test.tsx`:
 * the same test name and assertion. A static `t` reads the bonded provider but
 * nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` the label stayed in the old language.
 * `useTranslation()` from `@molecule/app-svelte` subscribes to the provider, so
 * the card re-renders on the switch. This test bonds a provider with an `en`
 * and a `fr` value for the pinned label, renders the card in `en`, switches
 * to `fr`, and asserts the label followed.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

import NoteCard from '../NoteCard.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

/** The pinned marker's accessible label in the mounted card's DOM. */
const pinnedLabel = (target: HTMLElement): string | null =>
  target.querySelector('span[role="img"]')?.getAttribute('aria-label') ?? null

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'noteCard.aria.pinned': 'Pinned' } },
    { code: 'fr', name: 'French', translations: { 'noteCard.aria.pinned': 'Épinglé' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('NoteCard locale switch', () => {
  it('renders the pinned label in French after setLocale', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(NoteCard, {
      target,
      props: { body: 'b', pinned: true },
    })
    flushSync()
    expect(pinnedLabel(target)).toBe('Pinned')

    // The switch itself: the label must re-render in French. Against the
    // static `t` this stays 'Pinned' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()

    expect(pinnedLabel(target)).toBe('Épinglé')
  })
})
