// @vitest-environment jsdom
/**
 * `ChatTimestamp` rendered for real: the component describe of
 * `@molecule/app-ide-react`'s `__tests__/chat-timestamps.test.tsx`, ported
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`. (The file's other describes — the utilities, the
 * registry and the `useChatTimestampsVisible` hook — live in
 * `chat-timestamps.test.ts`.)
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import ChatTimestamp from '../components/ChatTimestamp.svelte'

const MINUTE = 60_000
// Local noon, so "earlier today" / "another day" do not depend on the runner's time zone.
const NOW = new Date(2026, 8, 13, 12, 0, 0).getTime()

/** The mounts alive right now; unmounted after every test, like React's roots. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the timestamp with fixed props.
 *
 * @param timestamp - Epoch milliseconds of the message or event.
 * @returns The host element the component mounted into.
 */
function mountTimestamp(timestamp: number): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ChatTimestamp, {
    target: container,
    props: { timestamp },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

/** The label `<time>` of a mounted timestamp. */
function label(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-mol-id="chat-timestamp"]')?.textContent
}

describe('ChatTimestamp', () => {
  it('renders a <time> with the ISO instant', () => {
    const host = mountTimestamp(Date.now() - 5 * MINUTE)
    const time = host.querySelector('[data-mol-id="chat-timestamp"]')
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('advances its label as minutes pass', () => {
    vi.useFakeTimers({ now: NOW })
    // Mounting subscribes the shared minute clock, which restarts at NOW —
    // what React's `renderHook(() => useMinuteNow())` before `render` does.
    const host = mountTimestamp(NOW - 3 * MINUTE)
    expect(label(host)).toBe('3 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    flushSync()
    expect(label(host)).toBe('4 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    flushSync()
    expect(label(host)).toBe('5 minutes ago')
  })

  it('re-formats its label in the new language on a locale switch', async () => {
    const i18n = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
    ])
    setProvider(i18n)
    vi.useFakeTimers({ now: NOW })
    const host = mountTimestamp(NOW - 5 * MINUTE)
    expect(label(host)).toBe('5 minutes ago')
    await i18n.setLocale('fr')
    flushSync()
    expect(label(host)).toBe('il y a 5 minutes')
  })
})
