/**
 * `ChatPanel` cases: Card events and the timeline. Every case name starts with `cards: `.
 *
 * The inline transcript cards the server records as `role:'system'` messages and emits live
 * as `card` events — the model-in-use notice (with its processing region, and without one
 * for a model the catalog does not know), the plan/build phase markers, the setting notices
 * (effort, fast mode, max loops, region, auto-fix, auto-approve), the loaded-skills count
 * (whose click opens the skills browser), and the app's custom cards through their
 * registered factory (an unregistered name is omitted). How the timeline puts them in
 * place: a preamble card above the reply that is still streaming, a card between the turns
 * its timestamp puts it between, a restored card message rendering like a live one, a
 * card-only timeline hiding the empty-state hint, and the limit card that stepped aside for
 * the live banner returning once the banner clears. And the activity cards a captured side
 * effect adds: above the still-streaming reply, one card per activity id, and the click
 * that tells the host which activity was clicked.
 *
 * @module
 */

import type { CardEvent, ChatMessage } from '@molecule/app-ai-chat'

import type { ChatCardsSeed } from '../../../../bindings/fakes/chat-cards.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import { adv, base, click, DONE, emit, finish, NOW, SEND, TEXT, type } from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/**
 * A `card` stream event: the server-recorded transcript card, emitted with the same id +
 * timestamp it is persisted with, so the live card is byte-identical to the restored one.
 *
 * @param id - The card message's id.
 * @param timestamp - The server timestamp the card is persisted with (ms).
 * @param card - The raw card payload the panel builds the copy from.
 * @returns The event.
 */
const CARD = (id: string, timestamp: number, card: CardEvent): Record<string, unknown> => ({
  type: 'card',
  id,
  timestamp,
  card,
})

/**
 * Opens the reply a case streams, stamped AFTER the turn's preamble cards (the server
 * defers `message_start` to the message's first content, so the reply's timestamp sorts it
 * below every card the turn announced before it).
 *
 * @param id - The assistant message id.
 * @param timestamp - Its server timestamp.
 * @returns The event.
 */
const REPLY = (id: string, timestamp: number): Record<string, unknown> => ({
  type: 'message_start',
  id,
  timestamp,
})

/**
 * A captured outbound email, as an `activity` event carries it.
 *
 * @param id - The activity id (the card's dedupe key).
 * @param summary - Its one-line summary.
 * @param timestamp - When it was captured (ISO).
 * @returns The event.
 */
const ACTIVITY = (id: string, summary: string, timestamp: string): Record<string, unknown> => ({
  type: 'activity',
  activity: {
    id,
    type: 'email',
    status: 'sent',
    recipient: 'ada@example.test',
    summary,
    timestamp,
  },
})

/** The loaded-skills notice (a centered, clickable phase message). */
const SKILLS_LOADED = '[data-mol-id="chat-skills-loaded"]'

/** One skill file the project holds, and its SKILL.md content. */
const SKILL_PATH = '.agents/skills/deploy/SKILL.md'
const SKILL_MD = '---\nname: Deploy\ndescription: Ship the app to production\n---\n'

/**
 * A card message restored from history (`role:'system'` carrying a `cardEvent`): the ONE
 * transcript's persisted form of a live `card` event.
 *
 * @param id - The message id.
 * @param timestamp - Its server timestamp.
 * @param card - The raw card payload.
 * @returns The message.
 */
const cardMessage = (id: string, timestamp: number, card: CardEvent): ChatMessage => ({
  id,
  role: 'system',
  content: '',
  timestamp,
  cardEvent: card,
})

/**
 * The guest limit a next send is refused with after the budget ran out mid-turn, and the
 * two recorded cards around it: the budget card, which declares it covers this same
 * `ai_cost` limit and steps aside while the live banner states it, and a balance card for
 * a DIFFERENT limit, which must stay.
 */
const GUEST_REFUSAL = {
  type: 'error',
  message:
    "You've used today's free AI budget for guests. It refreshes in about 17 hours — or create a free account for more.",
  status: 429,
  limitType: 'ai_cost',
  requiresSignup: true,
}

/** The two recorded limit cards a dedupe case mounts with. */
const LIMIT_CARDS: ChatMessage[] = [
  cardMessage('card-budget', 1_000, { kind: 'custom', name: 'budget_card' }),
  cardMessage('card-balance', 1_001, { kind: 'custom', name: 'balance_card' }),
]

/** What the host's card factories answer for the two recorded limit cards. */
const LIMIT_FACTORIES = {
  budget_card: {
    text: "You've used today's free AI budget for guests. It refreshes tomorrow.",
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  },
  balance_card: {
    text: 'Your usage balance is empty. Add funds in Billing to keep building.',
    tone: 'info',
    action: [{ label: 'Add funds', href: '/billing' }],
    coversLimitType: 'usage_balance',
  },
} satisfies ChatCardsSeed

/**
 * The transcript and factories a limit-dedupe case mounts with.
 *
 * @returns What the case adds to the shared baseline.
 */
const withLimitCards = (): BaseExtra => ({
  context: {
    areas: {
      chat: { history: [LIMIT_CARDS] },
      chatCards: LIMIT_FACTORIES,
    },
  },
})

/** Card events and the timeline. */
export const cardsCases: FeatureCase[] = [
  // ── The model card ─────────────────────────────────────────────────────────
  base('cards: a card event announces the model now in use with its processing region', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'model', model: 'm-pro', label: 'M Pro' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Building with it now.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a model card without a display label names the model id', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'model', model: 'm-free' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('On the free model.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a model card for a model outside the catalog announces no region', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'model', model: 'byo-endpoint' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Routed to your own endpoint.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a card credits the member who made the change', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'model', model: 'm-pro', label: 'M Pro', by: 'Alice' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Continuing on it.')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── The phase cards ────────────────────────────────────────────────────────
  base('cards: a plan-mode card event announces planning', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'mode', mode: 'plan' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Here is the plan.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a build card event announces the build phase', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'mode', mode: 'execute' })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Writing the first files.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  // A newer server can announce a phase or a setting this client does not know (the stream
  // is untyped JSON, so these events go out raw): the card is left out, the reply still shows.
  base('cards: a mode card for a phase this client does not know is left out', [
    ...SEND_IT,
    emit({
      type: 'card',
      id: 'card-1',
      timestamp: NOW + 2,
      card: { kind: 'mode', mode: 'review' },
    }),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Reviewing the changes.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a setting card for a setting this client does not know is left out', [
    ...SEND_IT,
    emit({
      type: 'card',
      id: 'card-1',
      timestamp: NOW + 2,
      card: { kind: 'setting', setting: 'sounds', value: true },
    }),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Done.')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── The setting cards ──────────────────────────────────────────────────────
  base('cards: an effort card names the mode and level it set', [
    ...SEND_IT,
    emit(
      CARD('card-1', NOW + 2, {
        kind: 'setting',
        setting: 'effort',
        value: 'high',
        mode: 'execute',
      }),
    ),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Thinking harder about it.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: an effort card names the model when the server sent one', [
    ...SEND_IT,
    emit(
      CARD('card-1', NOW + 2, {
        kind: 'setting',
        setting: 'effort',
        value: 'high',
        mode: 'execute',
        label: 'M Pro',
      }),
    ),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('On it.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a fast-mode card announces the switch on and off', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'setting', setting: 'fastMode', value: true })),
    emit(CARD('card-2', NOW + 3, { kind: 'setting', setting: 'fastMode', value: false })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Back to the regular pace.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a max-tool-loops card announces the new limit', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'setting', setting: 'maxToolLoops', value: 30 })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Working with more room now.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a region card announces the model and its new region', [
    ...SEND_IT,
    emit(
      CARD('card-1', NOW + 2, { kind: 'setting', setting: 'region', value: 'cn', label: 'M Free' }),
    ),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Continuing from the new region.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: an auto-fix card announces the toggle on and off', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'setting', setting: 'autoFix', value: true })),
    emit(CARD('card-2', NOW + 3, { kind: 'setting', setting: 'autoFix', value: false })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Fixing things myself from here.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: an auto-approve card announces the toggle on and off', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'setting', setting: 'autoApprove', value: true })),
    emit(CARD('card-2', NOW + 3, { kind: 'setting', setting: 'autoApprove', value: false })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Asking before each command again.')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── The loaded-skills card ─────────────────────────────────────────────────
  base('cards: a skills card announces how many skills loaded', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'skills', count: 4 })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('Using them where they help.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base(
    'cards: clicking the loaded-skills card opens the skills browser',
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'skills', count: 4 })),
      emit(REPLY('a1', NOW + 9)),
      emit(TEXT('The deploy skill is loaded.')),
      adv(50),
      emit(DONE),
      finish,
      click(SKILLS_LOADED),
      adv(50),
    ],
    {
      withoutHttp: ['/projects/p1/files-list'],
      http: [
        { method: 'GET', url: '/projects/p1/files-list', data: { files: [] } },
        { method: 'GET', url: '/projects/p1/files-list', data: { files: [SKILL_PATH] } },
        { method: 'GET', url: `/projects/p1/files/${SKILL_PATH}`, data: { content: SKILL_MD } },
      ],
    },
  ),

  // ── The app's custom cards ─────────────────────────────────────────────────
  base(
    "cards: a custom card event renders through the app's registered factory",
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'upgrade_nudge', data: {} })),
      emit(REPLY('a1', NOW + 9)),
      emit(TEXT('Continuing anyway.')),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: {
        areas: {
          chatCards: {
            upgrade_nudge: {
              text: 'You hit the plan limit for today.',
              tone: 'upgrade',
              action: [{ label: 'Upgrade', href: '/pricing' }],
            },
          },
        },
      },
    },
  ),
  base('cards: a custom card event no factory renders is left out of the timeline', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'app_only_card', data: {} })),
    emit(REPLY('a1', NOW + 9)),
    emit(TEXT('On it.')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── Where the timeline puts a card ─────────────────────────────────────────
  base('cards: a preamble card renders above the reply that is still streaming', [
    ...SEND_IT,
    emit(CARD('card-1', NOW + 2, { kind: 'mode', mode: 'execute' })),
    emit(REPLY('a1', NOW + 9)),
  ]),
  base('cards: a card lands between the turns its timestamp puts it between', [
    ...SEND_IT,
    emit(REPLY('a1', NOW + 1)),
    emit(TEXT('First reply.')),
    adv(50),
    emit(DONE),
    finish,
    // The clock sits at NOW + 50 after the first turn's flush, so the second
    // send (typed at NOW + 5_050) sorts after the card stamped NOW + 2_000.
    adv(5_000),
    type('Second request'),
    click(SEND),
    emit(CARD('card-1', NOW + 2_000, { kind: 'mode', mode: 'execute' })),
    emit(REPLY('a2', NOW + 5_051)),
    emit(TEXT('Second reply.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('cards: a card message restored from history renders like a live one', [], {
    context: {
      areas: {
        chat: {
          history: [
            [
              { id: 'm1', role: 'user', content: 'Ship it', timestamp: NOW - 3_000 },
              cardMessage('card-1', NOW - 2_000, { kind: 'mode', mode: 'execute' }),
              { id: 'm2', role: 'assistant', content: 'Building now.', timestamp: NOW - 1_000 },
            ],
          ],
        },
      },
    },
  }),
  base('cards: a timeline holding only cards shows no empty hint', [], {
    context: {
      areas: {
        chat: { history: [[cardMessage('card-1', NOW - 1_000, { kind: 'skills', count: 2 })]] },
      },
    },
  }),
  base(
    "cards: the covered limit card returns once the refused send's banner clears",
    [
      ...SEND_IT,
      emit(GUEST_REFUSAL),
      finish,
      type('Try again'),
      click(SEND),
      emit(REPLY('a2', NOW + 9)),
      emit(TEXT('On it again.')),
      adv(50),
      emit(DONE),
      finish,
    ],
    withLimitCards(),
  ),

  // ── The activity cards a captured side effect adds ─────────────────────────
  base('cards: an activity card captured mid-turn renders above the still-streaming reply', [
    ...SEND_IT,
    emit(REPLY('a1', NOW + 1)),
    emit(ACTIVITY('act-1', 'Welcome aboard', '2023-11-14T22:13:22.000Z')),
    adv(50),
  ]),
  base('cards: an activity event repeated with the same id adds one card', [
    ...SEND_IT,
    emit(ACTIVITY('act-1', 'First capture', '2023-11-14T22:13:21.000Z')),
    emit(ACTIVITY('act-1', 'Second capture', '2023-11-14T22:13:22.000Z')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base(
    'cards: clicking an activity card tells the host which activity was clicked',
    [
      ...SEND_IT,
      emit(ACTIVITY('act-1', 'Welcome aboard', '2023-11-14T22:13:21.000Z')),
      adv(50),
      emit(DONE),
      finish,
      click('[data-mol-id="activity-card-act-1"]'),
    ],
    {
      props: { onActivityClick: { $callback: 'onActivityClick' } },
    },
  ),
]
