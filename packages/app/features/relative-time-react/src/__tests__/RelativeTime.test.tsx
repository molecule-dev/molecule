// @vitest-environment jsdom
/**
 * Component tests of `RelativeTime`'s locale handling: without a `locale`
 * prop the label formats in the app's active i18n locale and follows a
 * locale switch; an explicit `locale` still wins. The ports carry the same
 * test names against their own binding's `useLocale`.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.js'

/** Five minutes before the real clock — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60_000).toISOString()

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
])
setProvider(provider)

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  await act(async () => {
    await provider.setLocale('en')
  })
})

/**
 * Mounts the component and returns its `<time>` text.
 *
 * @param props - Props over `RelativeTime`.
 * @returns The host element.
 */
async function mount(props: Record<string, unknown>): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(RelativeTime, { date: FIVE_MINUTES_AGO, ...props }))
  })
  return host
}

describe('RelativeTime locale', () => {
  it('formats in the active app locale when no locale prop is given', async () => {
    const container = await mount({})
    expect(container.querySelector('time')?.textContent).toBe('5 minutes ago')
  })

  it('switching the provider locale changes the formatted label', async () => {
    const container = await mount({})
    expect(container.querySelector('time')?.textContent).toBe('5 minutes ago')
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('time')?.textContent).toBe('il y a 5 minutes')
  })

  it('an explicit locale prop still wins over the active app locale', async () => {
    const container = await mount({ locale: 'en-US' })
    expect(container.querySelector('time')?.textContent).toBe('5 minutes ago')
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('time')?.textContent).toBe('5 minutes ago')
  })
})
