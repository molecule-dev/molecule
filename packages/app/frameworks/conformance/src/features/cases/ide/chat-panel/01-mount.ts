/**
 * `ChatPanel` cases: Mount and baseline loads. Every case name starts with `mount: `.
 *
 * What a mount renders from its baseline: the empty-state hint and what gates
 * it (the onboarding tip, a sandbox-boot wait, a transcript-only viewer, a
 * host-gated share capability, a phone-width viewport, a coarse pointer), the
 * model catalog and project settings restoring the saved agent setup (the
 * `/model`, `/maxloops` and `/autofix` rows), and a saved conversation
 * restoring its context-usage ring and activity cards — the cards written
 * back to the conversation, never for a viewer.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  DONE,
  emit,
  MODELS,
  NOW,
  SEND,
  START,
  type,
} from './fixtures.js'

/** The onboarding tip's dismiss button. */
const TIP_DISMISS = '[data-mol-id="chat-tip-dismiss"]'

/** Opens the composer's slash-command menu, whose rows carry the restored state. */
const OPEN_MENU = type('/')

/**
 * The chat endpoint a mount with a conversation uses: the history URL doubles
 * as the endpoint the context-usage restore reads.
 *
 * @param id - The conversation id.
 * @returns The endpoint.
 */
const CONV_HISTORY = (id: string): string => `/projects/p1/chat?conversationId=${id}`

/**
 * The scripted requests a saved conversation adds, minus its history GET (the
 * case answers that one itself, with the context usage it wants restored).
 *
 * @param id - The conversation id.
 * @returns The requests.
 */
const convRest = (id: string): HttpScript[] =>
  CONV_HTTP(id).filter((entry) => !entry.url.startsWith('/projects/p1/chat?'))

/** A context-usage sample the restore returns: halfway to the compaction target. */
const USAGE = {
  requestId: 'r1',
  at: '2023-11-14T22:12:00.000Z',
  inputTokens: 5_000,
  contextWindow: 100_000,
  backgroundCompactAtTokens: 10_000,
}

/** One captured email, as the conversation's activity-card store holds it. */
const ACTIVITY_ENTRY = {
  id: 'act-1',
  activity: {
    id: 'act-1',
    type: 'email',
    status: 'captured',
    recipient: 'ada@example.test',
    summary: 'Welcome',
    timestamp: '2023-11-14T22:12:30.000Z',
  },
  timestamp: NOW - 60_000,
}

/** The activity event a turn plays to capture an outbound webhook call. */
const ACTIVITY_EVENT = {
  type: 'activity',
  activity: {
    id: 'act-2',
    type: 'webhook',
    status: 'captured',
    recipient: 'ops@example.test',
    summary: 'Deploy done',
    timestamp: '2023-11-14T22:12:40.000Z',
  },
}

/** The conversation's activity-card requests: the restored card read, then its write-back. */
const ACTIVITY_HTTP = (id: string): HttpScript[] => [
  {
    method: 'GET',
    url: `/projects/p1/conversations/${id}/activity-cards`,
    data: { activityCards: [ACTIVITY_ENTRY] },
  },
  ...convRest(id),
]

/** Mount and baseline loads. */
export const mountCases: FeatureCase[] = [
  base('mount: an empty conversation'),

  // ── The empty-state hint and what gates it ─────────────────────────────────
  base('mount: dismissing the onboarding tip reveals the empty-state hint', [click(TIP_DISMISS)]),
  base('mount: a sandbox-boot wait hides the empty-state hint', [click(TIP_DISMISS)], {
    props: { awaitingSandboxBoot: true },
  }),
  base('mount: a transcript-only viewer starts with an empty timeline', [], {
    props: { canEdit: false, canSendTeamMessages: false },
  }),
  base('mount: a host-gated share capability hides the share button', [], {
    props: { canShare: false },
  }),
  {
    ...base('mount: a phone-width viewport caps the command menu', [OPEN_MENU]),
    viewportWidth: 390,
  },
  {
    ...base('mount: a coarse pointer grows the composer touch targets'),
    pointer: 'coarse',
  },
  base('mount: the last conversation restores from the panel storage', [], {
    context: { window: { localStorage: { 'mol-chat-conv:p1': 'c1' } } },
    http: [{ method: 'GET', url: CONV_HISTORY('c1'), data: { contextUsage: USAGE } }],
  }),

  // ── The model catalog and the saved project settings ───────────────────────
  base('mount: the catalog default labels the /model row', [OPEN_MENU]),
  base(
    'mount: the /model row stays unlabeled until the catalog answers',
    [OPEN_MENU, { type: 'http', method: 'GET', url: '/ai/models?projectId=p1', data: MODELS }],
    { http: [{ method: 'GET', url: '/ai/models?projectId=p1', data: MODELS, defer: true }] },
  ),
  base('mount: a saved model restores from the project settings', [OPEN_MENU], {
    // A paid model: the free-tier clamp would reject it and keep the catalog default.
    props: { isPro: true },
    http: [{ method: 'GET', url: '/projects/p1', data: { settings: { chatModel: 'm-pro' } } }],
  }),
  base('mount: persisted loop and auto-fix settings restore', [OPEN_MENU], {
    http: [
      {
        method: 'GET',
        url: '/projects/p1',
        data: { settings: { maxToolLoops: 7, autoFix: false } },
      },
    ],
  }),

  // ── The context-usage ring a saved conversation restores ───────────────────
  base('mount: a saved conversation restores its context-usage ring', [], {
    props: { conversationId: 'c1' },
    http: [
      { method: 'GET', url: CONV_HISTORY('c1'), data: { contextUsage: USAGE } },
      ...convRest('c1'),
    ],
  }),
  base('mount: a conversation with no saved usage starts with no ring', [], {
    props: { conversationId: 'c1' },
    http: [{ method: 'GET', url: CONV_HISTORY('c1'), data: {} }, ...convRest('c1')],
  }),
  base('mount: a failed context-usage restore retries and then shows the ring', [adv(4_000)], {
    props: { conversationId: 'c1' },
    http: [
      { method: 'GET', url: CONV_HISTORY('c1'), status: 500 },
      { method: 'GET', url: CONV_HISTORY('c1'), data: { contextUsage: USAGE } },
      ...convRest('c1'),
    ],
  }),
  base(
    'mount: the context-usage restore gives up after its retry budget',
    [adv(4_000), adv(8_000), adv(12_000), adv(15_000)],
    {
      props: { conversationId: 'c1' },
      http: [
        { method: 'GET', url: CONV_HISTORY('c1'), status: 500 },
        { method: 'GET', url: CONV_HISTORY('c1'), status: 500 },
        { method: 'GET', url: CONV_HISTORY('c1'), status: 500 },
        { method: 'GET', url: CONV_HISTORY('c1'), status: 500 },
        ...convRest('c1'),
      ],
    },
  ),

  // ── The activity cards a saved conversation restores ───────────────────────
  base('mount: saved activity cards reappear on the restored conversation', [], {
    props: { conversationId: 'c1' },
    http: ACTIVITY_HTTP('c1'),
  }),
  base("mount: a viewer's restored activity cards are not written back", [], {
    props: { conversationId: 'c1', canEdit: false },
    http: ACTIVITY_HTTP('c1'),
  }),
  base(
    'mount: a failed activity-card restore still persists a newly captured card',
    [type('Go'), click(SEND), emit(START('a1')), emit(ACTIVITY_EVENT), adv(50), emit(DONE)],
    {
      props: { conversationId: 'c1' },
      http: [
        { method: 'GET', url: `/projects/p1/conversations/c1/activity-cards`, status: 500 },
        ...convRest('c1'),
      ],
    },
  ),
]
