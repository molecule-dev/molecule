// @vitest-environment jsdom
/**
 * Ported from `@molecule/app-ide-react`'s `__tests__/chat-timestamps.test.tsx`:
 * the same test names and assertions for the timestamp utilities, the registry
 * and the `useChatTimestampsVisible` hook, mounted as a real Solid root. The
 * `ChatTimestamp` component describe stays with the component's own port (it
 * renders, and its label tests live there); `useMinuteNow`'s minute clock is
 * covered by the conformance kit's hook cases.
 */
import type { Accessor, JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CHAT_TIMESTAMPS_STORAGE_KEY,
  type ChatTimestampSlot,
  formatChatRelativeTime,
  getChatTimestampsVisible,
  parseChatTimestampsVisible,
  parseTimestampsCommand,
  planChatTimestamps,
  setChatTimestampsVisible,
} from '@molecule/app-ide-panel-logic'
import { COMMANDS } from '@molecule/app-ide-panel-logic/command-metadata'
import { SETTINGS } from '@molecule/app-ide-panel-logic/settings-metadata'

const { useChatTimestampsVisible } = await import('../hooks/useChatTimestampsVisible.js')

const MINUTE = 60_000
// Local noon, so "earlier today" / "another day" do not depend on the runner's time zone.
const NOW = new Date(2026, 8, 13, 12, 0, 0).getTime()
const HOUR = 60 * MINUTE

/**
 * A working in-memory Storage (Node's experimental web-storage shadows jsdom's).
 *
 * @returns A fresh Storage.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  }
}

/** The roots this file mounted; disposed after every test, like React's roots. */
const disposers: Array<() => void> = []

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.useRealTimers()
})

/**
 * Mounts a component whose body calls one hook, the way an app does.
 *
 * @param setup - The component body.
 */
function mountProbe(setup: () => void): void {
  function Probe(): JSX.Element {
    setup()
    return <></>
  }
  const container = document.createElement('div')
  disposers.push(render(() => <Probe />, container))
}

describe('parseChatTimestampsVisible', () => {
  it('defaults to off; only an explicit true turns timestamps on', () => {
    expect(parseChatTimestampsVisible(null)).toBe(false)
    expect(parseChatTimestampsVisible('garbage')).toBe(false)
    expect(parseChatTimestampsVisible('false')).toBe(false)
    expect(parseChatTimestampsVisible('true')).toBe(true)
  })
})

describe('parseTimestampsCommand', () => {
  it('parses toggle, on/off and their synonyms', () => {
    expect(parseTimestampsCommand('/timestamps')).toEqual({ action: 'toggle' })
    expect(parseTimestampsCommand('/TIMESTAMPS on')).toEqual({ action: 'on' })
    expect(parseTimestampsCommand('/timestamps show')).toEqual({ action: 'on' })
    expect(parseTimestampsCommand('/timestamps off')).toEqual({ action: 'off' })
    expect(parseTimestampsCommand('/timestamps hide')).toEqual({ action: 'off' })
  })

  it('flags an unknown argument and ignores other commands', () => {
    expect(parseTimestampsCommand('/timestamps maybe')).toEqual({ action: 'invalid' })
    expect(parseTimestampsCommand('/timestampsx')).toBeNull()
    expect(parseTimestampsCommand('show timestamps')).toBeNull()
  })
})

describe('formatChatRelativeTime', () => {
  it('uses relative minutes within the hour', () => {
    expect(formatChatRelativeTime(NOW - 10_000, NOW, 'en')).toBe('now')
    expect(formatChatRelativeTime(NOW - 5 * MINUTE, NOW, 'en')).toBe('5 minutes ago')
    expect(formatChatRelativeTime(NOW - 59 * MINUTE, NOW, 'en')).toBe('59 minutes ago')
  })

  it('uses the clock time for earlier today — never a coarse "N hours ago"', () => {
    expect(formatChatRelativeTime(NOW - HOUR, NOW, 'en')).toBe('11:00 AM')
    expect(formatChatRelativeTime(NOW - 2 * HOUR - 35 * MINUTE, NOW, 'en')).toBe('9:25 AM')
  })

  it('uses the date and time for another day, adding the year only when it differs', () => {
    expect(formatChatRelativeTime(new Date(2026, 8, 12, 9, 25).getTime(), NOW, 'en')).toBe(
      'Sep 12, 9:25 AM',
    )
    expect(formatChatRelativeTime(new Date(2025, 7, 1, 14, 5).getTime(), NOW, 'en')).toBe(
      'Aug 1, 2025, 2:05 PM',
    )
  })

  it('localizes through Intl', () => {
    expect(formatChatRelativeTime(NOW - 5 * MINUTE, NOW, 'fr')).toBe('il y a 5 minutes')
  })

  it('never renders a future time', () => {
    expect(formatChatRelativeTime(NOW + 30_000, NOW, 'en')).toBe('now')
  })
})

describe('planChatTimestamps', () => {
  const slot = (id: string, minutesAgo: number, alwaysShown = false): ChatTimestampSlot => ({
    id,
    timestamp: NOW - minutesAgo * MINUTE,
    alwaysShown,
  })
  const plan = (slots: (ChatTimestampSlot | null)[], visible: boolean, now = NOW): string[] => [
    ...planChatTimestamps(slots, { visible, now, locale: 'en' }),
  ]

  it('with timestamps on, shows a run of identical labels once, at the top', () => {
    const slots = [slot('a', 3), slot('b', 3.2), slot('c', 3.5), slot('d', 1), slot('e', 1.1)]
    expect(plan(slots, true)).toEqual(['a', 'd'])
  })

  it('with timestamps off, shows only always-shown slots (user headers, critical events)', () => {
    const slots = [slot('user', 5, true), slot('reply', 4), slot('failure', 2, true)]
    expect(plan(slots, false)).toEqual(['user', 'failure'])
  })

  it('collapses against the last RENDERED label, skipping hidden and empty slots', () => {
    const slots = [slot('user1', 3, true), slot('reply', 1), null, slot('user2', 3, true)]
    expect(plan(slots, false)).toEqual(['user1'])
  })

  it('never collapses an hour of history into one label (minute-precise at every age)', () => {
    // A long build an hour ago: one item a minute from 9:25 to 9:43 — each minute
    // is its own label, so each renders (a coarse "1 hour ago" showed only the first).
    const slots = Array.from({ length: 19 }, (_, i) => slot(`m${i}`, 155 - i))
    expect(plan(slots, true)).toHaveLength(19)
    // Same-minute items still collapse to the first.
    expect(plan([slot('x', 155), slot('y', 154.9)], true)).toEqual(['x'])
  })

  it('regroups as the clock advances', () => {
    // 30s apart: both "1 minute ago" now; 12s later one crosses into "2 minutes ago".
    const slots = [slot('a', 1.9), slot('b', 1.4)]
    expect(plan(slots, true)).toEqual(['a'])
    expect(plan(slots, true, NOW + 12_000)).toEqual(['a', 'b'])
  })
})

describe('visibility preference', () => {
  it('is off by default and follows set calls and other tabs live', () => {
    let visible: Accessor<boolean> | undefined
    mountProbe(() => {
      visible = useChatTimestampsVisible()
    })
    expect(visible!()).toBe(false)
    expect(getChatTimestampsVisible()).toBe(false)

    setChatTimestampsVisible(true)
    expect(visible!()).toBe(true)
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('true')

    localStorage.setItem(CHAT_TIMESTAMPS_STORAGE_KEY, 'false')
    window.dispatchEvent(new StorageEvent('storage', { key: CHAT_TIMESTAMPS_STORAGE_KEY }))
    expect(visible!()).toBe(false)
  })
})

describe('registry', () => {
  it('lists /timestamps as a viewer-safe settings command and a /settings row', () => {
    const cmd = COMMANDS.find((c) => c.id === 'timestamps')
    expect(cmd).toMatchObject({ category: 'settings', viewerSafe: true })
    expect(SETTINGS.find((s) => s.id === 'timestamps')?.editCommand).toBe('timestamps')
  })
})
