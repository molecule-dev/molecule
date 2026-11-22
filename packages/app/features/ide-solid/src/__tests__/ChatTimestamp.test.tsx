// @vitest-environment jsdom
/**
 * `ChatTimestamp` rendered for real: the component describe of
 * `@molecule/app-ide-react`'s `__tests__/chat-timestamps.test.tsx`, ported
 * with the same test names and the same assertions, mounted through Solid's
 * own `render`. (The file's other describes — the utilities, the registry and
 * the `useChatTimestampsVisible` hook — live in `chat-timestamps.test.tsx`.)
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatTimestamp } from '../components/ChatTimestamp.jsx'
import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'

const MINUTE = 60_000
// Local noon, so "earlier today" / "another day" do not depend on the runner's time zone.
const NOW = new Date(2026, 8, 13, 12, 0, 0).getTime()

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/** Lets Solid's queued effects settle — microtasks only, so fake timers keep working. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/**
 * Mounts a component whose body subscribes one hook, the way an app does.
 *
 * @param body - The body.
 * @returns The host element.
 */
function mountBody(body: () => JSX.Element): HTMLElement {
  mounted.dispose?.()
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  mounted.dispose = render(body, container)
  return container
}

/** The label `<time>` of a mounted timestamp. */
function label(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-mol-id="chat-timestamp"]')?.textContent
}

describe('ChatTimestamp', () => {
  it('renders a <time> with the ISO instant', () => {
    const host = mountBody(() => <ChatTimestamp timestamp={Date.now() - 5 * MINUTE} />)
    const time = host.querySelector('[data-mol-id="chat-timestamp"]')
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('advances its label as minutes pass', async () => {
    vi.useFakeTimers({ now: NOW })
    // Subscribe first so the shared clock starts at NOW.
    mountBody(() => {
      useMinuteNow()
      return <span />
    })
    const host = mountBody(() => <ChatTimestamp timestamp={NOW - 3 * MINUTE} />)
    expect(label(host)).toBe('3 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    await settle()
    expect(label(host)).toBe('4 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    await settle()
    expect(label(host)).toBe('5 minutes ago')
  })

  it('re-formats its label in the new language on a locale switch', async () => {
    const i18n = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
    ])
    setProvider(i18n)
    vi.useFakeTimers({ now: NOW })
    mountBody(() => {
      useMinuteNow()
      return <span />
    })
    const host = mountBody(() => <ChatTimestamp timestamp={NOW - 5 * MINUTE} />)
    expect(label(host)).toBe('5 minutes ago')
    await i18n.setLocale('fr')
    await settle()
    expect(label(host)).toBe('il y a 5 minutes')
  })
})
