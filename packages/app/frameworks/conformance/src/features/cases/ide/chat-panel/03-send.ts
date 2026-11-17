/**
 * `ChatPanel` cases: Sending and the stream lifecycle. Every case name starts with `send: `.
 *
 * The plain send a user drives — typing, Enter, the send button, the guards on an
 * empty or whitespace-only composer — and the stream a turn lives through:
 * `message_start` opening the reply, text / tool / diff events filling it on the
 * 50 ms flush, `done` ending it, a rejected request or a terminal `error` event
 * surfacing the error banner (plain, resource-limit, and the stale signup one),
 * a Stop keeping what streamed, the host callbacks a turn fires, and the two
 * sends that bypass the turn — a team note on the side channel and an ask_user
 * answer that folds into the card instead of echoing a bubble.
 *
 * @module
 */

import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  DIFF,
  DONE,
  emit,
  fail,
  finish,
  key,
  props,
  SEND,
  sideEmit,
  sideFinish,
  START,
  STOP,
  TEAM_COMMAND,
  TEXT,
  TOOL,
  type,
} from './fixtures.js'

/** The assistant reply every streaming case plays: one message, two text deltas. */
const REPLY = [emit(START('a1')), emit(TEXT('Hel')), adv(50), emit(TEXT('lo there.')), adv(50)]

/** Sending and the stream lifecycle. */
export const sendCases: FeatureCase[] = [
  // ── The plain send ─────────────────────────────────────────────────────────
  base('send: clicking send delivers the typed text and clears the composer', [
    type('Build a todo app'),
    click(SEND),
  ]),
  base('send: an empty composer cannot send', [click(SEND), key('Enter')]),
  base('send: a whitespace-only message sends nothing and keeps the draft', [
    type('   '),
    click(SEND),
  ]),
  base('send: Enter sends but Shift+Enter keeps the draft', [
    type('First message'),
    key('Enter'),
    type('Second draft'),
    key('Enter', { shiftKey: true }),
  ]),
  base('send: surrounding whitespace is trimmed from the sent text', [
    type('  build the thing  '),
    click(SEND),
  ]),

  // ── The stream lifecycle ───────────────────────────────────────────────────
  base('send: the reply streams in through message_start, text and done', [
    type('Say hello'),
    click(SEND),
    ...REPLY,
    emit(DONE),
    finish,
  ]),
  base('send: tool calls, results and file diffs land in the timeline mid-turn', [
    type('Write the config'),
    click(SEND),
    emit(START('a1')),
    emit(TOOL('t1', 'write_file', { path: '/workspace/src/app.ts', content: 'export {}' })),
    adv(50),
    emit({ type: 'tool_result', id: 't1', output: 'wrote 12 bytes' }),
    adv(50),
    emit(DIFF('/workspace/src/app.ts', '', 'export {}')),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('send: stopping the turn keeps what streamed and re-enables sending', [
    type('Long task'),
    click(SEND),
    emit(START('a1')),
    emit(TEXT('Partial answer')),
    adv(50),
    click(STOP),
  ]),
  base(
    'send: the host hears loading start and stop',
    [type('Go'), click(SEND), ...REPLY, emit(DONE), finish],
    { props: { onLoadingChange: { $callback: 'onLoadingChange' } } },
  ),

  // ── The error paths ────────────────────────────────────────────────────────
  base('send: a failed send shows the error banner', [
    type('Do it'),
    click(SEND),
    fail('The provider refused the request'),
  ]),
  base('send: a terminal stream error surfaces its message and keeps the partial reply', [
    type('Do it'),
    click(SEND),
    emit(START('a1')),
    emit(TEXT('Half an answer')),
    adv(50),
    emit({ type: 'error', message: 'The model refused this request', status: 400 }),
    finish,
  ]),
  base("send: a limit error renders the upgrade banner with the backend's remedy", [
    type('Go'),
    click(SEND),
    emit(START('a1')),
    emit({
      type: 'error',
      message: 'You are out of AI credits.',
      limitType: 'credits',
      billingAction: 'add_funds',
      upgradeTier: null,
    }),
    finish,
  ]),
  base('send: a signup-required banner hides once the host says the user signed in', [
    type('Go'),
    click(SEND),
    emit(START('a1')),
    emit({
      type: 'error',
      message: 'Sign up to keep building.',
      limitType: 'signup',
      requiresSignup: true,
    }),
    finish,
    props({ isAnonymous: false }),
  ]),
  base("send: a new send clears the previous turn's error", [
    type('First try'),
    click(SEND),
    fail('The provider refused the request'),
    type('Second try'),
    click(SEND),
  ]),
  base('send: a second message sends and streams after the first turn completes', [
    type('First message'),
    click(SEND),
    ...REPLY,
    emit(DONE),
    finish,
    type('Second message'),
    click(SEND),
    emit(START('a2')),
    emit(TEXT('On it again.')),
    adv(50),
    emit(DONE),
    finish,
  ]),

  // ── The sends that bypass a turn ───────────────────────────────────────────
  base(
    'send: a team note goes out on the side channel mid-turn',
    [
      type('Start the build'),
      click(SEND),
      emit(START('a1')),
      emit(TEXT('Building it now')),
      adv(50),
      type('/teamsay looking good'),
      click(SEND),
      sideEmit({
        type: 'message',
        message: { id: 'n1', role: 'user', content: '/teamsay looking good', timestamp: 0 },
      }),
      sideFinish,
      emit(DONE),
      finish,
    ],
    {
      props: { extraCommands: [TEAM_COMMAND] },
      context: { areas: { chat: { sideChannel: true } } },
    },
  ),
  base(
    'send: answering an ask_user card delivers the answer when the turn closes, without echoing a bubble',
    [
      type('Set it up'),
      click(SEND),
      emit(START('a1')),
      emit(
        TOOL('t1', 'ask_user', {
          question: 'Which starting point do you want?',
          options: [{ label: 'Blank template' }, { label: 'Recipe box sample' }],
        }),
      ),
      emit({ type: 'tool_result', id: 't1', output: { status: 'awaiting_response' } }),
      adv(50),
      click('[data-mol-id="ask-user-option-0"]'),
      emit(DONE),
      finish,
      emit(DONE),
      finish,
    ],
  ),
]
