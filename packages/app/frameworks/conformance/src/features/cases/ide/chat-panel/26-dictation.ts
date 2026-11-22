/**
 * `ChatPanel` cases: Dictation (Web Speech, the on-device voice provider, the engine picker).
 * Every case name starts with `dictation: `.
 *
 * What the mic button drives: the Web Speech session it opens (the settings it is created
 * with, what a result inserts into the composer, the session a second click or the send
 * stops), the dictated send that carries the mic badge into the timeline — live, on a send
 * whose text still contains the dictated words, and restored from history — and the
 * rewritten send (a command re-dictating the prompt) that does not. Every failure path: no
 * speech service and no provider, the browser refusing the microphone, the service proven
 * dead (a `network` error, a start rejected mid-teardown, a session that never speaks, three
 * ends without a result) falling through to the bonded on-device provider or reporting
 * dictation unavailable, the tab-wide dead flag skipping Web Speech, the provider's own
 * errors (blocked microphone, one failed chunk that keeps listening, an unusable fallback),
 * the preparing notice that clears once the provider is listening, the trailing transcript
 * discarded after a send, and the unmount that stops whichever session is live. With a
 * dictation engine catalog registered, the first mic click and the /mic (and /dictate)
 * command open the engine picker — closing any open popup — whose rows show each engine's
 * download, accuracy and languages and disable the ones this browser or the UI language
 * cannot use; choosing one bonds its provider, remembers the choice in localStorage and,
 * from a mic click or a saved choice, starts dictating at once; a native engine dying with a
 * catalog reopens the picker so the user picks the fallback themselves.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { adv, base, click, DONE, emit, finish, key, SEND, START, TEXT, type } from './fixtures.js'

/** Streams one short reply and ends the turn, so a second message can send. */
const REPLY: Interaction[] = [emit(START('a1')), emit(TEXT('On it.')), adv(50), emit(DONE), finish]

/** The composer's mic button. */
const MIC = '[data-mol-id="chat-mic-button"]'

/** One engine row of the dictation-engine picker. */
const ENGINE_ROW = (id: string): string => `[data-mol-id="chat-mic-engine-${id}"]`

/**
 * Plays one dictation event on the newest session — the Web Speech recognition the panel
 * started last, or the last on-device `startListening` call (`areas.voice` controls).
 *
 * @param name - The control (`voice.result`, `voice.error`, `voice.end`, `voice.state`).
 * @param args - Its arguments.
 * @returns The step.
 */
const voice = (name: string, ...args: unknown[]): Interaction => ({
  type: 'control',
  name,
  args,
})

/** The browser's speech service is available (`areas.voice`). */
const WEB_SPEECH = { webSpeech: {} } as const

/** The speech service and the bonded on-device provider (`areas.voice`). */
const WEB_SPEECH_AND_PROVIDER = { webSpeech: {}, provider: {} } as const

/** Only the bonded on-device provider — jsdom has no Web Speech (`areas.voice`). */
const PROVIDER = { provider: {} } as const

/** A dictation engine catalog: the browser's service and one on-device model. */
const ENGINES = {
  engines: [
    { id: 'native', label: 'Browser native', kind: 'native', accuracy: 2, languages: 'all' },
    {
      id: 'moonshine',
      label: 'Moonshine',
      kind: 'on-device',
      accuracy: 3,
      languages: 'all',
      downloadMB: 45,
    },
  ],
} as const

/** A catalog whose only engine transcribes French — not this browser's UI language. */
const FRENCH_ENGINE = {
  engines: [
    { id: 'parakeet', label: 'Parakeet', kind: 'on-device', accuracy: 2, languages: ['fr'] },
  ],
} as const

/** The localStorage key the engine choice is persisted under (`ChatPanel`). */
const ENGINE_KEY = 'molecule.ide.voiceEngine'

/** The sessionStorage key marking this browser's speech service proven dead (`ChatPanel`). */
const DEAD_KEY = 'molecule.ide.webSpeechDead'

/** A restored history: one dictated user message and one typed by hand. */
const DICTATED_HISTORY: { history: ChatMessage[][] } = {
  history: [
    [
      { id: 'u1', role: 'user', content: 'add a login page', viaDictation: true, timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
      { id: 'u2', role: 'user', content: 'now make it dark mode', timestamp: 3000 },
    ],
  ],
}

/** Opens the dictation-engine picker the way a user does: the /mic command. */
const OPEN_MIC: Interaction[] = [type('/mic'), key('Enter')]

/** Dictation (Web Speech, the on-device voice provider, the engine picker). */
export const dictationCases: FeatureCase[] = [
  // ── The Web Speech session ─────────────────────────────────────────────────
  base(
    'dictation: clicking the mic opens a Web Speech session and marks the button listening',
    [click(MIC)],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: an interim transcript is held back and the final one lands in the composer',
    [
      click(MIC),
      voice('voice.result', 'add a login', false),
      voice('voice.result', 'add a login page', true),
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a second final transcript appends to the composer after a space',
    [
      click(MIC),
      voice('voice.result', 'add a login', true),
      voice('voice.result', 'to the app', true),
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: stopping dictation keeps the transcript and lets the session end',
    [click(MIC), voice('voice.result', 'half a plan', true), click(MIC)],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a session that already delivered speech restarts at once when the service ends it',
    [click(MIC), voice('voice.result', 'go ahead', true), voice('voice.end')],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),

  // ── The dictated send ──────────────────────────────────────────────────────
  base(
    'dictation: sending dictated text stops the session and carries the mic badge into the timeline',
    [click(MIC), voice('voice.result', 'add a login page to the app', true), click(SEND)],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a message typed after a dictation sends without the badge',
    [
      click(MIC),
      voice('voice.result', 'add a login page to the app', true),
      click(SEND),
      ...REPLY,
      type('now make it dark mode'),
      click(SEND),
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a send whose text still contains the dictated words keeps the badge',
    [
      click(MIC),
      voice('voice.result', 'add a login', true),
      type('add a login page and a footer'),
      click(SEND),
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a command that rewrites the dictated text sends without the badge',
    [
      click(MIC),
      voice('voice.result', 'add a login', true),
      type('/explain src/app.ts'),
      click(SEND),
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base('dictation: a dictated message restored from history still carries the mic badge', [], {
    context: { areas: { chat: DICTATED_HISTORY } },
  }),

  // ── The failure paths ──────────────────────────────────────────────────────
  base(
    'dictation: with no speech service and no provider, the mic click says dictation is unavailable',
    [click(MIC)],
  ),
  base('dictation: the dictation error banner clears itself after eight seconds', [
    click(MIC),
    adv(8000),
  ]),
  base(
    'dictation: the browser refusing the microphone says so and stops listening',
    [click(MIC), voice('voice.error', 'not-allowed')],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),
  base(
    'dictation: a dead speech service falls through to the bonded on-device provider',
    [click(MIC), voice('voice.error', 'network')],
    {
      context: { areas: { voice: WEB_SPEECH_AND_PROVIDER }, window: { sessionStorage: {} } },
    },
  ),
  base(
    'dictation: a dead speech service with no provider says dictation is unavailable',
    [click(MIC), voice('voice.error', 'network')],
    {
      context: { areas: { voice: WEB_SPEECH }, window: { sessionStorage: {} } },
    },
  ),
  base(
    'dictation: a service proven dead earlier in the tab goes straight to the on-device provider',
    [click(MIC)],
    {
      context: {
        areas: { voice: WEB_SPEECH_AND_PROVIDER },
        window: { sessionStorage: { [DEAD_KEY]: '1' } },
      },
    },
  ),
  base('dictation: a start rejected mid-teardown is treated as a dead service', [click(MIC)], {
    context: {
      areas: { voice: { webSpeech: { startThrows: true }, provider: {} } },
      window: { sessionStorage: {} },
    },
  }),
  base(
    'dictation: a session that never speaks is given up on after five seconds',
    [click(MIC), adv(5000)],
    {
      context: { areas: { voice: WEB_SPEECH_AND_PROVIDER }, window: { sessionStorage: {} } },
    },
  ),
  base(
    'dictation: three sessions ending without a result stop the retry loop',
    [click(MIC), voice('voice.end'), adv(300), voice('voice.end'), adv(300), voice('voice.end')],
    {
      context: { areas: { voice: WEB_SPEECH }, window: { sessionStorage: {} } },
    },
  ),
  base(
    'dictation: unmounting mid-dictation aborts the speech session',
    [
      click(MIC),
      {
        type: 'unmount',
      },
    ],
    {
      context: { areas: { voice: WEB_SPEECH } },
    },
  ),

  // ── The on-device provider ─────────────────────────────────────────────────
  base(
    'dictation: with only the on-device provider, the mic starts it and says it is preparing',
    [click(MIC)],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: the preparing notice clears once the on-device provider is listening',
    [click(MIC), voice('voice.state', 'listening')],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: the on-device provider transcript lands in the composer',
    [click(MIC), voice('voice.state', 'listening'), voice('voice.result', 'draw the header', true)],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: the on-device provider refusing the microphone says so and stops',
    [click(MIC), voice('voice.error', 'not-allowed')],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: one failed chunk keeps the on-device session listening',
    [click(MIC), voice('voice.state', 'listening'), voice('voice.error', 'transcription-failed')],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: an on-device provider that cannot transcribe says dictation is unavailable',
    [click(MIC)],
    {
      context: { areas: { voice: { provider: { recognition: false } } } },
    },
  ),
  base(
    'dictation: unmounting stops the on-device provider without disposing it',
    [click(MIC), { type: 'unmount' }],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),
  base(
    'dictation: a transcript arriving after the send is discarded, not inserted',
    [
      click(MIC),
      voice('voice.result', 'add a login page', true),
      click(SEND),
      voice('voice.result', ' and a footer', true),
    ],
    {
      context: { areas: { voice: PROVIDER } },
    },
  ),

  // ── The engine picker ──────────────────────────────────────────────────────
  base(
    'dictation: the first mic click with an engine catalog asks which engine to use',
    [click(MIC)],
    {
      context: { areas: { voice: ENGINES } },
    },
  ),
  base(
    'dictation: choosing an engine bonds it, remembers it and starts dictating',
    [click(MIC), click(ENGINE_ROW('moonshine'))],
    {
      context: { areas: { voice: ENGINES }, window: { localStorage: {} } },
    },
  ),
  base(
    'dictation: the /mic command opens the picker and a choice there does not start dictating',
    [...OPEN_MIC, click(ENGINE_ROW('moonshine'))],
    {
      context: { areas: { voice: ENGINES }, window: { localStorage: {} } },
    },
  ),
  base(
    'dictation: an engine row tints on hover and clears on leave; an unusable one stays plain',
    [
      ...OPEN_MIC,
      { type: 'mouseenter', selector: ENGINE_ROW('moonshine') },
      { type: 'mouseleave', selector: ENGINE_ROW('moonshine') },
      { type: 'mouseenter', selector: ENGINE_ROW('native') },
    ],
    {
      context: { areas: { voice: ENGINES } },
    },
  ),
  base('dictation: the /dictate alias opens the picker the same way', [...OPEN_MIC], {
    context: { areas: { voice: ENGINES } },
  }),
  base('dictation: a saved engine choice starts dictating on the first mic click', [click(MIC)], {
    context: {
      areas: { voice: ENGINES },
      window: { localStorage: { [ENGINE_KEY]: 'moonshine' } },
    },
  }),
  base(
    'dictation: the picker lists an engine this browser cannot run as unusable and refuses it',
    [...OPEN_MIC, click(ENGINE_ROW('native'))],
    {
      context: { areas: { voice: ENGINES } },
    },
  ),
  base(
    'dictation: the picker lists an engine without the UI language as unusable and refuses it',
    [...OPEN_MIC, click(ENGINE_ROW('parakeet'))],
    {
      context: { areas: { voice: FRENCH_ENGINE } },
    },
  ),
  base(
    'dictation: a native engine dying with a catalog reopens the picker for a fallback',
    [click(MIC), voice('voice.error', 'network')],
    {
      context: {
        areas: { voice: { ...ENGINES, webSpeech: {} } },
        window: {
          localStorage: { [ENGINE_KEY]: 'native' },
          sessionStorage: {},
        },
      },
    },
  ),
  base(
    'dictation: the first mic click closes an open popup to show the engine picker',
    [type('/'), click(MIC)],
    {
      context: { areas: { voice: ENGINES } },
    },
  ),
]
