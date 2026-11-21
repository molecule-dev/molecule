// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `ForumThreadRow`'s counter labels. A static `t`
 * reads the bonded provider but nothing subscribes the calling component to
 * locale changes, so after `setLocale('fr')` its labels would stay in the old
 * language. `useTranslation()` from `@molecule/app-react` subscribes, so the
 * component re-renders on the switch. This test bonds a provider with an `en`
 * and a `fr` value for a key the component renders, renders it in `en`,
 * switches to `fr`, and asserts the DOM now shows the French value (the same
 * test `achievement-card-react` runs for its labels).
 *
 * @module
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

const { ForumThreadRow } = await import('../ForumThreadRow.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted root, unmounted after each test. */
let root: Root | null = null
/** The container the root renders into. */
let host: HTMLElement

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'forumThreadRow.label.replies': '{{count}} replies' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'forumThreadRow.label.replies': '{{count}} réponses' },
    },
  ])
  setProvider(provider)
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  host.remove()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ForumThreadRow locale switch', () => {
  it('renders the reply count in French after setLocale', async () => {
    root = createRoot(host)
    await act(async () => {
      root?.render(createElement(ForumThreadRow, { title: 'T', replyCount: 5 }))
    })
    expect(host.textContent).toContain('5 replies')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays '5 replies' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })

    expect(host.textContent).toContain('5 réponses')
    expect(host.textContent).not.toContain('5 replies')
  })
})
