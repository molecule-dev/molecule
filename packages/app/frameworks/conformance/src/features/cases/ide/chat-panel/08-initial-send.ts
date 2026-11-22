/**
 * `ChatPanel` cases: Initial, pending, deferred and auto-submit sends. Every case name starts
 * with `initial send: `.
 *
 * The sends a host or the platform starts without the user pressing send: the `initialMessage`
 * a mount auto-sends (plain, a side-channel note sent suppressed, the blocked-team and viewer
 * skips, the restored-conversation skip, and the ref guards against repeating or re-sending),
 * a `pendingMessage` dispatched by a `pendingMessageKey` change (as the agent's automatic
 * message — visible, suppressed-hidden, user-initiated — and the no-key, same-key and
 * mount-counted guards, the viewer and blocked-team skips), the pending message that defers
 * while a turn streams and sends when it ends (its flags carried over, dropped by a Stop,
 * a user-initiated one sending anyway), and the `autoSubmitSignal` that submits the composer's
 * prefilled draft (and does nothing with an empty draft or a value the panel already held).
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

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
  props,
  SEND,
  START,
  STOP,
  TEAM_COMMAND,
  TEXT,
  type,
} from './fixtures.js'

/** The initial prompt the plain cases auto-send. */
const PROMPT = 'Build a todo app with a header'

/** A side-channel note as an initial or pending message (matches `TEAM_COMMAND`). */
const TEAM_NOTE = '/teamsay checking in'

/** The pending auto-fix message the pending cases dispatch. */
const PENDING_FIX = 'Investigate the broken preview'

/** The composer draft the prompt→chat morph pre-fills before its auto-submit. */
const DRAFT = 'Build a todo app from this prompt'

/** Mount props that count no pending key yet (the host dispatches by changing it). */
const NO_PENDING_YET = { pendingMessageKey: 0 }

/** Mount props of a viewer: read-only, so no automatic send may fire. */
const VIEWER = { ...NO_PENDING_YET, canEdit: false }

/** Mount props with team messaging disabled. */
const NO_TEAM = { ...NO_PENDING_YET, canSendTeamMessages: false }

/** The host command registry entry a side-channel note matches. */
const EXTRA_COMMANDS = { extraCommands: [TEAM_COMMAND] }

/** The auto-submit signal bump (the panel mounts without the prop). */
const SIGNAL = [props({ autoSubmitSignal: 1 })]

/**
 * One restored message at the case clock.
 *
 * @param id - The message id.
 * @param role - Its role.
 * @param content - Its text.
 * @returns The message.
 */
const restored = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
  timestamp: NOW - 60_000,
})

/** A saved conversation: the opening prompt and its reply (answers the mount's history load). */
const SAVED_HISTORY: ChatMessage[] = [
  restored('u1', 'user', 'An e-learning platform with quizzes'),
  restored('a1', 'assistant', 'Saved the plan — building it now.'),
]

/** Opens turn one, so the panel is busy while a pending message arrives. */
const BUSY_TURN = [
  type('Start the build'),
  click(SEND),
  emit(START('a1')),
  emit(TEXT('Building it now')),
  adv(50),
]

/**
 * Dispatches a pending message: the host changes the key, the panel sends (or defers).
 *
 * @param message - The pending text.
 * @param key - Its new dispatch key.
 * @returns The steps.
 */
const dispatchPending = (message: string, key: number): ReturnType<typeof props> =>
  props({ pendingMessage: message, pendingMessageKey: key })

/** Initial, pending, deferred and auto-submit sends. */
export const initialSendCases: FeatureCase[] = [
  // ── The initial message a mount auto-sends ─────────────────────────────────
  base('initial send: the initial message sends itself on mount', [], {
    props: { initialMessage: PROMPT },
  }),
  base(
    'initial send: a side-channel initial message sends suppressed, with no user bubble',
    [emit(START('a1')), emit(TEXT('Checking in with the team')), adv(50), emit(DONE), finish],
    { props: { initialMessage: TEAM_NOTE, ...EXTRA_COMMANDS } },
  ),
  base(
    'initial send: team messages disabled blocks a side-channel initial message behind a system card',
    [],
    { props: { initialMessage: TEAM_NOTE, canSendTeamMessages: false, ...EXTRA_COMMANDS } },
  ),
  base('initial send: a viewer never auto-sends the initial message', [], {
    props: { initialMessage: PROMPT, canEdit: false },
  }),
  base(
    'initial send: an initial message a viewer held is never sent if the viewer gains edit rights',
    [props({ canEdit: true })],
    { props: { initialMessage: PROMPT, canEdit: false } },
  ),
  base('initial send: a restored conversation skips the initial message', [], {
    props: { initialMessage: PROMPT },
    context: {
      areas: { chat: { history: [SAVED_HISTORY] } },
      window: { localStorage: { 'mol-chat-conv:p1': 'c1' } },
    },
    http: CONV_HTTP('c1'),
  }),
  base(
    'initial send: re-running the auto-send effect does not repeat the initial message',
    [emit(DONE), finish, props({ canSendTeamMessages: false })],
    { props: { initialMessage: PROMPT } },
  ),
  base(
    'initial send: a changed initial message sends the new prompt',
    [
      emit(START('a1')),
      emit(TEXT('On the todo app')),
      adv(50),
      emit(DONE),
      finish,
      props({ initialMessage: 'Second prompt: add authentication' }),
    ],
    { props: { initialMessage: PROMPT } },
  ),

  // ── The pending message a key change dispatches ────────────────────────────
  base(
    'initial send: a pending message dispatches automatically as an agent message, not a user one',
    [
      dispatchPending(PENDING_FIX, 1),
      emit(START('a1')),
      emit(TEXT('Looking into it')),
      adv(50),
      emit(DONE),
      finish,
    ],
    { props: NO_PENDING_YET },
  ),
  base(
    'initial send: a suppressed pending message sends hidden, with no bubble',
    [dispatchPending('Kick off the build', 1), emit(DONE), finish],
    { props: { ...NO_PENDING_YET, pendingMessageSuppressUser: true } },
  ),
  base(
    'initial send: a user-initiated pending message carries userInitiated',
    [
      props({
        pendingMessage: 'Fix the failing preview test',
        pendingMessageKey: 1,
        pendingMessageUserInitiated: true,
      }),
    ],
    { props: NO_PENDING_YET },
  ),
  base('initial send: a pending message without a key never dispatches', [adv(50)], {
    props: { pendingMessage: PENDING_FIX },
  }),
  base(
    'initial send: a pending message counted at mount waits for a new key',
    [adv(50), props({ pendingMessageKey: 4 })],
    { props: { pendingMessage: PENDING_FIX, pendingMessageKey: 3 } },
  ),
  base(
    'initial send: the same pending key dispatches only once',
    [
      dispatchPending(PENDING_FIX, 1),
      emit(DONE),
      finish,
      props({ pendingMessage: 'Also check the server logs', pendingMessageKey: 1 }),
    ],
    { props: NO_PENDING_YET },
  ),
  base(
    'initial send: a viewer never dispatches a pending message',
    [dispatchPending(PENDING_FIX, 1)],
    { props: VIEWER },
  ),
  base(
    'initial send: team messages disabled blocks a pending side-channel message',
    [dispatchPending(TEAM_NOTE, 1)],
    { props: { ...NO_TEAM, ...EXTRA_COMMANDS } },
  ),

  // ── The pending message that waits for the live turn to end ────────────────
  base(
    'initial send: a pending message mid-turn defers until the turn finishes',
    [...BUSY_TURN, dispatchPending('Fix the failing test', 1), emit(DONE), finish],
    { props: NO_PENDING_YET },
  ),
  base(
    'initial send: a deferred pending message keeps its suppressed flag',
    [...BUSY_TURN, dispatchPending('Kick off the build', 1), emit(DONE), finish],
    { props: { ...NO_PENDING_YET, pendingMessageSuppressUser: true } },
  ),
  base(
    'initial send: a deferred pending message keeps its user-initiated flag',
    [...BUSY_TURN, dispatchPending('Fix the failing test', 1), emit(DONE), finish],
    { props: { ...NO_PENDING_YET, pendingMessageUserInitiated: true } },
  ),
  base(
    'initial send: stopping the turn drops the deferred pending message',
    [...BUSY_TURN, dispatchPending('Fix the failing test', 1), click(STOP)],
    { props: NO_PENDING_YET },
  ),
  base(
    'initial send: a side-channel note deferred mid-turn is dropped when team messages turn off before the turn ends',
    [
      ...BUSY_TURN,
      dispatchPending(TEAM_NOTE, 1),
      props({ canSendTeamMessages: false }),
      emit(DONE),
      finish,
    ],
    { props: { ...NO_PENDING_YET, ...EXTRA_COMMANDS } },
  ),
  base(
    'initial send: a user-initiated pending message sends even after a stop',
    [
      ...BUSY_TURN,
      click(STOP),
      props({
        pendingMessage: 'Fix the failing test',
        pendingMessageKey: 1,
        pendingMessageUserInitiated: true,
      }),
    ],
    { props: NO_PENDING_YET },
  ),

  // ── The auto-submit signal (prompt → chat morph) ───────────────────────────
  base('initial send: an auto-submit signal submits the prefilled draft', SIGNAL, {
    props: { initialInputValue: DRAFT },
  }),
  base('initial send: an auto-submit signal with an empty composer sends nothing', SIGNAL),
  base(
    'initial send: an auto-submit signal present at mount does not submit the draft',
    [adv(50)],
    { props: { initialInputValue: DRAFT, autoSubmitSignal: 4 } },
  ),
]
