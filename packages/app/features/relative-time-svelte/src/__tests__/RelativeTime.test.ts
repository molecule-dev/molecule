// @vitest-environment jsdom
/**
 * Component tests of the Svelte `RelativeTime`'s locale handling — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.test.tsx`
 * (the same test names): without a `locale` prop the label formats in the
 * app's active i18n locale and follows a locale switch; an explicit `locale`
 * still wins. Rendered with a real mount (jsdom) against the bonded provider.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import RelativeTime from '../RelativeTime.svelte'

/** Five minutes before the real clock — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60_000).toISOString()

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  await provider.setLocale('en')
})

/**
 * Mounts the component and returns its host element.
 *
 * @param props - Props over `RelativeTime`.
 * @returns The host element whose content the component rendered.
 */
async function mountComponent(props: Record<string, unknown>): Promise<HTMLElement> {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(RelativeTime as never, { target, props }))
  flushSync()
  return target
}

/** The `<time>` element's text. */
const label = (host: HTMLElement): string | null => host.querySelector('time')?.textContent ?? null

describe('RelativeTime locale', () => {
  it('formats in the active app locale when no locale prop is given', async () => {
    const host = await mountComponent({ date: FIVE_MINUTES_AGO })
    expect(label(host)).toBe('5 minutes ago')
  })

  it('switching the provider locale changes the formatted label', async () => {
    const host = await mountComponent({ date: FIVE_MINUTES_AGO })
    expect(label(host)).toBe('5 minutes ago')
    await provider.setLocale('fr')
    flushSync()
    expect(label(host)).toBe('il y a 5 minutes')
  })

  it('an explicit locale prop still wins over the active app locale', async () => {
    const host = await mountComponent({ date: FIVE_MINUTES_AGO, locale: 'en-US' })
    expect(label(host)).toBe('5 minutes ago')
    await provider.setLocale('fr')
    flushSync()
    expect(label(host)).toBe('5 minutes ago')
  })
})
