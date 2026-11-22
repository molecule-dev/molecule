/**
 * `ChatPanel` cases: the auto-tip cards. Every case name starts with `tips: `.
 *
 * The three tips the timeline can surface, and the rule that gates each one.
 * The entry tip a fresh conversation opens with (and what suppresses it: a
 * resumed conversation, discovery), the gold viewer orientation tip for a
 * read-only member (once per mount, held back while discovery runs,
 * dismissable), and the idle rotation that may add another tip after a quiet
 * spell — the minimum-transcript floor, the idle wait, the random roll, the
 * reset on any message activity, the cooldown between tips, the never-repeat
 * memory, and the holds while a turn streams or discovery runs. Both entry and
 * viewer tips translate AT RENDER, so a locale switch re-translates a queued
 * tip. A conversation switch clears the cards and forgets what was shown (and
 * re-arms the viewer's `/teamsay ` prefill), while the server assigning the
 * open conversation its id is not a switch and keeps the entry tip.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'
import { TIP_IDLE_MS } from '@molecule/app-ide-panel-logic/panels'

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
  NOW,
  props,
  SEND,
  START,
  TEXT,
  type,
} from './fixtures.js'

/** The dismiss mark on every tip card. */
const TIP_DISMISS = '[data-mol-id="chat-tip-dismiss"]'

/**
 * One restored message at the case clock, as the chat fake's history seed holds it.
 *
 * @param id - The message id.
 * @param role - Its role.
 * @param content - Its text.
 * @returns The message.
 */
const msg = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
  timestamp: NOW - 1_000,
})

/** One full exchange — the smallest transcript the idle rotation accepts. */
const EXCHANGE: ChatMessage[] = [
  msg('u1', 'user', 'Set up the project'),
  msg('a1', 'assistant', 'Done — the scaffold is in place.'),
]

/** A transcript below the idle floor: one message, no reply yet. */
const ONE_MESSAGE: ChatMessage[] = [msg('u1', 'user', 'Set up the project')]

/** A random roll below the idle gate's 70% probability, so the tip surfaces. */
const ROLL_PASS = 0.1

/** A random roll the idle gate declines. */
const ROLL_DECLINE = 0.99

/**
 * One quick turn: sends `text` and completes the reply, so the messages change
 * and the idle clock re-arms (the 50 ms flush included).
 *
 * @param text - The message to send.
 * @param id - The assistant message id.
 * @returns The steps.
 */
const turn = (text: string, id: string): Interaction[] => [
  type(text),
  click(SEND),
  emit(START(id)),
  adv(50),
  emit(DONE),
  finish,
]

/**
 * What a locale-switch case adds: a French sentence for one tip's key, so the
 * switch provably renders through that key (and re-interpolates `{{agentName}}`).
 *
 * @param key - The tip's last key segment (`getStarted`, `viewerTeamOnly`).
 * @param sentence - The French sentence.
 * @returns The extra context.
 */
const frenchTip = (key: string, sentence: string): BaseExtra => ({
  context: { translations: { fr: { ide: { chat: { tip: { [key]: sentence } } } } } },
})

/** Entry, viewer and idle tips, and everything that gates them. */
export const tipsCases: FeatureCase[] = [
  // ── The entry tip ───────────────────────────────────────────────────────────
  base('tips: a fresh conversation opens with the onboarding entry tip', [], {
    props: { agentName: 'Synthase' },
  }),
  base('tips: a resumed conversation shows no entry tip', [], {
    props: { conversationId: 'c1' },
    http: [...CONV_HTTP('c1')],
  }),
  // Discovery reaches the panel as `hideConversationMenu` (ChatPanel wires
  // ChatInner's `discovery` from it), so that prop is what the cases flip.
  base(
    'tips: ending discovery opens with the entry tip',
    [props({ hideConversationMenu: false })],
    {
      props: { hideConversationMenu: true },
    },
  ),

  // ── The viewer orientation tip ──────────────────────────────────────────────
  base('tips: a read-only viewer sees the gold team-only orientation tip', [], {
    props: { canEdit: false },
  }),
  base('tips: an editor never sees the viewer tip', [], { props: { canEdit: true } }),
  base(
    'tips: ending discovery surfaces the viewer tip on a read-only panel',
    [props({ hideConversationMenu: false })],
    {
      props: { canEdit: false, hideConversationMenu: true },
      context: { areas: { chat: { history: [EXCHANGE] } } },
    },
  ),
  base('tips: dismissing the viewer tip removes it', [click(TIP_DISMISS)], {
    props: { conversationId: 'c1', canEdit: false },
    http: [...CONV_HTTP('c1')],
  }),
  base(
    'tips: the viewer tip shows once per mount even as access flips back',
    [props({ canEdit: true }), props({ canEdit: false })],
    {
      props: { canEdit: false },
    },
  ),

  // ── Tips translate at render ────────────────────────────────────────────────
  base('tips: the entry tip re-translates on a locale switch', [{ type: 'locale', locale: 'fr' }], {
    props: { agentName: 'Synthase' },
    ...frenchTip(
      'getStarted',
      'Astuce : tapez / pour voir chaque commande, ou @ un fichier pour donner un point de départ à {{agentName}}.',
    ),
  }),
  base(
    'tips: the viewer tip re-translates on a locale switch',
    [{ type: 'locale', locale: 'fr' }],
    {
      props: { canEdit: false, agentName: 'Synthase' },
      ...frenchTip(
        'viewerTeamOnly',
        'Accès lecture seule — lisez et /teamsay l’équipe. Cette icône dorée marque les messages d’équipe ({{agentName}} les ignore).',
      ),
    },
  ),

  // ── A shown tip never reappears ─────────────────────────────────────────────
  base('tips: a dismissed entry tip never comes back', [
    click(TIP_DISMISS),
    ...turn('Now add a quiz timer', 'a1'),
  ]),
  // The panel mounting again (a reopened IDE pane) starts its own tip memory over; the chat
  // store keeps the conversation, and a conversation with messages is no fresh start.
  base('tips: a remounted fresh conversation that already has messages shows no entry tip', [
    ...turn('Now add a quiz timer', 'a1'),
    { type: 'remount' },
  ]),
  base('tips: a remounted empty conversation shows the entry tip again', [
    click(TIP_DISMISS),
    { type: 'remount' },
  ]),

  // ── The idle rotation ───────────────────────────────────────────────────────
  {
    ...base(
      'tips: a quiet conversation surfaces an idle tip after the idle wait',
      [adv(TIP_IDLE_MS)],
      {
        context: { areas: { chat: { history: [EXCHANGE] } } },
      },
    ),
    random: [ROLL_PASS],
  },
  {
    ...base('tips: an idle tip waits for a real back-and-forth', [adv(TIP_IDLE_MS)], {
      context: { areas: { chat: { history: [ONE_MESSAGE] } } },
    }),
    random: [ROLL_PASS],
  },
  {
    ...base('tips: the idle roll can decline a tip', [adv(TIP_IDLE_MS)], {
      context: { areas: { chat: { history: [EXCHANGE] } } },
    }),
    random: [ROLL_DECLINE],
  },
  {
    ...base(
      'tips: a streaming turn postpones the idle tip',
      [
        type('Do the thing'),
        click(SEND),
        emit(START('r1')),
        emit(TEXT('Working on it.')),
        adv(50),
        adv(TIP_IDLE_MS),
      ],
      {
        context: { areas: { chat: { history: [EXCHANGE] } } },
      },
    ),
    random: [ROLL_PASS],
  },
  {
    ...base(
      'tips: message activity resets the idle clock',
      [adv(30_000), ...turn('Now add tests', 'r1'), adv(30_000), adv(20_000)],
      {
        context: { areas: { chat: { history: [EXCHANGE] } } },
      },
    ),
    random: [ROLL_PASS],
  },
  {
    ...base(
      'tips: a second idle tip waits out the cooldown and skips the one already shown',
      [
        adv(TIP_IDLE_MS),
        ...turn('Split the work', 'r1'),
        adv(TIP_IDLE_MS),
        adv(105_000),
        ...turn('Now the README', 'r2'),
        adv(TIP_IDLE_MS),
      ],
      {
        context: { areas: { chat: { history: [EXCHANGE] } } },
      },
    ),
    random: [ROLL_PASS],
  },
  {
    ...base('tips: a read-only public transcript never surfaces idle tips', [adv(TIP_IDLE_MS)], {
      props: { canEdit: false, canSendTeamMessages: false },
      context: { areas: { chat: { history: [EXCHANGE] } } },
    }),
    random: [ROLL_PASS],
  },
  {
    ...base(
      'tips: discovery holds idle tips back until it ends',
      [adv(TIP_IDLE_MS), props({ hideConversationMenu: false }), adv(TIP_IDLE_MS)],
      {
        props: { hideConversationMenu: true },
        context: { areas: { chat: { history: [EXCHANGE] } } },
      },
    ),
    random: [ROLL_PASS],
  },

  // ── Conversation switches ───────────────────────────────────────────────────
  base('tips: switching conversations clears the tips', [props({ conversationId: 'c2' })], {
    props: { conversationId: 'c1', canEdit: false },
    http: [...CONV_HTTP('c1'), ...CONV_HTTP('c2')],
  }),
  base(
    'tips: the entry tip survives the server assigning the conversation id',
    [
      type('Build it'),
      click(SEND),
      emit(START('a1')),
      emit({ type: 'conversation', id: 'c-live' }),
      emit(TEXT('On it — building the pages now.')),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      http: [...CONV_HTTP('c-live')],
    },
  ),
  {
    ...base(
      'tips: a conversation switch resets the idle-tip memory',
      [adv(TIP_IDLE_MS), props({ conversationId: 'c2' }), ...turn('Go on', 'r1'), adv(TIP_IDLE_MS)],
      {
        props: { conversationId: 'c1' },
        context: { areas: { chat: { history: [EXCHANGE] } } },
        http: [...CONV_HTTP('c1'), ...CONV_HTTP('c2')],
      },
    ),
    random: [ROLL_PASS],
  },
  base(
    'tips: switching conversations re-arms the viewer team prefill',
    [type(''), props({ conversationId: 'c2' })],
    {
      props: { conversationId: 'c1', canEdit: false },
      http: [...CONV_HTTP('c1'), ...CONV_HTTP('c2')],
    },
  ),
]
