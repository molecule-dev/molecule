/**
 * `@molecule/app-ide-react` hook cases: the document-level shortcut listener,
 * the media-query hooks, the per-device chat timestamp preference and the
 * shared minute clock. None of them reads a service; each reads the page
 * (`keydown`, `media`, `localStorage`, `event` steps and the case clock).
 *
 * The shortcut matching runs under jsdom, whose `navigator.platform` is not a
 * Mac's, so `mod` is Ctrl in every framework's run.
 *
 * @module
 */

import type { HookCase, HookCases } from '../../../bindings/spec.js'

const NARROW = '(max-width: 767px)'
const COARSE = '(pointer: coarse)'
const TIMESTAMPS_KEY = 'mol_chat_show_timestamps'
const TIMESTAMPS_EVENT = 'mol:chat-timestamps-changed'

/** 2026-01-02 03:04:05 UTC: the case clock for the minute-clock cases. */
const NOW = Date.UTC(2026, 0, 2, 3, 4, 5)

/** `useKeyboardShortcuts`. */
export const useKeyboardShortcutsCases: HookCases = {
  hook: 'useKeyboardShortcuts',
  reactiveArgs: true,
  cases: [
    {
      name: 'mod+p calls its handler and claims the key; p alone and another combo pass through',
      args: [[{ keys: 'mod+p', handler: { $fn: 'quickOpen' }, label: 'Quick open' }]],
      steps: [
        { type: 'keydown', key: 'p', ctrlKey: true },
        { type: 'keydown', key: 'p' },
        { type: 'keydown', key: 'p', ctrlKey: true, shiftKey: true },
      ],
    },
    {
      name: 'mod+shift+F matches whatever case the key arrives in',
      args: [[{ keys: 'Mod+Shift+F', handler: { $fn: 'searchFiles' } }]],
      steps: [
        { type: 'keydown', key: 'F', ctrlKey: true, shiftKey: true },
        { type: 'keydown', key: 'f', ctrlKey: true, shiftKey: true },
        { type: 'keydown', key: 'f', ctrlKey: true, altKey: true, shiftKey: true },
      ],
    },
    {
      name: 'off a Mac, mod is Ctrl: Meta and a ctrl combo do not match',
      args: [
        [
          { keys: 'mod+s', handler: { $fn: 'save' } },
          { keys: 'ctrl+s', handler: { $fn: 'ctrlSave' } },
        ],
      ],
      steps: [
        { type: 'keydown', key: 's', metaKey: true },
        { type: 'keydown', key: 's', ctrlKey: true },
      ],
    },
    {
      name: 'in a text field only a shortcut that allows input fires',
      args: [
        [
          { keys: 'escape', handler: { $fn: 'dismiss' }, allowInInput: true },
          { keys: 'mod+s', handler: { $fn: 'save' } },
        ],
      ],
      steps: [
        { type: 'keydown', key: 'Escape', target: 'input' },
        { type: 'keydown', key: 's', ctrlKey: true, target: 'input' },
        { type: 'keydown', key: 's', ctrlKey: true },
      ],
    },
    {
      name: 'in the editor only a shortcut that allows the editor fires',
      args: [
        [
          { keys: 'mod+s', handler: { $fn: 'save' }, allowInEditor: true },
          { keys: 'mod+p', handler: { $fn: 'quickOpen' } },
          { keys: 'escape', handler: { $fn: 'dismiss' }, allowInInput: true },
        ],
      ],
      steps: [
        { type: 'keydown', key: 's', ctrlKey: true, target: 'editor' },
        { type: 'keydown', key: 'p', ctrlKey: true, target: 'editor' },
        { type: 'keydown', key: 'Escape', target: 'editor' },
      ],
    },
    {
      name: 'the first matching shortcut wins; a skipped one lets a later one fire',
      args: [
        [
          { keys: 'mod+k', handler: { $fn: 'palette' } },
          { keys: 'mod+k', handler: { $fn: 'second' } },
          { keys: 'mod+k', handler: { $fn: 'inInput' }, allowInInput: true },
        ],
      ],
      steps: [
        { type: 'keydown', key: 'k', ctrlKey: true },
        { type: 'keydown', key: 'k', ctrlKey: true, target: 'input' },
      ],
    },
    {
      name: 'an empty list listens to nothing',
      args: [[]],
      steps: [{ type: 'keydown', key: 'Escape' }],
    },
    {
      name: 'new shortcuts replace the old ones on the same mount',
      args: [[{ keys: 'mod+p', handler: { $fn: 'quickOpen' } }]],
      steps: [
        { type: 'args', args: [[{ keys: 'mod+k', handler: { $fn: 'palette' } }]] },
        { type: 'keydown', key: 'p', ctrlKey: true },
        { type: 'keydown', key: 'k', ctrlKey: true },
        { type: 'args', args: [[]] },
        { type: 'keydown', key: 'k', ctrlKey: true },
      ],
    },
    {
      name: 'unmounting removes the listener',
      args: [[{ keys: 'escape', handler: { $fn: 'dismiss' } }]],
      steps: [{ type: 'unmount' }, { type: 'keydown', key: 'Escape' }],
    },
  ],
}

/**
 * Cases for a hook that follows one fixed media query.
 *
 * @param query - The query the hook follows.
 * @returns The cases.
 */
function fixedQueryCases(query: string): HookCase[] {
  return [
    {
      name: 'matches at mount and follows the query',
      media: [query],
      steps: [
        { type: 'media', query, matches: false },
        { type: 'media', query, matches: true },
      ],
    },
    {
      name: 'does not match by default and ignores every other query',
      steps: [
        { type: 'media', query: query === NARROW ? COARSE : NARROW, matches: true },
        { type: 'media', query, matches: true },
      ],
    },
    {
      name: 'stops following the query after unmount',
      media: [query],
      steps: [{ type: 'unmount' }, { type: 'media', query, matches: false }],
    },
  ]
}

/** `useMediaQueryMatch`. */
export const useMediaQueryMatchCases: HookCases = {
  hook: 'useMediaQueryMatch',
  reactiveArgs: true,
  cases: [
    {
      name: 'matches at mount and follows the query',
      args: [NARROW],
      media: [NARROW],
      steps: [
        { type: 'media', query: NARROW, matches: false },
        { type: 'media', query: NARROW, matches: true },
      ],
    },
    {
      name: 'a query nothing lists does not match',
      args: ['(prefers-reduced-motion: reduce)'],
      media: [NARROW],
      steps: [{ type: 'media', query: NARROW, matches: false }],
    },
    {
      name: 'a new query is read at once and followed instead of the old one',
      args: [NARROW],
      media: [NARROW],
      steps: [
        { type: 'args', args: [COARSE] },
        { type: 'media', query: COARSE, matches: true },
        { type: 'media', query: NARROW, matches: false },
        { type: 'media', query: COARSE, matches: false },
      ],
    },
    {
      name: 'stops following the query after unmount',
      args: [NARROW],
      steps: [{ type: 'unmount' }, { type: 'media', query: NARROW, matches: true }],
    },
  ],
}

/** `useNarrowViewport`: phone width, below 768px. */
export const useNarrowViewportCases: HookCases = {
  hook: 'useNarrowViewport',
  cases: fixedQueryCases(NARROW),
}

/** `useCoarsePointer`: a touch-first device. */
export const useCoarsePointerCases: HookCases = {
  hook: 'useCoarsePointer',
  cases: fixedQueryCases(COARSE),
}

/** `useChatTimestampsVisible`. */
export const useChatTimestampsVisibleCases: HookCases = {
  hook: 'useChatTimestampsVisible',
  cases: [
    {
      name: 'off by default; another tab turning it on and off is followed',
      steps: [
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'true' },
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'false' },
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'true' },
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: null },
      ],
    },
    {
      name: 'on when the page already stores true; only an explicit true counts',
      context: { window: { localStorage: { [TIMESTAMPS_KEY]: 'true' } } },
      steps: [
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'yes' },
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'TRUE' },
      ],
    },
    {
      name: 'a same-tab change is read on its notice; another key and another notice are ignored',
      steps: [
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'true', sameTab: true },
        { type: 'localStorage', key: 'mol_tests_bar_visible', value: 'false' },
        { type: 'event', selector: 'document', event: TIMESTAMPS_EVENT },
        { type: 'event', selector: 'window', event: 'mol:other-preference-changed' },
        { type: 'event', selector: 'window', event: TIMESTAMPS_EVENT },
      ],
    },
    {
      name: 'stops listening after unmount',
      steps: [
        { type: 'unmount' },
        { type: 'localStorage', key: TIMESTAMPS_KEY, value: 'true' },
        { type: 'event', selector: 'window', event: TIMESTAMPS_EVENT },
      ],
    },
  ],
}

/** `useMinuteNow`. */
export const useMinuteNowCases: HookCases = {
  hook: 'useMinuteNow',
  cases: [
    {
      name: 'reads the clock at mount and again once a minute, not in between',
      now: NOW,
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 30_000 },
        { type: 'advance', ms: 30_000 },
        { type: 'advance', ms: 59_999 },
        { type: 'advance', ms: 1 },
      ],
    },
    {
      name: 'a second mount after the first is gone starts from the current time',
      now: NOW,
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 90_000 },
        { type: 'unmount' },
        { type: 'advance', ms: 15_000 },
        { type: 'remount' },
        { type: 'advance', ms: 60_000 },
      ],
    },
  ],
}

/** Every `@molecule/app-ide-react` hook family. */
export const ideHookCases: HookCases[] = [
  useChatTimestampsVisibleCases,
  useCoarsePointerCases,
  useKeyboardShortcutsCases,
  useMediaQueryMatchCases,
  useMinuteNowCases,
  useNarrowViewportCases,
]
