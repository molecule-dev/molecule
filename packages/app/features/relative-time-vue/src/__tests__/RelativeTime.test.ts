// @vitest-environment jsdom
/**
 * Component tests of the Vue `RelativeTime`'s locale handling — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.test.tsx`
 * (the same test names): without a `locale` prop the label formats in the
 * app's active i18n locale and follows a locale switch; an explicit `locale`
 * still wins. Rendered with Vue in jsdom against the bonded provider.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.js'
import type { RelativeTimeProps } from '../types.js'

/** Five minutes before the real clock — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60_000).toISOString()

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** The apps mounted during one test, unmounted in `afterEach`. */
const mounted: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

afterEach(async () => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
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
  const app = createApp(defineComponent({ render: () => h(RelativeTime, { ...props }) }))
  app.mount(host)
  mounted.push({ app, host })
  await nextTick()
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
    await nextTick()
    expect(label(host)).toBe('il y a 5 minutes')
  })

  it('an explicit locale prop still wins over the active app locale', async () => {
    const host = await mount({ date: FIVE_MINUTES_AGO, locale: 'en-US' })
    expect(label(host)).toBe('5 minutes ago')
    await provider.setLocale('fr')
    await nextTick()
    expect(label(host)).toBe('5 minutes ago')
  })
})
