/**
 * `ChatPanel` cases: App-registered custom event cards. Every case name starts with
 * `custom cards: `.
 *
 * A `custom` card event (`{ kind: 'custom', name, data }`) renders through the factory the
 * host registered for its name (`registerCustomEventCard`): the factory builds the copy,
 * tone, icon, body and actions from the event's data. What a factory's answer costs — a
 * factory that throws drops its one card and logs, one answering null renders nothing, and
 * each event's own data builds its own card. What an answer renders: the five tones' ONE
 * notice box (an `emphasized` card, or one that merely carries an action, falls back to the
 * neutral `info` box; a card with none of those stays a plain muted line, multi-line in
 * monospace), an icon override, the composable content body that replaces text and the
 * action row, and the action row itself — several design-system buttons, a click the app's
 * handler sees, an action's own colour over the tone's default, a monospace code label, and
 * where each href opens (a new tab for an external or protocol-relative link, the same tab
 * for an app route, inert text for a scheme no card action may run). A card arrives live
 * (an event repeated with its server id renders once), restored from history, or pushed
 * from a teammate's turn.
 *
 * @module
 */

import type { CardEvent, ChatMessage } from '@molecule/app-ai-chat'

import type { CaseChatCard } from '../../../../bindings/fakes/chat-cards.js'
import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  DONE,
  emit,
  finish,
  NOW,
  SEND,
  START,
  TEXT,
  type,
} from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/** The saved conversation a mount resumes, so broadcast frames for `c1` are applied. */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** The notice card the timeline renders a toned card through. */
const NOTICE = '[data-mol-id="chat-notice-card"]'

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
 * A card message restored from history (`role:'system'` carrying a `cardEvent`): the ONE
 * transcript's persisted form of a live `card` event.
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

/**
 * The transcript a render case mounts with: a five-minute-old ask and the four-minute-old
 * card under test, so the card reads where the turn left it.
 *
 * @param id - The card message's id.
 * @param name - The custom event name the app's factory renders.
 * @returns The transcript.
 */
const transcriptWith = (id: string, name: string): ChatMessage[] => [
  { id: 'u1', role: 'user', content: 'Build the landing page', timestamp: NOW - 300_000 },
  cardMessage(id, NOW - 200_000, name),
]

/**
 * A render case: the card under test restored from history, with the app's factory seeded
 * for its name. The mount snapshot is the whole claim — how React renders one card.
 *
 * @param name - The case name.
 * @param seed - The custom event name and what the app's factory answers for it.
 * @returns The case.
 */
const rendered = (name: string, [eventName, card]: readonly [string, CaseChatCard]): FeatureCase =>
  base(name, [], {
    context: {
      areas: {
        chat: { history: [transcriptWith(`card-${eventName}`, eventName)] },
        chatCards: { [eventName]: card },
      },
    },
  })

/** App-registered custom event cards. */
export const customCardsCases: FeatureCase[] = [
  // ── How a card arrives ─────────────────────────────────────────────────────
  base(
    'custom cards: a card event repeated with the same id renders once',
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'deploy_started', data: {} })),
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'deploy_started', data: {} })),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: {
        areas: {
          chatCards: { deploy_started: { text: 'Deploy started.', tone: 'info' } },
        },
      },
    },
  ),
  rendered('custom cards: a custom card restored from history renders through its factory', [
    'restored_notice',
    {
      text: 'Your build hit the plan limit yesterday.',
      tone: 'gold',
      action: [{ label: 'See plans', href: '/pricing' }],
    },
  ]),
  base(
    "custom cards: a teammate's custom card event renders through its factory too",
    [
      {
        type: 'invoke',
        callback: 'onRegisterPushHandler',
        path: [0],
        args: ['c1', CARD('card-push', NOW + 1, { kind: 'custom', name: 'team_broadcast' })],
      },
      adv(50),
    ],
    {
      props: { onRegisterPushHandler: { $callback: 'onRegisterPushHandler' } },
      context: {
        areas: {
          chatCards: {
            team_broadcast: { text: 'Ada started a build.', tone: 'info' },
          },
        },
        window: { localStorage: SAVED_CONV },
      },
      http: [...CONV_HTTP('c1')],
    },
  ),

  // ── What a factory's answer costs ──────────────────────────────────────────
  base(
    'custom cards: a factory that throws drops its card and logs, and the rest renders',
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'broken_card', data: {} })),
      emit(CARD('card-2', NOW + 3, { kind: 'custom', name: 'steady_card', data: {} })),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: {
        areas: {
          chatCards: {
            broken_card: 'throw',
            steady_card: { text: 'The steady card still shows.', tone: 'info' },
          },
        },
      },
    },
  ),
  base(
    'custom cards: a factory that answers null leaves only the rest of the timeline',
    [
      ...SEND_IT,
      emit(START('a1')),
      emit(TEXT('On it.')),
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'silent_card', data: {} })),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: {
        areas: {
          chatCards: { silent_card: null },
        },
      },
    },
  ),
  base(
    "custom cards: each event's own data builds its own card",
    [
      ...SEND_IT,
      emit(
        CARD('card-1', NOW + 2, {
          kind: 'custom',
          name: 'per_event',
          data: { text: 'First build started.', tone: 'info' },
        }),
      ),
      emit(
        CARD('card-2', NOW + 3, {
          kind: 'custom',
          name: 'per_event',
          data: { text: 'Build finished.', tone: 'success' },
        }),
      ),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: {
        areas: {
          chatCards: { per_event: 'data' },
        },
      },
    },
  ),

  // ── The tone box ───────────────────────────────────────────────────────────
  rendered('custom cards: a card with no tone, emphasis or action stays a plain muted line', [
    'plain_note',
    { text: 'Deploy finished.' },
  ]),
  rendered('custom cards: a multi-line plain card renders left-aligned in monospace', [
    'multiline_note',
    { text: 'Region moved to cn.\nContinuing from there.' },
  ]),
  rendered('custom cards: an emphasized card without a tone renders the neutral info notice', [
    'emphasized_note',
    { text: 'Your workspace is one seat from its limit.', emphasized: true },
  ]),
  rendered('custom cards: an action alone renders the neutral info notice with its button', [
    'action_note',
    { text: 'Your balance is empty.', action: [{ label: 'Add funds', href: '/billing' }] },
  ]),
  rendered('custom cards: a gold card renders the gold tip notice', [
    'gold_tip',
    { text: 'Tip: smaller uploads convert faster.', tone: 'gold' },
  ]),
  rendered('custom cards: a success card renders the green success notice', [
    'success_note',
    { text: 'Script deploy saved.', tone: 'success' },
  ]),
  rendered('custom cards: a signup card renders the signup notice', [
    'signup_note',
    {
      text: 'Create a free account to keep your work.',
      tone: 'signup',
      action: [{ label: 'Sign up', href: '/signup' }],
    },
  ]),
  rendered('custom cards: an icon override replaces the tone glyph', [
    'icon_override',
    { text: 'Deploy queued.', tone: 'upgrade', icon: 'sparkle' },
  ]),

  // ── The composable body ────────────────────────────────────────────────────
  rendered('custom cards: a content body replaces the text and the action row', [
    'content_card',
    {
      text: 'Plan limit reached — see your options for more.',
      tone: 'gold',
      action: [{ label: 'Upgrade', href: '/pricing' }],
      content: ['Plan limit reached — see ', { label: 'your options', href: '/pricing' }, '.'],
    },
  ]),
  rendered('custom cards: a content code segment renders as inline monospace code', [
    'code_card',
    {
      text: 'Then run /deploy again.',
      tone: 'info',
      content: ['Then run ', { code: '/deploy' }, ' again.'],
    },
  ]),
  rendered('custom cards: a plain card renders its content segments too', [
    'plain_content',
    {
      text: 'Script saved as deploy.',
      content: ['Script saved as ', { label: 'deploy', href: '/scripts' }],
    },
  ]),

  // ── The actions ────────────────────────────────────────────────────────────
  rendered('custom cards: several actions render as one row of design-system buttons', [
    'two_actions',
    {
      text: 'Upgrade for longer runs.',
      tone: 'upgrade',
      action: [
        { label: 'Upgrade', href: '/pricing' },
        { label: 'Compare plans', href: 'https://example.test/plans' },
      ],
    },
  ]),
  base(
    "custom cards: clicking an action calls the app's handler",
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'clickable_card', data: {} })),
      adv(50),
      emit(DONE),
      finish,
      click(`${NOTICE} button`),
    ],
    {
      context: {
        areas: {
          chatCards: {
            clickable_card: {
              text: 'Redeploy the preview?',
              tone: 'info',
              action: [{ label: 'Redeploy', onClick: 'redeploy' }],
            },
          },
        },
      },
    },
  ),
  rendered('custom cards: an action colour overrides the tone default button colour', [
    'colored_action',
    {
      text: 'Upgrade for longer runs.',
      tone: 'upgrade',
      action: [{ label: 'See plans', href: '/pricing', color: 'primary' }],
    },
  ]),
  rendered('custom cards: a code-labelled action renders its label in monospace', [
    'code_action',
    {
      text: 'Rerun the failed job.',
      tone: 'info',
      action: [{ label: '/retry', href: '/jobs/retry', code: true }],
    },
  ]),
  rendered('custom cards: an external action opens a new tab without opener', [
    'external_link_card',
    {
      text: 'The status page reports an incident.',
      tone: 'info',
      action: [{ label: 'Status', href: 'https://status.example.test' }],
    },
  ]),
  rendered('custom cards: a protocol-relative action opens like an external one', [
    'sso_card',
    {
      text: 'Your session expired.',
      tone: 'info',
      action: [{ label: 'Re-auth', href: '//accounts.example.test/login' }],
    },
  ]),
  rendered('custom cards: an app-route action stays a same-tab link', [
    'route_card',
    {
      text: 'The docs cover this in depth.',
      tone: 'info',
      action: [{ label: 'Docs', href: '/docs/chat' }],
    },
  ]),
  rendered('custom cards: an action with a disallowed link scheme renders inert text', [
    'blocked_scheme',
    {
      text: 'A card action cannot run this link.',
      tone: 'info',
      action: [{ label: 'Run me', href: 'javascript:alert(1)' }],
    },
  ]),
  base(
    'custom cards: an action with a link target renders the link, not the click handler',
    [
      ...SEND_IT,
      emit(CARD('card-1', NOW + 2, { kind: 'custom', name: 'linked_card', data: {} })),
      adv(50),
      emit(DONE),
      finish,
      click(`${NOTICE} a[href="/pricing"]`),
    ],
    {
      context: {
        areas: {
          chatCards: {
            linked_card: {
              text: 'Upgrade for longer runs.',
              tone: 'upgrade',
              action: [{ label: 'Upgrade', href: '/pricing', onClick: 'never' }],
            },
          },
        },
      },
    },
  ),
]
