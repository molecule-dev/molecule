/**
 * The binding kit's page steps for hooks that read the page instead of a
 * service: `keydown` (a document-level shortcut listener) and `media` (a
 * `matchMedia` subscription), run on the React reference with two small hooks
 * shaped like the IDE's `useKeyboardShortcuts` and `useMediaQueryMatch`. Also the
 * field check every runner makes first, which fails a case whose step carries a
 * field the step does not take.
 *
 * @module
 */

import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'

import * as ReactBindings from '@molecule/app-react'

import { type HookCase, runHookCase } from '../bindings/index.js'
import { checkCaseFields } from '../ui/steps.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'

/**
 * Calls `onEscape` for Escape pressed outside a text field, claiming the key.
 *
 * @param onEscape - The handler.
 */
function useEscapeShortcut(onEscape: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || (event.target as HTMLElement | null)?.tagName === 'INPUT')
        return
      event.preventDefault()
      onEscape()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [onEscape])
}

/**
 * Whether a media query matches, kept current.
 *
 * @param query - The query.
 * @returns Whether it matches.
 */
function useMediaMatch(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/**
 * A `localStorage` flag kept current across tabs (the `storage` event) and within
 * the tab (a named window event), like the IDE's timestamp preference.
 *
 * @param key - The `localStorage` key.
 * @param eventName - The same-tab change event.
 * @returns Whether the stored value is `'true'`.
 */
function useStoredFlag(key: string, eventName: string): boolean {
  const read = (): boolean => localStorage.getItem(key) === 'true'
  const [flag, setFlag] = useState(read)
  useEffect(() => {
    const update = (): void => setFlag(read())
    const onStorage = (event: StorageEvent): void => {
      if (event.key === key) update()
    }
    window.addEventListener(eventName, update)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(eventName, update)
      window.removeEventListener('storage', onStorage)
    }
  })
  return flag
}

/**
 * The current minute's start, advancing every minute, like the IDE's `useMinuteNow`.
 *
 * @returns Epoch milliseconds at the start of the current minute.
 */
function useMinute(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 60_000) * 60_000)
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 60_000) * 60_000), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

const exportsOf: Record<string, unknown> = {
  ...ReactBindings,
  useEscapeShortcut,
  useMediaMatch,
  useStoredFlag,
  useMinute,
}
const adapter = createReactBindingAdapter(exportsOf)

const run = (hook: string, testCase: Omit<HookCase, 'name'>) =>
  runHookCase(adapter, hook, { name: 'page step', ...testCase })

const NARROW = '(max-width: 767px)'

describe('keydown step', () => {
  it('records the key, whether a listener claimed it, and the handler call', async () => {
    const result = await run('useEscapeShortcut', {
      args: [{ $fn: 'onEscape' }],
      steps: [{ type: 'keydown', key: 'Escape' }],
    })
    expect(result.calls).toEqual([
      { name: 'onEscape', args: [] },
      { name: '@keydown', args: [{ key: 'Escape', defaultPrevented: true }] },
    ])
  })

  it('dispatches from a text field when the step targets one', async () => {
    const result = await run('useEscapeShortcut', {
      args: [{ $fn: 'onEscape' }],
      steps: [{ type: 'keydown', key: 'Escape', target: 'input' }],
    })
    expect(result.calls).toEqual([
      { name: '@keydown', args: [{ key: 'Escape', defaultPrevented: false }] },
    ])
    expect(document.querySelector('input')).toBeNull()
  })

  it('shows after unmount that the listener was removed', async () => {
    const result = await run('useEscapeShortcut', {
      args: [{ $fn: 'onEscape' }],
      steps: [{ type: 'unmount' }, { type: 'keydown', key: 'Escape' }],
    })
    expect(result.calls).toEqual([
      { name: '@keydown', args: [{ key: 'Escape', defaultPrevented: false }] },
    ])
  })
})

describe('media step', () => {
  const results = (snapshots: unknown[]): unknown[] =>
    snapshots.map((s) => (s as { result: unknown }).result)

  it('starts from the case media and follows a media step', async () => {
    const result = await run('useMediaMatch', {
      args: [NARROW],
      media: [NARROW],
      steps: [
        { type: 'media', query: NARROW, matches: false },
        { type: 'media', query: NARROW, matches: true },
      ],
    })
    expect(results(result.snapshots)).toEqual([true, false, true])
  })

  it('matches nothing else: an unlisted query stays false', async () => {
    const result = await run('useMediaMatch', {
      args: ['(pointer: coarse)'],
      media: [NARROW],
      steps: [{ type: 'media', query: NARROW, matches: false }],
    })
    expect(results(result.snapshots)).toEqual([false, false])
  })
})

describe('localStorage and event steps', () => {
  const results = (snapshots: unknown[]): unknown[] =>
    snapshots.map((s) => (s as { result: unknown }).result)

  it('starts from the seeded page storage and follows another tab and a same-tab notice', async () => {
    const result = await run('useStoredFlag', {
      args: ['flag', 'flag-changed'],
      context: { window: { localStorage: { flag: 'true' } } },
      steps: [
        { type: 'localStorage', key: 'flag', value: 'false' },
        { type: 'localStorage', key: 'other', value: 'true' },
        { type: 'event', selector: 'window', event: 'flag-changed' },
      ],
    })
    expect(results(result.snapshots)).toEqual([true, false, false, false])
  })

  it('starts from an empty page storage; an unrelated write and notice change nothing', async () => {
    const result = await run('useStoredFlag', {
      args: ['flag', 'flag-changed'],
      steps: [
        { type: 'localStorage', key: 'unrelated', value: 'true' },
        { type: 'event', selector: 'document', event: 'flag-changed' },
        { type: 'localStorage', key: 'flag', value: 'true' },
      ],
    })
    expect(results(result.snapshots)).toEqual([false, false, false, true])
  })

  it('a same-tab write fires no storage event: only the notice after it reaches the hook', async () => {
    const result = await run('useStoredFlag', {
      args: ['flag', 'flag-changed'],
      steps: [
        { type: 'localStorage', key: 'flag', value: 'true', sameTab: true },
        { type: 'localStorage', key: 'other', value: 'true' },
        { type: 'event', selector: 'window', event: 'flag-changed' },
      ],
    })
    expect(results(result.snapshots)).toEqual([false, false, false, true])
  })
})

describe('case clock', () => {
  const results = (snapshots: unknown[]): unknown[] =>
    snapshots.map((s) => (s as { result: unknown }).result)
  const NOW = Date.UTC(2026, 0, 2, 3, 4, 5)
  const MINUTE = Date.UTC(2026, 0, 2, 3, 4)

  it('pins Date.now to the case time and, with fake timers, advances from it', async () => {
    const result = await run('useMinute', {
      now: NOW,
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 60_000 }],
    })
    expect(results(result.snapshots)).toEqual([MINUTE, MINUTE + 60_000])
  })

  it('pins Date.now without fake timers, and the real clock is back after the case', async () => {
    const result = await run('useMinute', { now: NOW })
    expect(results(result.snapshots)).toEqual([MINUTE])
    expect(Date.now()).toBeGreaterThan(Date.UTC(2026, 6, 1))
  })
})

describe('case and step fields', () => {
  it('fails a hook step carrying a field it does not take', async () => {
    // The UI interaction's old spelling, in a hook case: the step would switch nothing.
    const steps = JSON.parse('[{"type":"locale","code":"fr"}]') as HookCase['steps']
    await expect(run('useTranslation', { steps })).rejects.toThrow(
      'step 1 of "page step" (a locale step) has no field `code`; it takes `locale`',
    )
  })

  it('fails a step that lacks a required field', async () => {
    const steps = JSON.parse('[{"type":"media","query":"(max-width: 767px)"}]') as HookCase['steps']
    await expect(run('useMediaMatch', { args: [NARROW], steps })).rejects.toThrow(
      '(a media step) needs `matches`',
    )
  })

  it('fails a UI case with a misspelled case field or interaction field', () => {
    const typo = JSON.parse('{"name":"typo","interaction":[]}') as Parameters<
      typeof checkCaseFields
    >[0]
    expect(() => checkCaseFields(typo)).toThrow('the case "typo" has no field `interaction`')
    expect(() =>
      checkCaseFields({ name: 'switch', interactions: [{ type: 'locale', locale: 'en-XA' }] }),
    ).not.toThrow()
  })
})
