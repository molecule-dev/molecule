/**
 * `ChatPanel` cases: Message timestamps. Every case name starts with `timestamps: `.
 *
 * The `/timestamps` display preference (`chat:prefs`) and the times it puts on the timeline
 * (`chat:timeline`): the per-device off default that still stamps the viewer's own messages,
 * the command that flips it (bare toggle, explicit `on` / `off`, the `show` / `hide`
 * synonyms, the unrecognized argument's usage line), the stored preference that restores at
 * mount, another tab's write applying live with no announcement card, the `/settings` row
 * reading the live value and its Edit running the toggle, the minute clock re-planning the
 * labels (and un-grouping a run it had collapsed), a reply that is still thinking carrying
 * no time until it has content, and which items qualify: a typed message's header time, an
 * automatic fix message's line time, a critical reply (failed verification, resource
 * limit), a team note, failed commit and activity cards, the onboarding tip, a critical
 * custom card, and the `/help` guide that never carries one.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { ChatCardsSeed } from '../../../../bindings/fakes/chat-cards.js'
import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  DONE,
  emit,
  finish,
  key,
  NOW,
  SEND,
  sideEmit,
  sideFinish,
  TEAM_COMMAND,
  TEXT,
  type,
} from './fixtures.js'

/** The changed-files strip's commit action. */
const COMMIT_BUTTON = '[data-mol-id="chat-commit-button"]'

/** The settings overlay's Edit button on the timestamps row. */
const EDIT_TIMESTAMPS = '[data-mol-id="setting-edit-timestamps"]'

/** The localStorage key the per-device preference persists under. */
const STORAGE_KEY = 'mol_chat_show_timestamps'

/** The empty storage a command case seeds, so the panel's own write is recorded. */
const EMPTY_STORAGE = {}

/** The stored preference with timestamps on (what `/timestamps` writes). */
const TIMESTAMPS_ON = { [STORAGE_KEY]: 'true' }

/** The stored preference with timestamps explicitly off. */
const TIMESTAMPS_OFF = { [STORAGE_KEY]: 'false' }

/**
 * The seeded transcript most cases read: a five-minute-old ask and its four-minute-old
 * reply, so the two carry different labels ("5 minutes ago" / "4 minutes ago").
 */
const HISTORY: ChatMessage[] = [
  { id: 'u1', role: 'user', content: 'Build a quiz page', timestamp: NOW - 300_000 },
  {
    id: 'a1',
    role: 'assistant',
    content: 'Saved the plan — building it now.',
    timestamp: NOW - 240_000,
  },
]

/**
 * A transcript like {@link HISTORY} but with this reply: the ask stays five minutes old.
 *
 * @param reply - The reply message.
 * @returns The transcript.
 */
const withReply = (reply: ChatMessage): ChatMessage[] => [
  { id: 'u1', role: 'user', content: 'Build a quiz page', timestamp: NOW - 300_000 },
  reply,
]

/**
 * What a resumed conversation adds: the open conversation's scripted reads and a seeded
 * transcript (a resumed conversation shows no entry tip, so the timeline holds exactly the
 * seeded items unless a step adds one), and optionally this case's stored preference.
 *
 * @param options - What the case seeds over the plain resume.
 * @param options.history - The transcript the chat fake answers `loadHistory` with.
 * @param options.storage - The localStorage entries the case starts from.
 * @returns What the case adds to the shared baseline.
 */
const resumed = (
  options: { history?: ChatMessage[]; storage?: Record<string, string> } = {},
): BaseExtra => ({
  props: { conversationId: 'c1' },
  context: {
    areas: { chat: { history: [options.history ?? HISTORY] } },
    ...(options.storage ? { window: { localStorage: options.storage } } : {}),
  },
  http: [...CONV_HTTP('c1')],
})

/**
 * A `message_start` the case stamps itself (the fixture's `START` fixes one timestamp).
 *
 * @param id - The assistant message id.
 * @param timestamp - Its server timestamp.
 * @returns The event.
 */
const reply = (id: string, timestamp: number): Record<string, unknown> => ({
  type: 'message_start',
  id,
  timestamp,
})

/** What a failed verification says (the text the reply's error badge counts). */
const VERIFY_OUTPUT = 'src/app.ts(4,11): error TS2304: Cannot find name "quizzer"'

/** A verification that found one type error, as the stream reports it. */
const VERIFY_FAIL = {
  type: 'verification_result',
  status: 'error',
  output: VERIFY_OUTPUT,
  workspaces: [],
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

/** The reply a failed-verification case seeds: one verification block, status error. */
const VERIFY_REPLY: ChatMessage = {
  id: 'a-verify',
  role: 'assistant',
  content: '',
  timestamp: NOW - 120_000,
  blocks: [
    {
      type: 'verification',
      status: 'error',
      output: VERIFY_OUTPUT,
      workspaces: [],
      categories: ['type'],
    },
  ],
}

/** The reply a resource-limit case seeds: the banner block that marks it critical. */
const LIMIT_REPLY: ChatMessage = {
  id: 'a-limit',
  role: 'assistant',
  content: '',
  timestamp: NOW - 120_000,
  blocks: [{ type: 'resource_limit', resource: 'tokens', message: 'This reply hit the limit.' }],
}

/** The team note the side channel answers a sent `/teamsay` with, half a minute old. */
const TEAM_NOTE: Record<string, unknown> = {
  type: 'message',
  message: {
    id: 'n1',
    role: 'system',
    content: 'checking in',
    teamOnly: true,
    author: { id: 'u2', name: 'Mara' },
    hiddenFromAi: true,
    timestamp: NOW - 30_000,
  },
}

/** One changed file, as the git-status answer reports it. */
const ONE_FILE = [{ path: 'src/Login.tsx', status: 'M', additions: 3, deletions: 1 }]

/** The dirty git-status answer the commit cases script. */
const GIT_DIRTY: HttpScript = {
  method: 'GET',
  url: '/projects/p1/git-status',
  data: { files: ONE_FILE },
}

/** The project settings that turn the default auto-commit cadence off, so /commit commits now. */
const AUTO_COMMIT_OFF: HttpScript = {
  method: 'GET',
  url: '/projects/p1',
  data: { settings: { autoCommitSeconds: 0 } },
}

/** The `POST /commit` answer for a commit that landed (the card the response's shape renders). */
const COMMIT_OK: HttpScript = {
  method: 'POST',
  url: '/projects/p1/commit',
  data: { ok: true, committed: true, message: 'feat: add login page', files: ['src/Login.tsx'] },
}

/** The commit POST, held back so the failed-answer step finds the running card's stream. */
const COMMIT_POST: HttpScript = { method: 'POST', url: '/projects/p1/commit', defer: true }

/** A failed outbound email, as an `activity` event carries it. */
const ACTIVITY_FAILED: Record<string, unknown> = {
  type: 'activity',
  activity: {
    id: 'act-1',
    type: 'email',
    status: 'failed',
    recipient: 'ada@example.test',
    summary: 'Welcome aboard',
    timestamp: '2023-11-14T22:13:19.000Z',
  },
}

/**
 * A card message restored from history (`role:'system'` carrying a `cardEvent`).
 *
 * @param id - The message id.
 * @param timestamp - Its server timestamp.
 * @param name - The custom event name the app's factory renders.
 * @returns The message.
 */
const cardMessage = (id: string, timestamp: number, name: string): ChatMessage => ({
  id,
  role: 'system',
  content: '',
  timestamp,
  cardEvent: { kind: 'custom', name },
})

/** The app's card factory for a critical custom card: the one card timestamps always show. */
const CRITICAL_CARD: ChatCardsSeed = {
  upgrade_blocker: {
    text: 'The workspace is out of credits. Ask the owner to add funds.',
    tone: 'upgrade',
    critical: true,
  },
}

/**
 * Types a slash command and runs it, the way the command menu's Enter does.
 *
 * @param command - The command text.
 * @returns The steps.
 */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** Message timestamps. */
export const timestampsCases: FeatureCase[] = [
  // ── The off default ─────────────────────────────────────────────────────────
  base(
    'timestamps: a fresh panel hides reply times but stamps the user’s own messages',
    [],
    resumed(),
  ),

  // ── The /timestamps command ─────────────────────────────────────────────────
  base(
    'timestamps: /timestamps turns every time on and announces it',
    run('/timestamps'),
    resumed({ storage: EMPTY_STORAGE }),
  ),
  base(
    'timestamps: /timestamps off hides the times again and announces it',
    run('/timestamps off'),
    resumed({ storage: TIMESTAMPS_ON }),
  ),
  base(
    'timestamps: /timestamps on forces times on over a stored off',
    run('/timestamps on'),
    resumed({ storage: TIMESTAMPS_OFF }),
  ),
  base(
    'timestamps: /timestamps show and hide mean on and off',
    [...run('/timestamps show'), ...run('/timestamps hide')],
    resumed({ storage: TIMESTAMPS_OFF }),
  ),
  base(
    'timestamps: an unrecognized /timestamps argument shows the usage line and changes nothing',
    run('/timestamps banana'),
    resumed({ storage: EMPTY_STORAGE }),
  ),

  // ── The stored and cross-tab preference ─────────────────────────────────────
  base(
    'timestamps: the stored preference turns every time on at mount',
    [],
    resumed({ storage: TIMESTAMPS_ON }),
  ),
  base(
    'timestamps: another tab turning the preference on adds the times live',
    [
      { type: 'localStorage', key: STORAGE_KEY, value: 'true' },
      { type: 'localStorage', key: STORAGE_KEY, value: null },
    ],
    resumed({ storage: EMPTY_STORAGE }),
  ),

  // ── The minute clock ────────────────────────────────────────────────────────
  // Two items seconds apart share one label and stay grouped however far the
  // clock runs (the tick lands on whole minutes, which never falls between
  // them); what the tick changes is the label text itself, and the fresh
  // label a message sent after it gets against the moved clock.
  {
    ...base(
      'timestamps: the minute tick advances the labels of the times already shown',
      [adv(60_000)],
      resumed({
        storage: TIMESTAMPS_ON,
        history: [
          { id: 'u1', role: 'user', content: 'Start the countdown', timestamp: NOW - 45_000 },
          { id: 'a1', role: 'assistant', content: 'Counting down now.', timestamp: NOW - 15_000 },
        ],
      }),
    ),
    random: [0.99],
  },
  {
    ...base(
      'timestamps: a message sent after the minute tick carries its own fresh label',
      [adv(60_000), type('Go on'), click(SEND), adv(50)],
      resumed({
        storage: TIMESTAMPS_ON,
        history: [
          { id: 'u1', role: 'user', content: 'Start the countdown', timestamp: NOW - 45_000 },
          { id: 'a1', role: 'assistant', content: 'Counting down now.', timestamp: NOW - 15_000 },
        ],
      }),
    ),
    random: [0.99],
  },

  // ── What qualifies while a turn is young ────────────────────────────────────
  {
    ...base(
      'timestamps: a reply that is still thinking carries no time until it has content',
      [
        type('Now add certificates'),
        click(SEND),
        adv(50),
        adv(61_000),
        emit(reply('a2', NOW + 62_000)),
        adv(50),
        emit(TEXT('On it — building the certificate module.')),
        adv(50),
        emit(DONE),
        finish,
      ],
      resumed({ storage: TIMESTAMPS_ON }),
    ),
    random: [0.99],
  },
  {
    ...base(
      'timestamps: an automatic fix message carries its time on a line, not in a header',
      [
        type('Build the thing'),
        click(SEND),
        emit(reply('a2', NOW + 1)),
        emit(VERIFY_FAIL),
        adv(50),
        emit(DONE),
        finish,
        adv(3_000),
        adv(59_000),
      ],
      resumed({ storage: TIMESTAMPS_ON }),
    ),
    random: [0.99],
  },

  // ── Critical replies keep their time even with timestamps off ───────────────
  base(
    'timestamps: a failed verification keeps its reply’s time even with timestamps off',
    [],
    resumed({ history: withReply(VERIFY_REPLY) }),
  ),
  base(
    'timestamps: a reply that hit the resource limit keeps its time with timestamps off too',
    [],
    resumed({ history: withReply(LIMIT_REPLY) }),
  ),

  // ── Team notes and cards ────────────────────────────────────────────────────
  base(
    'timestamps: a team note keeps its header time even with timestamps off',
    [type('/teamsay checking in'), click(SEND), sideEmit(TEAM_NOTE), sideFinish],
    {
      props: { conversationId: 'c1', extraCommands: [TEAM_COMMAND] },
      context: { areas: { chat: { history: [HISTORY], sideChannel: true } } },
      http: [...CONV_HTTP('c1')],
    },
  ),
  base(
    'timestamps: a failed commit card keeps its time even with timestamps off',
    [
      click(COMMIT_BUTTON),
      {
        type: 'http',
        method: 'POST',
        url: '/projects/p1/commit',
        networkError: 'The sandbox is unreachable',
      },
    ],
    {
      props: { conversationId: 'c1' },
      http: [AUTO_COMMIT_OFF, GIT_DIRTY, COMMIT_POST, ...CONV_HTTP('c1')],
    },
  ),
  base(
    'timestamps: a committed card only gains its time when timestamps turn on',
    [...run('/commit'), ...run('/timestamps')],
    {
      props: { conversationId: 'c1' },
      context: {
        areas: { chat: { history: [HISTORY] } },
        window: { localStorage: EMPTY_STORAGE },
      },
      http: [AUTO_COMMIT_OFF, GIT_DIRTY, COMMIT_OK, ...CONV_HTTP('c1')],
    },
  ),
  base(
    'timestamps: a failed activity card keeps its time even with timestamps off',
    [
      type('Send the welcome email'),
      click(SEND),
      emit(reply('a2', NOW + 1)),
      emit(ACTIVITY_FAILED),
      adv(50),
    ],
    resumed(),
  ),
  base(
    'timestamps: the onboarding tip carries its time only once timestamps turn on',
    run('/timestamps'),
    {
      context: {
        areas: { chat: { history: [HISTORY] } },
        window: { localStorage: EMPTY_STORAGE },
      },
    },
  ),
  base('timestamps: a critical custom card keeps its time even with timestamps off', [], {
    props: { conversationId: 'c1' },
    context: {
      areas: {
        chat: {
          history: [
            [
              { id: 'u1', role: 'user', content: 'Build a quiz page', timestamp: NOW - 300_000 },
              cardMessage('card-1', NOW - 120_000, 'upgrade_blocker'),
            ],
          ],
        },
        chatCards: CRITICAL_CARD,
      },
    },
    http: [...CONV_HTTP('c1')],
  }),
  base(
    'timestamps: the /help guide card never carries a time',
    run('/help'),
    resumed({ storage: TIMESTAMPS_ON }),
  ),

  // ── The settings overlay's timestamps row ───────────────────────────────────
  base(
    'timestamps: the settings overlay’s timestamps row reads the live preference',
    [...run('/timestamps'), ...run('/settings')],
    resumed({ storage: EMPTY_STORAGE }),
  ),
  base(
    'timestamps: the settings row’s Edit runs the timestamps toggle',
    [...run('/settings'), click(EDIT_TIMESTAMPS)],
    resumed({ storage: TIMESTAMPS_ON }),
  ),
]
