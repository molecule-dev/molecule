/**
 * `ChatPanel` cases: Queued messages. Every case name starts with `queue: `.
 *
 * The anchored bar above the composer that holds messages typed while the agent
 * works: a queue restored from history (waiting) or from the server (resuming
 * its send on mount), queueing mid-turn (durable through the provider's queue
 * or local-only), the bar hiding while a popup is open and hidden driver
 * messages staying out of the timeline, the drain that sends the queue once the
 * turn finishes, a durable row staying put until the server delivers it, the
 * send-now control after a Stop, the server events that accept or drop a queued
 * message, the failure paths that surface the error banner while the row stays
 * queued, and the row's inline editor (edit / save / cancel / delete).
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import { kitUuid } from '../../../../ui/globals.js'
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
  NOW,
  queueAccept,
  SEND,
  START,
  STOP,
  TEXT,
  type,
} from './fixtures.js'

/** A user message the server is holding in its queue (`queued: true`). */
const queuedHistoryMessage = (id: string, content: string): ChatMessage => ({
  id,
  role: 'user',
  content,
  timestamp: NOW + 2,
  queued: true,
})

/**
 * The `areas.chat` seed for a durable provider queue, optionally seeded with the
 * conversation its first `loadHistory` answers (a queued row restored on mount).
 *
 * @param history - The restored conversation.
 * @returns The `extra` argument for {@link base}.
 */
const durable = (history?: ChatMessage[]): BaseExtra => ({
  context: { areas: { chat: { durable: true, ...(history ? { history: [history] } : {}) } } },
})

/**
 * Types into any field (the composer helper targets the composer only).
 *
 * @param selector - The field.
 * @param value - Its new value.
 * @returns The step.
 */
const typeInto = (selector: string, value: string): Interaction => ({
  type: 'input',
  selector,
  value,
})

/**
 * Presses a key on any element (the composer helper targets the composer only).
 *
 * @param selector - The element.
 * @param keyName - The key.
 * @returns The step.
 */
const keyOn = (selector: string, keyName: string): Interaction => ({
  type: 'keydown',
  selector,
  key: keyName,
})

/** A queued message one mid-turn send produces (the third id the case mints: the entry tip's, the first send's, then this one). */
const QUEUED_ROW_ID = kitUuid(2)

/** The queue stream's acceptance: the server's durable copy of the queued message. */
const QUEUE_ACCEPTED = {
  type: 'message',
  message: {
    id: QUEUED_ROW_ID,
    role: 'user',
    content: 'Add a footer too',
    queued: true,
    timestamp: NOW + 3,
  },
}

/** The send stream's delivery: the queued message went out with its own turn. */
const QUEUE_DELIVERED = {
  type: 'message',
  message: {
    id: QUEUED_ROW_ID,
    role: 'user',
    content: 'Add a footer too',
    timestamp: NOW + 4,
  },
}

/** Types and sends the first message, opening turn one with a streamed text delta. */
const FIRST_TURN = [
  type('Build the header'),
  click(SEND),
  emit(START('a1')),
  emit(TEXT('Working on the header')),
  adv(50),
]

/** Queues a second message while turn one streams. */
const QUEUE_SEND = [type('Add a footer too'), click(SEND)]

/** The edit textarea inside the queue bar (the composer's textarea carries `data-mol-chat-input`). */
const EDIT_TEXTAREA = 'textarea:not([data-mol-chat-input])'

/** Queued messages. */
export const queueCases: FeatureCase[] = [
  // ── The bar above the composer ─────────────────────────────────────────────
  base('queue: a message restored from history waits above the composer until it is sent', [], {
    context: { areas: { chat: { history: [[queuedHistoryMessage('q1', 'Add a footer too')]] } } },
  }),
  base(
    'queue: a queue restored from the server resumes sending on mount, its row pinned',
    [],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base('queue: each mid-turn send adds a row and bumps the queued count', [
    ...FIRST_TURN,
    ...QUEUE_SEND,
    ...QUEUE_SEND,
  ]),
  base(
    'queue: the queue bar hides while the command menu is open and returns after',
    [type('/'), type('Add a footer too')],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base('queue: a hidden driver message never reaches the timeline', [], {
    context: {
      areas: {
        chat: {
          history: [
            [
              {
                id: 'kickoff',
                role: 'user',
                content: 'Build the header (driver kickoff)',
                timestamp: NOW + 1,
                hidden: true,
              },
              {
                id: 'note',
                role: 'user',
                content: 'A visible note',
                timestamp: NOW + 2,
              },
            ],
          ],
        },
      },
    },
  }),

  // ── Queueing mid-turn ──────────────────────────────────────────────────────
  base(
    'queue: a send while the agent works queues durably with the server',
    [...FIRST_TURN, ...QUEUE_SEND],
    durable(),
  ),
  base('queue: without a durable queue a mid-turn send still queues locally', [
    ...FIRST_TURN,
    ...QUEUE_SEND,
  ]),

  // ── The drain: the queue sends when the turn finishes ──────────────────────
  base(
    'queue: the queued message sends when the turn finishes and joins the log on delivery',
    [
      ...FIRST_TURN,
      ...QUEUE_SEND,
      emit(QUEUE_ACCEPTED),
      queueAccept,
      emit(DONE),
      finish,
      emit(QUEUE_DELIVERED),
      emit(START('a2')),
      emit(TEXT('Footer next')),
      adv(50),
      emit(DONE),
      finish,
    ],
    durable(),
  ),
  base('queue: without a durable queue the queued message un-queues and sends after the turn', [
    ...FIRST_TURN,
    ...QUEUE_SEND,
    emit(DONE),
    finish,
    emit(START('a2')),
    emit(TEXT('Footer next')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── Stop and the send-now control ──────────────────────────────────────────
  base('queue: a stop keeps the queued message in the bar and offers send-now', [
    ...FIRST_TURN,
    ...QUEUE_SEND,
    click(STOP),
  ]),
  base(
    'queue: clicking send-now sends the queued message at once',
    [
      ...FIRST_TURN,
      ...QUEUE_SEND,
      queueAccept,
      click(STOP),
      click('[title="Send"]:not([data-mol-id])'),
      emit(DONE),
      finish,
    ],
    durable(),
  ),

  // ── Removal and failures ───────────────────────────────────────────────────
  base('queue: a queue_removed event drops the queued row', [
    ...FIRST_TURN,
    ...QUEUE_SEND,
    emit({ type: 'queue_removed', messageId: QUEUED_ROW_ID }),
    emit(DONE),
    finish,
  ]),
  base(
    'queue: a failed queue send shows the error banner and keeps the message queued',
    [
      ...FIRST_TURN,
      ...QUEUE_SEND,
      { type: 'control', name: 'chat.queueFail', args: ['The queue is full'] },
    ],
    durable(),
  ),
  base(
    'queue: an error event on the queue stream shows the banner too',
    [
      ...FIRST_TURN,
      ...QUEUE_SEND,
      {
        type: 'control',
        name: 'chat.queueEmit',
        args: [{ type: 'error', message: 'The queue rejected the message' }],
      },
    ],
    durable(),
  ),

  // ── The inline editor on a queued row ──────────────────────────────────────
  base(
    'queue: clicking edit opens the editor focused on the row text',
    [click('[title="Edit"]')],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base(
    'queue: saving the editor rewrites the queued message through the server',
    [
      click('[title="Edit"]'),
      typeInto(EDIT_TEXTAREA, 'Add a footer and a navbar'),
      click('[data-mol-id="chat-queued-edit-save"]'),
    ],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base(
    'queue: pressing Enter saves the edited queued message',
    [
      click('[title="Edit"]'),
      typeInto(EDIT_TEXTAREA, 'Add a footer and a navbar'),
      keyOn(EDIT_TEXTAREA, 'Enter'),
    ],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base(
    'queue: Escape closes the editor and keeps the queued message',
    [
      click('[title="Edit"]'),
      typeInto(EDIT_TEXTAREA, 'A scratch rewrite'),
      keyOn(EDIT_TEXTAREA, 'Escape'),
    ],
    {
      context: {
        areas: { chat: { history: [[queuedHistoryMessage('q1', 'Add a footer too')]] } },
      },
    },
  ),
  base(
    'queue: cancelling the editor keeps the queued message',
    [
      click('[title="Edit"]'),
      typeInto(EDIT_TEXTAREA, 'A scratch rewrite'),
      click('[data-mol-id="chat-queued-edit-cancel"]'),
    ],
    {
      context: {
        areas: { chat: { history: [[queuedHistoryMessage('q1', 'Add a footer too')]] } },
      },
    },
  ),
  base(
    'queue: saving an emptied editor deletes the queued message',
    [
      click('[title="Edit"]'),
      typeInto(EDIT_TEXTAREA, ''),
      click('[data-mol-id="chat-queued-edit-save"]'),
    ],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
  base(
    'queue: the trash deletes a queued message through the server',
    [click('[title="Delete"]')],
    durable([queuedHistoryMessage('q1', 'Add a footer too')]),
  ),
]
