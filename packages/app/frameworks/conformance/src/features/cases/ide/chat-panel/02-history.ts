/**
 * `ChatPanel` cases: Conversation header and history dropdown. Every case name starts with
 * `history: `.
 *
 * The header's title (the open conversation's preview, else `Chat history`), the history
 * dropdown (its list with ages, the open refetch, the search filter and its empty state, the
 * `New conversation` row fallback), selecting a conversation and starting a new one (both
 * remounts, the persistence and the failed-create fallback), the server-assigned conversation
 * id kept without a remount, the host-owned variant, the header's viewer / hidden / headless
 * states, the saved conversation restoring on mount (plain, under a waiting draft, a discovery
 * turn that is only an answered question, and the failed load), and the message-history
 * window: only the latest page mounts, scrolling near the top mounts the next one anchored, a
 * scroll away from the top holds it back, a mount lands at the latest message and a new reply
 * keeps the view pinned there.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  CONV_ROW,
  CONV_SEARCH,
  DONE,
  down,
  emit,
  finish,
  HDR_TOGGLE,
  LOG,
  NEW_CHAT,
  NOW,
  SEND,
  START,
  TA,
  TEXT,
  type,
} from './fixtures.js'

/**
 * One conversation row in the server's list (`minutesAgo` ages its row: `5m ago`, `1h ago`,
 * `1d ago`).
 *
 * @param id - The conversation id.
 * @param preview - Its preview text, or null (a conversation that never got a prompt).
 * @param minutesAgo - How long ago it was last updated.
 * @returns The summary row.
 */
const conv = (id: string, preview: string | null, minutesAgo = 5): Record<string, unknown> => ({
  id,
  createdAt: new Date(NOW - (minutesAgo + 60) * 60_000).toISOString(),
  updatedAt: new Date(NOW - minutesAgo * 60_000).toISOString(),
  preview,
})

/**
 * The conversations answer the header reads (on mount and again on each dropdown open).
 *
 * @param rows - The listed conversations.
 * @returns The scripted answer.
 */
const CONVERSATIONS = (...rows: Record<string, unknown>[]): HttpScript => ({
  method: 'GET',
  url: '/projects/p1/conversations',
  data: { conversations: rows },
})

/**
 * The POST that creates a conversation and assigns it an id.
 *
 * @param id - The id the server assigns.
 * @returns The scripted answer.
 */
const CREATE_CONVERSATION = (id: string): HttpScript => ({
  method: 'POST',
  url: '/projects/p1/conversations',
  data: { id },
})

/**
 * The reads a fresh `ChatInner` makes again on the switch remounts (selecting a conversation,
 * new chat): the project settings load whose failure would warn, the git status and the files
 * list. The baseline answers each once for the first mount only.
 *
 * @returns The scripted answers.
 */
const REMOUNT_READS = (): HttpScript[] => [
  { method: 'GET', url: '/projects/p1', data: { settings: {} } },
  { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } },
  { method: 'GET', url: '/projects/p1/files-list', data: { files: [] } },
]

/**
 * One restored message at the case clock.
 *
 * @param id - The message id.
 * @param role - Its role.
 * @param content - Its text.
 * @param minutesAgo - How long ago it was sent.
 * @returns The message.
 */
const msg = (
  id: string,
  role: ChatMessage['role'],
  content: string,
  minutesAgo = 1,
): ChatMessage => ({ id, role, content, timestamp: NOW - minutesAgo * 60_000 })

/**
 * A transcript of `count` alternating user / assistant messages long enough to page
 * (`History message 0` is the oldest).
 *
 * @param count - How many messages.
 * @returns The transcript.
 */
const longHistory = (count: number): ChatMessage[] =>
  Array.from({ length: count }, (_, i) =>
    msg(`h${i}`, i % 2 ? 'assistant' : 'user', `History message ${i}`, count - i),
  )

/** The conversation a mount resumes (`mol-chat-conv:p1` in the case's localStorage). */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** The empty storage a case seeds so the panel's own writes are recorded. */
const EMPTY_STORAGE = {}

/** The message log's layout for the paging cases: 120px per mounted item, an 800px pane. */
const PAGED_LOG = [{ selector: LOG, childHeight: 120, clientHeight: 800, scrollTop: 0 }]

/**
 * The message log's layout for the load-earlier cases: the pane is at least as tall as its
 * content, so the viewport sits at the top (scrollTop clamps to 0) the way a short
 * conversation in a tall pane does.
 */
const TOP_LOG = [{ selector: LOG, childHeight: 24, clientHeight: 2000, scrollTop: 0 }]

/** A saved conversation: the opening prompt and the reply. */
const SAVED_HISTORY: ChatMessage[] = [
  msg('u1', 'user', 'An e-learning platform with quizzes and certificates', 3),
  msg('a1', 'assistant', 'Saved the plan — building it now.', 2),
]

/** A discovery turn whose only block is a resolved ask_user tool call (empty text content). */
const ASK_HISTORY: ChatMessage[] = [
  msg('u1', 'user', 'An e-learning platform with quizzes and certificates', 3),
  {
    id: 'a-ask',
    role: 'assistant',
    content: '',
    timestamp: NOW - 2_000,
    blocks: [{ type: 'tool_call', id: 'tc-ask' }],
    toolCalls: [
      {
        id: 'tc-ask',
        name: 'ask_user',
        input: { question: 'What quiz question types do you need?' },
        output: 'Multiple choice + true/false',
        status: 'done',
      },
    ],
  },
  msg('a2', 'assistant', 'Building the quiz module now.', 1),
]

/** A send whose turn is live, for the server-assigned conversation id cases. */
const LIVE_TURN = [type('Build it'), click(SEND), emit(START('a1'))]

/**
 * A {@link base} case with the UI fields the shared baseline helper does not carry: a layout
 * stub or a viewport width.
 *
 * @param name - The case name.
 * @param interactions - Its steps.
 * @param extra - What this case adds or replaces over the baseline.
 * @param ui - The extra UI fields, spread over the built case.
 * @returns The case.
 */
const over = (
  name: string,
  interactions: Interaction[],
  extra: BaseExtra,
  ui: Pick<FeatureCase, 'layout' | 'viewportWidth'>,
): FeatureCase => ({ ...base(name, interactions, extra), ...ui })

/** Conversation header and history dropdown. */
export const historyCases: FeatureCase[] = [
  // ── The header title ───────────────────────────────────────────────────────
  base('history: the header titles itself after the open conversation', [], {
    context: { window: { localStorage: SAVED_CONV } },
    http: [CONVERSATIONS(conv('c1', 'Build a todo app')), ...CONV_HTTP('c1')],
  }),

  // ── The dropdown ───────────────────────────────────────────────────────────
  base(
    'history: opening the dropdown lists the saved conversations with their ages',
    [click(HDR_TOGGLE)],
    {
      http: [
        CONVERSATIONS(
          conv('c1', 'Build a todo app'),
          conv('c2', 'Fix the login bug', 90),
          conv('c3', 'Add a settings page', 1500),
        ),
        CONVERSATIONS(
          conv('c1', 'Build a todo app'),
          conv('c2', 'Fix the login bug', 90),
          conv('c3', 'Add a settings page', 1500),
        ),
      ],
    },
  ),
  base('history: opening the dropdown refetches the conversation list', [click(HDR_TOGGLE)], {
    http: [
      CONVERSATIONS(conv('c1', 'Build a todo app')),
      CONVERSATIONS(conv('c1', 'Build a todo app'), conv('c2', 'Fix the login bug')),
    ],
  }),
  base(
    'history: the header toggle closes the dropdown again',
    [click(HDR_TOGGLE), click(HDR_TOGGLE)],
    {
      http: [
        CONVERSATIONS(conv('c1', 'Build a todo app')),
        CONVERSATIONS(conv('c1', 'Build a todo app')),
      ],
    },
  ),
  base('history: clicking outside closes the dropdown', [click(HDR_TOGGLE), down(TA)], {
    http: [
      CONVERSATIONS(conv('c1', 'Build a todo app')),
      CONVERSATIONS(conv('c1', 'Build a todo app')),
    ],
  }),
  base(
    'history: hovering the header title and a row shows their hover affordance',
    [
      click(HDR_TOGGLE),
      { type: 'mouseenter', selector: HDR_TOGGLE },
      { type: 'mouseenter', selector: CONV_ROW('c1') },
    ],
    {
      http: [
        CONVERSATIONS(conv('c1', 'Build a todo app')),
        CONVERSATIONS(conv('c1', 'Build a todo app')),
      ],
    },
  ),
  base(
    'history: searching filters the dropdown to the matching conversations',
    [click(HDR_TOGGLE), { type: 'input', selector: CONV_SEARCH, value: 'todo' }],
    {
      http: [
        CONVERSATIONS(
          conv('c1', 'Build a todo app'),
          conv('c2', 'Fix the login bug'),
          conv('c3', 'Review the todo store'),
        ),
        CONVERSATIONS(
          conv('c1', 'Build a todo app'),
          conv('c2', 'Fix the login bug'),
          conv('c3', 'Review the todo store'),
        ),
      ],
    },
  ),
  base(
    'history: a search that matches nothing shows No conversations yet',
    [click(HDR_TOGGLE), { type: 'input', selector: CONV_SEARCH, value: 'zzz' }],
    {
      http: [
        CONVERSATIONS(conv('c1', 'Build a todo app')),
        CONVERSATIONS(conv('c1', 'Build a todo app')),
      ],
    },
  ),
  base('history: a project with no conversations shows No conversations yet', [click(HDR_TOGGLE)], {
    http: [CONVERSATIONS(), CONVERSATIONS()],
  }),
  base('history: a row with no preview shows New conversation', [click(HDR_TOGGLE)], {
    http: [CONVERSATIONS(conv('c1', null)), CONVERSATIONS(conv('c1', null))],
  }),
  over(
    'history: on a narrow screen the search grows and the dropdown caps its height',
    [click(HDR_TOGGLE)],
    {
      http: [
        CONVERSATIONS(conv('c1', 'Build a todo app')),
        CONVERSATIONS(conv('c1', 'Build a todo app')),
      ],
    },
    { viewportWidth: 390 },
  ),

  // ── Switching and starting conversations ───────────────────────────────────
  base(
    'history: selecting a conversation opens it and remembers it',
    [click(HDR_TOGGLE), click(CONV_ROW('c2'))],
    {
      context: { window: { localStorage: EMPTY_STORAGE } },
      http: [
        CONVERSATIONS(conv('c1', 'Build a todo app'), conv('c2', 'Fix the login bug')),
        CONVERSATIONS(conv('c1', 'Build a todo app'), conv('c2', 'Fix the login bug')),
        ...REMOUNT_READS(),
        ...CONV_HTTP('c2'),
      ],
    },
  ),
  base('history: the new-chat button starts a fresh conversation', [click(NEW_CHAT)], {
    context: { window: { localStorage: SAVED_CONV } },
    http: [
      CONVERSATIONS(conv('c1', 'Build a todo app')),
      CREATE_CONVERSATION('c-new'),
      ...REMOUNT_READS(),
      ...CONV_HTTP('c1'),
      ...CONV_HTTP('c-new'),
    ],
  }),
  base('history: a failed new-chat falls back to a local conversation', [click(NEW_CHAT)], {
    context: { window: { localStorage: SAVED_CONV } },
    http: [
      CONVERSATIONS(conv('c1', 'Build a todo app')),
      { method: 'POST', url: '/projects/p1/conversations', status: 500 },
      ...REMOUNT_READS(),
      ...CONV_HTTP('c1'),
    ],
  }),
  base(
    'history: a server-assigned conversation id is kept without a remount',
    [
      { type: 'mark', selector: LOG },
      ...LIVE_TURN,
      emit({ type: 'conversation', id: 'c-live' }),
      emit(TEXT('On it — building the pages now.')),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      context: { window: { localStorage: EMPTY_STORAGE } },
      http: [...CONV_HTTP('c-live')],
    },
  ),
  base(
    'history: a host-owned conversation id hears about a server-assigned one',
    [
      ...LIVE_TURN,
      emit({ type: 'conversation', id: 'c-live' }),
      emit(TEXT('On it.')),
      adv(50),
      emit(DONE),
      finish,
    ],
    {
      props: { conversationId: 'c9', onConversationId: { $callback: 'onConversationId' } },
      context: { window: { localStorage: EMPTY_STORAGE } },
      http: [CONVERSATIONS(conv('c9', 'Deploy preview')), ...CONV_HTTP('c9')],
    },
  ),

  // ── The header's other states ──────────────────────────────────────────────
  base('history: a viewer gets no new-chat button', [], { props: { canEdit: false } }),
  base('history: hiding the conversation menu removes the header', [], {
    props: { hideConversationMenu: true },
  }),
  base('history: a headless panel fetches no conversation list', [], {
    props: { renderConversationHeader: false },
  }),

  // ── Restoring the saved conversation ───────────────────────────────────────
  base('history: a saved conversation restores on mount', [], {
    context: { areas: { chat: { history: [SAVED_HISTORY] } } },
  }),
  base('history: the saved conversation restores even with a draft waiting', [], {
    props: { initialInputValue: 'Now add a quiz timer' },
    context: { areas: { chat: { history: [SAVED_HISTORY] } } },
  }),
  base('history: a discovery turn that is only an answered question restores', [], {
    context: { areas: { chat: { history: [ASK_HISTORY] } } },
  }),
  base('history: a failed history load leaves the panel empty and logs why', [], {
    context: { areas: { chat: { historyError: 'The saved conversation could not be read' } } },
  }),

  // ── The message-history window ─────────────────────────────────────────────
  base('history: a long conversation mounts only its latest page', [], {
    context: { areas: { chat: { history: [longHistory(70)] } } },
  }),
  over(
    'history: scrolling to the top mounts the next older page',
    [{ type: 'event', selector: LOG, event: 'scroll' }],
    { context: { areas: { chat: { history: [longHistory(70)] } } } },
    { layout: TOP_LOG },
  ),
  over(
    'history: a further top scroll with everything shown loads nothing',
    [
      { type: 'event', selector: LOG, event: 'scroll' },
      { type: 'event', selector: LOG, event: 'scroll' },
    ],
    { context: { areas: { chat: { history: [longHistory(70)] } } } },
    { layout: TOP_LOG },
  ),
  over(
    'history: a scroll away from the top holds the older pages back',
    [adv(500), { type: 'event', selector: LOG, event: 'scroll' }],
    { context: { areas: { chat: { history: [longHistory(65)] } } } },
    { layout: PAGED_LOG },
  ),
  over(
    'history: a conversation that mounts with history lands at its latest message',
    [adv(500)],
    {
      context: { areas: { chat: { history: [longHistory(12)] } } },
    },
    { layout: PAGED_LOG },
  ),
  over(
    'history: a new reply keeps the view pinned to the latest message',
    [
      adv(500),
      type('Now add certificates'),
      click(SEND),
      emit(START('a-new')),
      emit(TEXT('Adding the certificate module.')),
      adv(50),
      adv(80),
      emit(DONE),
      finish,
    ],
    { context: { areas: { chat: { history: [longHistory(12)] } } } },
    { layout: PAGED_LOG },
  ),
  over(
    'history: dragging up from the latest message stops the auto-scroll, and back down resumes it',
    [
      adv(500),
      // More than 80px above the bottom: a reply that streams in now leaves the view where it is.
      { type: 'scroll', selector: LOG, top: 0 },
      type('Now add certificates'),
      click(SEND),
      emit(START('a-new')),
      emit(TEXT('Adding the certificate module.')),
      adv(50),
      adv(80),
      emit(DONE),
      finish,
      // Back at the bottom (the offset clamps): the next reply pins the view again.
      { type: 'scroll', selector: LOG, top: 100_000 },
      type('And a badge'),
      click(SEND),
      emit(START('a-next')),
      emit(TEXT('Adding the badge.')),
      adv(50),
      adv(80),
      emit(DONE),
      finish,
    ],
    { context: { areas: { chat: { history: [longHistory(12)] } } } },
    { layout: PAGED_LOG },
  ),
]
