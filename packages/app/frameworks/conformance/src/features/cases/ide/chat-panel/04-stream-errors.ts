/**
 * `ChatPanel` cases: Stream errors and auto-retry. Every case name starts with `stream error: `.
 *
 * The refused turn and what the panel does about it: a 5XX (or a transport drop)
 * never surfaces directly — it starts a cancelable countdown that ticks once per
 * second and then re-sends the message (nothing reached the server yet) or
 * resumes the interrupted turn (a partial reply is already on screen); a second
 * failure in the same turn re-arms at double the wait, until the attempt budget
 * runs out and the error finally surfaces. Everything else — a 4XX, a
 * status-less server error, a limit or signup gate even on a 5XX — is terminal
 * right away: the plain banner, the resource-limit banner (whose buttons are the
 * host's `buildUpgradeCta` answer to the backend's whole refusal), or, for a
 * read-only viewer, the calm view-only notice that clears itself. A recorded
 * card that covers the live banner's limit steps aside while the banner is up
 * and returns when it goes — stale, for a guest limit, the moment the viewer
 * signs in.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { ChatCardsSeed } from '../../../../bindings/fakes/chat-cards.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import { adv, base, click, DONE, emit, finish, props, SEND, START, TEXT, type } from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/**
 * A retryable 5XX: the server said "try again" (an overload shed, a deploying
 * instance's shutdown handoff).
 *
 * @param message - The error message held back while the countdown runs.
 * @returns The stream event.
 */
const SERVER_DROP = (message: string): Record<string, unknown> => ({
  type: 'error',
  message,
  status: 503,
})

/** The retry countdown's Cancel button. */
const CANCEL_RETRY = '[data-mol-id="chat-retry-cancel"]'

/**
 * The budget card recorded when a turn was interrupted, and a balance card for
 * a DIFFERENT limit — a card names the limit it covers (`coversLimitType`), and
 * the one matching the live banner steps aside.
 */
const LIMIT_CARDS: ChatMessage[] = [
  {
    id: 'card-budget',
    role: 'system',
    content: '',
    timestamp: 1_000,
    cardEvent: { kind: 'custom', name: 'lim_budget' },
  },
  {
    id: 'card-balance',
    role: 'system',
    content: '',
    timestamp: 1_001,
    cardEvent: { kind: 'custom', name: 'lim_balance' },
  },
]

/** What the host's card factories answer for the two recorded cards. */
const LIMIT_CARD_FACTORIES = {
  lim_budget: {
    text: "You've used today's free AI budget for guests. It refreshes tomorrow.",
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  },
  lim_balance: {
    text: 'Your usage balance is empty. Add funds in Billing to keep building.',
    tone: 'info',
    action: [{ label: 'Add funds', href: '/billing' }],
    coversLimitType: 'usage_balance',
  },
} satisfies ChatCardsSeed

/** The refusal a next send gets after the budget ran out mid-turn. */
const GUEST_LIMIT_REFUSAL = {
  type: 'error',
  message:
    "You've used today's free AI budget for guests. It refreshes in about 17 hours — or create a free account for more.",
  status: 429,
  limitType: 'ai_cost',
  requiresSignup: true,
}

/**
 * The two recorded limit cards a case mounts with, through the chat history and
 * the app's custom card factories.
 *
 * @returns What the case adds to the shared baseline.
 */
const withLimitCards = (): BaseExtra => ({
  context: {
    areas: {
      chat: { history: [LIMIT_CARDS] },
      chatCards: LIMIT_CARD_FACTORIES,
    },
  },
})

/** Stream errors and auto-retry. */
export const streamErrorsCases: FeatureCase[] = [
  // ── The auto-retry countdown ───────────────────────────────────────────────
  base('stream error: a 5xx error starts the cancelable retry countdown instead of surfacing', [
    ...SEND_IT,
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
  ]),
  base('stream error: the retry countdown ticks down each second', [
    ...SEND_IT,
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
    adv(1_000),
    adv(2_000),
  ]),
  base('stream error: cancelling the retry surfaces the held-back error', [
    ...SEND_IT,
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
    adv(1_000),
    click(CANCEL_RETRY),
  ]),
  base('stream error: a transport drop starts the same retry countdown as a 5xx', [
    ...SEND_IT,
    emit({ type: 'error', message: 'The connection dropped mid-turn', transport: true }),
    finish,
    adv(1_000),
  ]),
  base('stream error: a status-less error is terminal and never retried', [
    ...SEND_IT,
    emit({ type: 'error', message: 'The provider refused this request' }),
    finish,
  ]),
  base('stream error: a 5xx carrying a limit is surfaced, not retried', [
    ...SEND_IT,
    emit({ ...GUEST_LIMIT_REFUSAL, status: 503 }),
    finish,
  ]),

  // ── The retry itself ───────────────────────────────────────────────────────
  base('stream error: an early 5xx failure auto-retries by sending the message again', [
    ...SEND_IT,
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
    adv(5_000),
    emit(START('a1')),
    emit(TEXT('Back on it.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('stream error: a mid-turn 5xx failure auto-retries by resuming the interrupted turn', [
    ...SEND_IT,
    emit(START('a1')),
    emit(TEXT('Half an answer')),
    adv(50),
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
    adv(5_000),
    adv(1_000),
    emit(START('a2')),
    emit(TEXT('Resumed from where it stopped.')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('stream error: a second failure in one turn re-arms the retry at double the wait', [
    ...SEND_IT,
    emit(SERVER_DROP('The API is restarting, your turn continues shortly')),
    finish,
    adv(5_000),
    emit(SERVER_DROP('The API is still restarting')),
    finish,
    adv(1_000),
  ]),
  base('stream error: the retry budget exhausts and the error finally surfaces', [
    ...SEND_IT,
    // The ladder's waits: 5s, 10s, 20s, then 30s per attempt, eight attempts.
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(5_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(10_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(20_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(30_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(30_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(30_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(30_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
    adv(30_000),
    emit(SERVER_DROP('The API is restarting')),
    finish,
  ]),

  // ── The terminal error's surfaces ──────────────────────────────────────────
  base('stream error: the host hears the turn ended when the stream errors', [
    ...SEND_IT,
    emit({ type: 'error', message: 'The model refused this request', status: 400 }),
    finish,
  ]),
  base(
    'stream error: the limit banner renders the remedy buttons the host builds',
    [
      ...SEND_IT,
      emit({
        type: 'error',
        message: 'Your usage balance is empty. Add funds to keep building.',
        status: 429,
        limitType: 'usage_balance',
        requiresSignup: false,
        billingAction: 'add_funds',
        upgradeTier: null,
      }),
      finish,
    ],
    // The host's CTA builder is a render-driven function prop, so it is a `$fn`:
    // every framework renders the same buttons, and how often each framework
    // called it (once per render of the banner) is not recorded.
    {
      props: {
        buildUpgradeCta: {
          $fn: 'buildUpgradeCta',
          returns: [{ label: 'Add funds', href: '/billing' }],
        },
      },
    },
  ),
  base(
    'stream error: a recorded card covering the live limit steps aside while its banner is up',
    [...SEND_IT, emit(GUEST_LIMIT_REFUSAL), finish],
    withLimitCards(),
  ),
  base(
    'stream error: a guest limit banner is stale once the viewer signs in, and its card returns',
    [...SEND_IT, emit(GUEST_LIMIT_REFUSAL), finish, props({ isAnonymous: false })],
    { ...withLimitCards(), props: { isAnonymous: true } },
  ),
  base("stream error: a viewer's access-denied error shows a calm notice, not the alarm banner", [
    ...SEND_IT,
    emit({
      type: 'error',
      message: 'Chat is read-only for this viewer: access denied.',
      status: 403,
    }),
    finish,
    props({ canEdit: false }),
  ]),
  base('stream error: the view-only notice clears itself after a few seconds', [
    ...SEND_IT,
    emit({
      type: 'error',
      message: 'Chat is read-only for this viewer: access denied.',
      status: 403,
    }),
    finish,
    props({ canEdit: false }),
    adv(6_000),
  ]),
]
