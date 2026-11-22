/**
 * `ChatPanel` cases: Verification auto-fix countdown. Every case name starts with `auto-fix: `.
 *
 * What happens when a turn's verification comes back with errors: the panel holds a
 * three-second countdown at the bottom of the chat, then sends one fix message itself
 * (`Fix these issues: …`), flagged automatic so it renders as agent-sent, never as a
 * typed user message. The user can pause it (starting to type pauses it too), resume it
 * (which restarts the three seconds) or cancel it; stopping the turn cancels it as
 * well. So does a file change on one of the failed verification's changed paths — the
 * fix is already happening in a newer turn — while a change to any other file leaves it
 * running. Arming is sender-only: a teammate's failed verification, broadcast to this
 * client, never starts one. A clean verification, a verification error without output,
 * and a stream that fails instead of finishing arm nothing. A read-only client drops
 * the countdown at zero instead of sending, and a verification error drops whatever
 * preview-error message was queued mid-turn, so the fix is sent once, not twice.
 *
 * @module
 */

import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  DIFF,
  DONE,
  emit,
  fail,
  finish,
  props,
  SEND,
  START,
  STOP,
  TEXT,
  type,
} from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/** What a failed verification says (the text the auto-fix message carries). */
const VERIFY_OUTPUT = 'src/app.ts(4,11): error TS2304: Cannot find name "quizzer"'

/** A verification that found one type error, in a file the fix would touch. */
const VERIFY_FAIL = {
  type: 'verification_result',
  status: 'error',
  output: VERIFY_OUTPUT,
  workspaces: [],
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

/** A verification that passed. */
const VERIFY_OK = {
  type: 'verification_result',
  status: 'ok',
  workspaces: [],
}

/** The countdown's Pause button. */
const PAUSE = '[data-mol-id="chat-autofix-pause"]'
/** The countdown's Resume button. */
const RESUME = '[data-mol-id="chat-autofix-resume"]'
/** The countdown's Cancel button. */
const CANCEL = '[data-mol-id="chat-autofix-cancel"]'

/**
 * A turn that ends with a failed verification: the send, the reply, the failed
 * verification, and the arming once the turn's `done` lands.
 */
const FAILING_TURN = [...SEND_IT, emit(START('a1')), emit(VERIFY_FAIL), adv(50), emit(DONE), finish]

/** The conversation a mount resumes, so broadcast frames for `c1` are applied. */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** Verification auto-fix countdown. */
export const autoFixCases: FeatureCase[] = [
  // ── Arming and the auto-send ───────────────────────────────────────────────
  base('auto-fix: a failed verification ends the turn into a three-second countdown', FAILING_TURN),
  base('auto-fix: the countdown ticks down one second at a time', [
    ...FAILING_TURN,
    adv(1_000),
    adv(1_000),
  ]),
  base('auto-fix: at zero the countdown sends the fix message automatically', [
    ...FAILING_TURN,
    adv(3_000),
  ]),
  base('auto-fix: a clean verification never arms the countdown', [
    ...SEND_IT,
    emit(START('a1')),
    emit(VERIFY_OK),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('auto-fix: a verification error without output never arms the countdown', [
    ...SEND_IT,
    emit(START('a1')),
    emit({ type: 'verification_result', status: 'error', workspaces: [] }),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('auto-fix: a clean verification after an error cancels the arming', [
    ...SEND_IT,
    emit(START('a1')),
    emit(VERIFY_FAIL),
    adv(50),
    emit(VERIFY_OK),
    adv(50),
    emit(DONE),
    finish,
  ]),
  base('auto-fix: a stream that fails instead of finishing never arms the countdown', [
    ...SEND_IT,
    emit(START('a1')),
    emit(VERIFY_FAIL),
    adv(50),
    fail('The API dropped the turn'),
  ]),

  // ── Pause, resume, cancel ──────────────────────────────────────────────────
  base('auto-fix: pausing the countdown holds it and stops the ticking', [
    ...FAILING_TURN,
    click(PAUSE),
    adv(2_000),
  ]),
  base('auto-fix: resuming restarts the countdown at three seconds', [
    ...FAILING_TURN,
    click(PAUSE),
    click(RESUME),
    adv(2_000),
  ]),
  base('auto-fix: cancelling the countdown sends no fix message', [
    ...FAILING_TURN,
    click(CANCEL),
    adv(5_000),
  ]),
  base('auto-fix: typing in the composer pauses the countdown', [
    ...FAILING_TURN,
    type('Hold on, checking the diff myself'),
  ]),

  // ── The other cancellations ────────────────────────────────────────────────
  base('auto-fix: stopping the turn cancels the countdown', [
    ...SEND_IT,
    emit(START('a1')),
    emit(VERIFY_FAIL),
    adv(50),
    emit(DONE),
    click(STOP),
    adv(5_000),
  ]),
  base(
    'auto-fix: a file change on a changed path cancels the countdown',
    [
      ...FAILING_TURN,
      // The user takes over: typing pauses the countdown, and their send starts the
      // newer turn whose writes then cancel the pending auto-fix for good.
      type('Let me look at the diff first'),
      click(SEND),
      emit(START('a2')),
      emit(DIFF('src/app.ts', 'const x = quizzer', 'const x = quiz')),
      adv(50),
      finish,
      adv(400),
    ],
    {
      // Every file change re-fetches git-status 400 ms later; answer that fetch too.
      http: [
        { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } },
        {
          method: 'GET',
          url: '/projects/p1/git-status',
          data: { files: [{ path: 'src/app.ts', status: 'modified' }] },
        },
      ],
    },
  ),
  base(
    'auto-fix: a file change on another path leaves the countdown running',
    [
      ...FAILING_TURN,
      type('Let me look at the diff first'),
      click(SEND),
      emit(START('a2')),
      emit(DIFF('src/readme.md', '# App', '# App\n\nRewritten.')),
      adv(400),
      finish,
      // The countdown sat paused through the unrelated write; resuming still sends.
      click(RESUME),
      adv(3_000),
    ],
    {
      http: [
        { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } },
        {
          method: 'GET',
          url: '/projects/p1/git-status',
          data: { files: [{ path: 'src/readme.md', status: 'modified' }] },
        },
      ],
    },
  ),

  // ── Who may arm and send ───────────────────────────────────────────────────
  base('auto-fix: a read-only client drops the countdown at zero without sending', [
    ...FAILING_TURN,
    props({ canEdit: false }),
    adv(1_000),
    adv(1_000),
    adv(1_000),
  ]),
  base(
    "auto-fix: a teammate's failed verification never arms this client's countdown",
    [
      { type: 'invoke', callback: 'onRegisterPushHandler', path: [0], args: ['c1', START('tm1')] },
      {
        type: 'invoke',
        callback: 'onRegisterPushHandler',
        path: [0],
        args: ['c1', TEXT('Checking the build now.')],
      },
      { type: 'invoke', callback: 'onRegisterPushHandler', path: [0], args: ['c1', VERIFY_FAIL] },
      adv(50),
      { type: 'invoke', callback: 'onRegisterPushHandler', path: [0], args: ['c1', DONE] },
      adv(5_000),
    ],
    {
      props: { onRegisterPushHandler: { $callback: 'onRegisterPushHandler' } },
      context: { window: { localStorage: SAVED_CONV }, http: CONV_HTTP('c1') },
    },
  ),
  base(
    'auto-fix: a queued preview error is dropped when verification fails, so the fix sends once',
    [
      ...SEND_IT,
      props({ pendingMessage: 'The preview crashed on load', pendingMessageKey: 1 }),
      emit(START('a1')),
      emit(VERIFY_FAIL),
      adv(50),
      emit(DONE),
      finish,
      adv(3_000),
    ],
  ),

  // ── Leaving the page ───────────────────────────────────────────────────────
  base('auto-fix: unmounting during the countdown sends nothing afterwards', [
    ...FAILING_TURN,
    { type: 'unmount' },
    adv(5_000),
  ]),
]
