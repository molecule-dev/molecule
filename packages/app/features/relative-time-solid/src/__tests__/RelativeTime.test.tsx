// @vitest-environment jsdom
/**
 * Component tests of the Solid `RelativeTime`'s locale handling — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.test.tsx`
 * (the same test names): without a `locale` prop the label formats in the
 * app's active i18n locale and follows a locale switch; an explicit `locale`
 * still wins. Rendered with Solid in jsdom against the bonded provider.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.jsx'
import type { RelativeTimeProps } from '../types.js'

/** Five minutes before the real clock — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60_000).toISOString()

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
])
setProvider(provider)

const disposers: Array<() => void> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
  await provider.setLocale('en')
})

/**
 * Mounts the component and returns its host element.
 *
 * @param props - Props over `RelativeTime`.
 * @returns The host element whose content the component rendered.
 */
async function mount(props: RelativeTimeProps): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <RelativeTime {...props} />, host))
  return host
}

/** The `<time>` element's text. */
const label = (host: HTMLElement): string | null => host.querySelector('time')?.textContent ?? null

describe('RelativeTime locale', () => {
  it('formats in the active app locale when no locale prop is given', async () => {
    const host = await mount({ date: FIVE_MINUTES_AGO })
    expect(label(host)).toBe('5 minutes ago')
  })

  it('switching the provider locale changes the formatted label', async () => {
    const host = await mount({ date: FIVE_MINUTES_AGO })
    expect(label(host)).toBe('5 minutes ago')
    await provider.setLocale('fr')
    expect(label(host)).toBe('il y a 5 minutes')
  })

  it('an explicit locale prop still wins over the active app locale', async () => {
    const host = await mount({ date: FIVE_MINUTES_AGO, locale: 'en-US' })
    expect(label(host)).toBe('5 minutes ago')
    await provider.setLocale('fr')
    expect(label(host)).toBe('5 minutes ago')
  })
})
