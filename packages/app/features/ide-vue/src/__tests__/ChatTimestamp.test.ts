// @vitest-environment jsdom
/**
 * `ChatTimestamp` rendered for real: the component describe of
 * `@molecule/app-ide-react`'s `__tests__/chat-timestamps.test.tsx`, ported
 * with the same test names and the same assertions, mounted as a real Vue
 * app. (The file's other describes — the utilities, the registry and the
 * `useChatTimestampsVisible` hook — live in `chat-timestamps.test.ts`.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatTimestamp } from '../components/ChatTimestamp.js'
import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'

const MINUTE = 60_000
// Local noon, so "earlier today" / "another day" do not depend on the runner's time zone.
const NOW = new Date(2026, 8, 13, 12, 0, 0).getTime()

/** The apps this file mounted; unmounted after every test, like React's roots. */
const apps: App[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts a component as a real app.
 *
 * @param setup - The setup body (a hook subscription), when it needs one.
 * @param render - The template, when it renders one.
 * @returns The host element the app mounted into.
 */
function mount(setup?: () => void, render?: () => VNodeChild): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ setup, render }))
  apps.push(app)
  app.mount(host)
  return host
}

describe('ChatTimestamp', () => {
  it('renders a <time> with the ISO instant', () => {
    const host = mount(undefined, () => h(ChatTimestamp, { timestamp: Date.now() - 5 * MINUTE }))
    const time = host.querySelector('[data-mol-id="chat-timestamp"]')
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('advances its label as minutes pass', async () => {
    vi.useFakeTimers({ now: NOW })
    // Subscribe first so the shared clock starts at NOW.
    mount(() => {
      useMinuteNow()
    })
    const host = mount(undefined, () => h(ChatTimestamp, { timestamp: NOW - 3 * MINUTE }))
    const label = (): string | null | undefined =>
      host.querySelector('[data-mol-id="chat-timestamp"]')?.textContent
    expect(label()).toBe('3 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    await nextTick()
    expect(label()).toBe('4 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    await nextTick()
    expect(label()).toBe('5 minutes ago')
  })

  it('re-formats its label in the new language on a locale switch', async () => {
    const i18n = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
    ])
    setProvider(i18n)
    vi.useFakeTimers({ now: NOW })
    mount(() => {
      useMinuteNow()
    })
    const host = mount(undefined, () => h(ChatTimestamp, { timestamp: NOW - 5 * MINUTE }))
    const label = (): string | null | undefined =>
      host.querySelector('[data-mol-id="chat-timestamp"]')?.textContent
    expect(label()).toBe('5 minutes ago')
    await i18n.setLocale('fr')
    await nextTick()
    expect(label()).toBe('il y a 5 minutes')
  })
})
