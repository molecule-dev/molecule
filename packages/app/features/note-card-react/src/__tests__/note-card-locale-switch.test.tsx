// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `NoteCard`'s pinned marker label — the same
 * shape as `@molecule/app-achievement-card-react`'s locale-switch test. A
 * static `t` reads the bonded provider but nothing subscribes the calling
 * component to locale changes, so after `setLocale('fr')` the label stayed in
 * the old language. `useTranslation()` from `@molecule/app-react` subscribes
 * through `useSyncExternalStore`, so the card re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` value for the pinned label,
 * renders the card in `en`, switches to `fr`, and asserts the label followed.
 *
 * @module
 */

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

const { NoteCard } = await import('../NoteCard.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted root, unmounted after each test. */
let root: Root | null = null
/** The container the card renders into. */
let host: HTMLElement | null = null

/** The pinned marker's accessible label in the current DOM. */
const pinnedLabel = (): string | null | undefined =>
  host?.querySelector('span[role="img"]')?.getAttribute('aria-label')

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'noteCard.aria.pinned': 'Pinned' } },
    { code: 'fr', name: 'French', translations: { 'noteCard.aria.pinned': 'Épinglé' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  if (root) {
    const r = root
    root = null
    act(() => {
      r.unmount()
    })
  }
  host?.remove()
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('NoteCard locale switch', () => {
  it('renders the pinned label in French after setLocale', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(createElement(NoteCard, { body: 'b', pinned: true }))
    })
    expect(pinnedLabel()).toBe('Pinned')

    // The switch itself: the label must re-render in French. Against the
    // static `t` this stays 'Pinned' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(pinnedLabel()).toBe('Épinglé')
  })
})
