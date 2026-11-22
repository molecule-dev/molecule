/**
 * `ChatPanel` cases: Stream side effects and host callbacks. Every case name starts with `stream effects: `.
 *
 * What a streamed turn does besides print text: the sounds it plays and the
 * `/sounds` picker that mutes them (per device, persisted in localStorage),
 * the context-usage ring and its compaction log (fed by `context_usage`,
 * `done` and `compaction` events), the auto-fix countdown a failed
 * verification arms at the end of the turn, the activity card a captured
 * side effect puts in the timeline, and the host callbacks a turn fires —
 * `onReadyToBuild` when the server picks the starting point,
 * `onClientAction` when the agent drives the IDE, and `onTurnComplete` when
 * the turn ends either way. A teammate's pushed frames render the same turn
 * but never fire the sender-only effects: no chime for their own echo, no
 * boot, no countdown, no re-persisted card.
 *
 * @module
 */

import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  click,
  DONE,
  emit,
  finish,
  key,
  NOW,
  SEND,
  serverStreaming,
  START,
  TEXT,
  TOOL,
  type,
} from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/**
 * Streams one text delta and lets the 50 ms flush land it, so a case that
 * later proves a side effect has a visible turn to hang it on.
 *
 * @returns The steps.
 */
const STREAM_TEXT = [emit(START('a1')), emit(TEXT('Working on it.')), adv(50)]

/**
 * The chat endpoint of the conversation a pushed-frame case mounts with, and
 * the frame conversation id that matches it (a frame for any other
 * conversation is dropped before it reaches this panel).
 */
const CONV = 'c1'

/**
 * Delivers one broadcast frame as the host holding the registered push
 * handler would: `onRegisterPushHandler` received the panel's handler as its
 * first argument, and a frame names the conversation it belongs to.
 *
 * @param event - The broadcast stream event.
 * @returns The step.
 */
const push = (event: unknown): Interaction => ({
  type: 'invoke',
  callback: 'onRegisterPushHandler',
  path: [0],
  args: [CONV, event],
})

/**
 * What a case that drives pushed frames adds: the conversation mount (the
 * handler only applies frames for the open conversation) and the callback
 * the handler registers through.
 *
 * @returns The `extra` argument for {@link base}.
 */
const withPush = (): BaseExtra => ({
  props: { conversationId: CONV, onRegisterPushHandler: { $callback: 'onRegisterPushHandler' } },
})

/** A teammate's team-only note, complete as the broadcast carries it. */
const TEAM_NOTE = {
  type: 'message',
  message: {
    id: 'note-1',
    role: 'user',
    content: 'Heads up: the API keys rotate tonight',
    timestamp: NOW + 2,
  },
}

/**
 * The popup every `/`-command opens above the composer; the sounds picker is
 * one of them and the only one open in these cases. Its shell style is the
 * shared popup chrome (bottom-anchored, above the composer, topmost).
 */
const POPUP = 'div[style*="z-index: 100"]'

/** The picker's ✕ close button, in the popup's header bar. */
const SOUNDS_CLOSE = `${POPUP} > div:first-child > button`

/**
 * One row of the sounds picker: row 1 is the "All" row, then one row per
 * sound event in `SOUND_EVENTS` order (message, done, error, tool_result, …).
 *
 * @param row - The 1-based row.
 * @returns Its selector.
 */
const SOUNDS_ROW = (row: number): string => `${POPUP} > div:last-child > button:nth-child(${row})`

/** The tool_result row: after All, message, done and error. */
const TOOL_RESULT_ROW = SOUNDS_ROW(5)

/** Opens the sounds picker the way a user does: the /sounds command. */
const OPEN_SOUNDS = [type('/sounds'), key('Enter')]

/** Selects the "All" row and cycles it once (the picker's keyboard path). */
const CYCLE_ALL = [...OPEN_SOUNDS, key('ArrowDown'), key('Enter')]

/**
 * A `context_usage` sample mid-turn: halfway to the compaction target, so the
 * ring shows 50%.
 */
const USAGE_EVENT = {
  type: 'context_usage',
  usage: {
    requestId: 'r9',
    at: '2023-11-14T22:13:21.000Z',
    inputTokens: 5_000,
    contextWindow: 100_000,
    backgroundCompactAtTokens: 10_000,
  },
}

/** The usage a server pins on the turn's done event. */
const DONE_USAGE = {
  type: 'done',
  usage: {
    requestId: 'r9',
    at: '2023-11-14T22:13:25.000Z',
    inputTokens: 6_000,
    contextWindow: 100_000,
    backgroundCompactAtTokens: 10_000,
  },
}

/** A verification that found errors, as the stream reports it. */
const VERIFICATION_FAILED = {
  type: 'verification_result',
  status: 'error',
  output: 'src/App.tsx:3 — unused import',
  categories: ['typecheck'],
}

/** A verification that came back clean. */
const VERIFICATION_OK = { type: 'verification_result', status: 'ok' }

/** A captured outbound email, as an `activity` event carries it. */
const ACTIVITY_EVENT = {
  type: 'activity',
  activity: {
    id: 'act-9',
    type: 'email',
    status: 'captured',
    recipient: 'ada@example.test',
    summary: 'Welcome aboard',
    timestamp: '2023-11-14T22:13:22.000Z',
  },
}

/** A client_action carrying every field the panel forwards. */
const FULL_CLIENT_ACTION = {
  type: 'client_action',
  action: 'preview_ui',
  requestId: 'req-7',
  command: 'fill',
  molId: 'login-email',
  selector: '#email',
  text: 'Email',
  value: 'ada@example.test',
  path: '/login',
}

/** A saved per-device sounds preference: two events forced to always. */
const SAVED_SOUNDS = JSON.stringify({ done: 'always', tool_result: 'always' })

/** The context-usage ring button in the composer row. */
const RING = '[data-mol-id="chat-context-usage"]'

/** Stream side effects and host callbacks. */
export const streamEffectsCases: FeatureCase[] = [
  // ── The /sounds picker ─────────────────────────────────────────────────────
  base('stream effects: /sounds opens the notification-sounds picker', OPEN_SOUNDS),
  base('stream effects: cycling all events mutes every sound and persists the choice', CYCLE_ALL, {
    context: { window: { localStorage: {} } },
  }),
  base(
    'stream effects: clicking a sound row cycles just that event',
    [...OPEN_SOUNDS, click(SOUNDS_ROW(2))],
    {
      context: { window: { localStorage: {} } },
    },
  ),
  base('stream effects: a saved sounds preference restores on mount', [...OPEN_SOUNDS], {
    context: { window: { localStorage: { 'molecule.ide.sounds': SAVED_SOUNDS } } },
  }),
  base("stream effects: the picker's close button dismisses it and the choice stays muted", [
    ...CYCLE_ALL,
    click(SOUNDS_CLOSE),
  ]),
  base('stream effects: the /sounds row labels the muted state in the command menu', [
    ...CYCLE_ALL,
    type('/'),
  ]),

  // ── The sounds a turn plays ────────────────────────────────────────────────
  base("stream effects: a teammate's team note plays the team chime", [push(TEAM_NOTE)], {
    ...withPush(),
    context: { window: { audio: true } },
  }),
  base(
    "stream effects: the sender's own note echo stays silent",
    [...SEND_IT, emit(TEAM_NOTE), finish],
    {
      context: { window: { audio: true } },
    },
  ),
  base(
    'stream effects: a finished turn is silent while the page is focused',
    [...SEND_IT, ...STREAM_TEXT, emit(DONE), finish],
    {
      context: { window: { audio: true } },
    },
  ),
  base(
    'stream effects: a turn that finishes after the window loses focus plays the done sound',
    [...SEND_IT, ...STREAM_TEXT, { type: 'windowFocus', focused: false }, emit(DONE), finish],
    {
      context: { window: { audio: true } },
    },
  ),
  base(
    'stream effects: turning a sound on makes its event audible',
    [
      ...OPEN_SOUNDS,
      click(TOOL_RESULT_ROW),
      click(TOOL_RESULT_ROW),
      ...SEND_IT,
      emit(START('a1')),
      emit(TOOL('t1', 'read_file', { path: '/workspace/src/App.tsx' })),
      adv(50),
      emit({ type: 'tool_result', id: 't1', output: 'export default function App()' }),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: { window: { audio: true, localStorage: {} } },
    },
  ),
  base(
    'stream effects: muting an event keeps its sound silent',
    [
      ...OPEN_SOUNDS,
      click(SOUNDS_ROW(3)),
      click(SOUNDS_ROW(3)),
      ...SEND_IT,
      ...STREAM_TEXT,
      emit(DONE),
      finish,
    ],
    {
      context: { window: { audio: true, localStorage: {} } },
    },
  ),

  // ── The context-usage ring the stream feeds ────────────────────────────────
  base('stream effects: a context_usage event mid-turn updates the ring', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(USAGE_EVENT),
    emit(DONE),
    finish,
  ]),
  base('stream effects: the done event carries the usage that updates the ring', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(DONE_USAGE),
    finish,
  ]),
  base('stream effects: a compaction event is listed in the usage breakdown', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(USAGE_EVENT),
    emit({
      type: 'compaction',
      at: '2023-11-14T22:13:23.000Z',
      compactedCount: 10,
      elapsedMs: 3_000,
      beforeChars: 50_000,
      afterChars: 5_000,
    }),
    adv(50),
    emit(DONE),
    finish,
    click(RING),
  ]),

  // ── The auto-fix countdown a failed verification arms ──────────────────────
  base('stream effects: a failed verification arms the auto-fix countdown when the turn ends', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(VERIFICATION_FAILED),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('stream effects: a clean verification does not arm the countdown', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(VERIFICATION_FAILED),
    adv(50),
    emit(VERIFICATION_OK),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base(
    "stream effects: a teammate's failed verification does not arm this client's auto-fix",
    [
      serverStreaming(true),
      push({ type: 'message_start', id: 'a2', timestamp: NOW + 3 }),
      push({ type: 'text', content: 'On it.' }),
      adv(50),
      push(VERIFICATION_FAILED),
      push(DONE),
      serverStreaming(false),
    ],
    withPush(),
  ),

  // ── Activity cards a captured side effect adds ─────────────────────────────
  base('stream effects: a captured side effect appears as an activity card in the timeline', [
    ...SEND_IT,
    emit(START('a1')),
    emit(ACTIVITY_EVENT),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base(
    "stream effects: a teammate's captured side effect renders but is not written back",
    [push(ACTIVITY_EVENT)],
    withPush(),
  ),

  // ── The host callbacks a turn fires ────────────────────────────────────────
  base('stream effects: ready_to_build tells the host to build', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit({ type: 'ready_to_build' }),
    emit(DONE),
    finish,
  ]),
  base(
    'stream effects: a pushed ready_to_build does not boot on the watching client',
    [
      push({ type: 'message_start', id: 'a2', timestamp: NOW + 3 }),
      push({ type: 'text', content: 'Scaffold is ready.' }),
      adv(50),
      push({ type: 'ready_to_build' }),
      push(DONE),
    ],
    withPush(),
  ),
  base('stream effects: a client_action forwards every field to the host', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(FULL_CLIENT_ACTION),
    emit(DONE),
    finish,
  ]),
  base('stream effects: a client_action forwards only what it carries', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit({ type: 'client_action', action: 'reload_preview' }),
    emit(DONE),
    finish,
  ]),
  base('stream effects: the host hears the turn completed', [
    ...SEND_IT,
    ...STREAM_TEXT,
    emit(DONE),
    finish,
  ]),
]
