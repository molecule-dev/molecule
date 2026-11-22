/**
 * `ChatPanel` cases: Auto-commit. Every case name starts with `auto-commit: `.
 *
 * The `/autocommit <seconds>` countdown and its persistence: the typed command arms a
 * cadence (`0` cancels, a bare `/autocommit` shows the usage line) and debounce-PATCHes it
 * into `project.settings.autoCommitSeconds`; on load the saved cadence hydrates paused —
 * the default (5s) when the project never set one, off on an explicit `0`, and off for the
 * session when the settings load fails. With files on the tree the green badge occupies the
 * commit bar's button slot: a plain "Commit 1 file" through the quiet phase, the live
 * "Commit 1 file in Ns" for the final seconds, ticking once per second. A due countdown
 * fires the existing /commit path and pauses until the next file change; a refused commit
 * keeps it paused without refiring, and a file change (an AI write or the host's user-side
 * signal) restarts it from full. The countdown is HELD — frozen, button inert, no commit —
 * while the agent works: a local turn, a teammate's remote turn, or a pending auto-fix
 * follow-up; it resumes and fires once the hold clears. Unmounting stops both the tick and
 * the unsent PATCH. A viewer never hydrates the cadence, and a mid-session demotion stops
 * both the pending PATCH and the fire.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  click,
  CONV_HTTP,
  DIFF,
  DONE,
  emit,
  finish,
  key,
  props,
  SEND,
  START,
  type,
} from './fixtures.js'

/** The green auto-commit button in the commit bar's slot. */
const BADGE = '[data-mol-id="chat-autocommit-badge"]'

/** One modified file, so the commit bar (and the badge in its slot) renders. */
const DIRTY = { files: [{ path: 'src/app.ts', status: 'modified' }] }

/**
 * The git-status answers a case needs: one per fetch it triggers (the mount, every turn
 * boundary, every debounced file-change refresh), each reporting the dirty tree so the
 * commit bar stays.
 *
 * @param n - How many git-status fetches the case makes.
 * @returns The scripted answers.
 */
const dirtyGitStatus = (n: number): HttpScript[] =>
  Array.from({ length: n }, () => ({ method: 'GET', url: '/projects/p1/git-status', data: DIRTY }))

/** The commit POST answering a commit the tree took. */
const COMMITTED: HttpScript = {
  method: 'POST',
  url: '/projects/p1/commit',
  data: {
    ok: true,
    committed: true,
    message: 'Auto-commit',
    files: ['src/app.ts'],
    hash: 'a1b2c3d',
  },
}

/** The cadence persist a `/autocommit 3` command debounce-PATCHes. */
const PERSIST_3: HttpScript = {
  method: 'PATCH',
  url: '/projects/p1',
  data: { settings: { autoCommitSeconds: 3 } },
}

/**
 * Answers for the skills-seed retry: it re-reads the file listing every 1.5 s (up to five
 * attempts) and keeps retrying while the listing is empty, so a case whose clock advances
 * past the mount needs one answer per attempt it reaches. Four covers every retry a case
 * can reach before the attempt cap.
 *
 * @returns The scripted answers.
 */
const SEED_ANSWERS: HttpScript[] = Array.from({ length: 4 }, () => ({
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files: [] },
}))

/** Extra answers for the conversation reads a resumed conversation's reconcile makes. */
const CONV_READS: HttpScript[] = Array.from({ length: 2 }, () => ({
  method: 'GET',
  url: '/projects/p1/chat?conversationId=c1',
  data: {},
}))

/** What a failed verification says (the text the auto-fix message carries). */
const VERIFY_OUTPUT = 'src/app.ts(4,11): error TS2304: Cannot find name "quizzer"'

/** A verification that found one type error, so the turn ends into an auto-fix follow-up. */
const VERIFY_FAIL = {
  type: 'verification_result',
  status: 'error',
  output: VERIFY_OUTPUT,
  workspaces: [],
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the thing'), click(SEND)]

/** The conversation a mount resumes, so the push handler's frames are applied. */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/**
 * Mounting with the panel's push handler registered, over the resumed conversation whose
 * server reports a live stream: the pushed turn's confirmation poll reads
 * `provider.isServerStreaming` off every history load, so the seed answers true for the
 * loads the live remote turn polls and false once its `done` landed — otherwise the poll
 * clears the remote-stream hold the pushed frame just set.
 */
const PUSH_EXTRA: BaseExtra = {
  props: { onRegisterPushHandler: { $callback: 'onRegisterPushHandler' } },
  context: {
    areas: { chat: { serverStreaming: [true, true, true, false] } },
    window: { localStorage: SAVED_CONV },
    http: CONV_HTTP('c1'),
  },
}

/**
 * Delivers one broadcast stream event from a teammate's client, as the host holding the
 * panel's registered push handler would.
 *
 * @param event - The broadcast stream event.
 * @returns The step.
 */
const push = (event: unknown): Interaction => ({
  type: 'invoke',
  callback: 'onRegisterPushHandler',
  path: [0],
  args: ['c1', event],
})

/**
 * Opens the /settings card, whose auto-commit row shows the live cadence ("Every Ns" or
 * "Off") — the readable surface of the hydrated and commanded state.
 *
 * @returns The steps.
 */
const openSettings = (): Interaction[] => [type('/settings'), key('Enter')]

/** Auto-commit. */
export const autoCommitCases: FeatureCase[] = [
  // ── Hydration from project.settings ────────────────────────────────────────
  base(
    'auto-commit: a saved cadence hydrates paused from the project settings, without a PATCH',
    [...openSettings()],
    {
      http: [
        { method: 'GET', url: '/projects/p1', data: { settings: { autoCommitSeconds: 30 } } },
        ...dirtyGitStatus(1),
      ],
    },
  ),
  base('auto-commit: a project that never set a cadence hydrates the default, without a PATCH', [
    ...openSettings(),
  ]),
  base(
    'auto-commit: an explicit off stays off and keeps the blue commit button in the slot',
    [...openSettings()],
    {
      http: [
        { method: 'GET', url: '/projects/p1', data: { settings: { autoCommitSeconds: 0 } } },
        ...dirtyGitStatus(1),
      ],
    },
  ),
  base(
    'auto-commit: a failed settings load leaves auto-commit off for the session',
    [...openSettings()],
    {
      http: [{ method: 'GET', url: '/projects/p1', status: 500 }, ...dirtyGitStatus(1)],
    },
  ),

  // ── The /autocommit command and its persistence ────────────────────────────
  base(
    'auto-commit: /autocommit arms a cadence, announces it, and debounce-persists it',
    [type('/autocommit 30'), key('Enter'), adv(600), ...openSettings()],
    {
      http: [
        { method: 'PATCH', url: '/projects/p1', data: { settings: { autoCommitSeconds: 30 } } },
        ...dirtyGitStatus(1),
      ],
    },
  ),
  base(
    'auto-commit: /autocommit 0 cancels, announces it, and persists the off',
    [type('/autocommit 0'), key('Enter'), adv(600)],
    {
      http: [
        { method: 'PATCH', url: '/projects/p1', data: { settings: { autoCommitSeconds: 0 } } },
        ...dirtyGitStatus(1),
      ],
    },
  ),
  base(
    'auto-commit: a bare /autocommit shows the usage line and changes nothing',
    [type('/autocommit '), key('Enter')],
    {
      http: dirtyGitStatus(1),
    },
  ),
  base(
    'auto-commit: two quick cadence changes persist once, as the last choice',
    [
      type('/autocommit 30'),
      key('Enter'),
      type('/autocommit 45'),
      key('Enter'),
      adv(600),
      ...openSettings(),
    ],
    {
      http: [
        { method: 'PATCH', url: '/projects/p1', data: { settings: { autoCommitSeconds: 45 } } },
        ...dirtyGitStatus(1),
      ],
    },
  ),
  base(
    'auto-commit: a refused cadence PATCH keeps the armed cadence',
    [type('/autocommit 30'), key('Enter'), adv(600), ...openSettings()],
    {
      http: [{ method: 'PATCH', url: '/projects/p1', status: 500 }, ...dirtyGitStatus(1)],
    },
  ),

  // ── Tick, fire, pause, re-arm ──────────────────────────────────────────────
  base(
    'auto-commit: the countdown ticks in the badge and fires the commit when it lapses',
    [type('/autocommit 3'), key('Enter'), adv(1_000), adv(1_000), adv(1_000)],
    {
      http: [PERSIST_3, COMMITTED, ...dirtyGitStatus(1), ...SEED_ANSWERS],
    },
  ),
  base(
    'auto-commit: after a fire the countdown pauses — it does not refire on its own',
    [type('/autocommit 3'), key('Enter'), adv(3_000), adv(5_000)],
    {
      http: [
        PERSIST_3,
        {
          method: 'POST',
          url: '/projects/p1/commit',
          data: { ok: true, committed: false, message: 'No changes to commit' },
        },
        ...dirtyGitStatus(2),
        ...SEED_ANSWERS,
      ],
    },
  ),
  base(
    'auto-commit: a file change re-arms the countdown after an auto-commit, and it fires again',
    [
      type('/autocommit 3'),
      key('Enter'),
      adv(3_000),
      adv(3_000),
      props({ gitStatusTick: 1 }),
      adv(400),
      adv(3_000),
    ],
    {
      http: [PERSIST_3, COMMITTED, COMMITTED, ...dirtyGitStatus(2), ...SEED_ANSWERS],
    },
  ),
  base(
    'auto-commit: clicking the green badge commits now, before the countdown lapses',
    [
      type('/autocommit 10'),
      key('Enter'),
      click(BADGE),
      {
        type: 'http',
        method: 'POST',
        url: '/projects/p1/commit',
        data: {
          ok: true,
          committed: true,
          message: 'Manual commit',
          files: ['src/app.ts'],
          hash: 'b2c3d4e',
        },
      },
    ],
    {
      http: [{ method: 'POST', url: '/projects/p1/commit', defer: true }, ...dirtyGitStatus(1)],
    },
  ),

  // ── The hold: never commit while the agent works ───────────────────────────
  base(
    'auto-commit: a streaming turn holds the countdown — it fires only once the turn finishes',
    [type('/autocommit 3'), key('Enter'), ...SEND_IT, click(BADGE), adv(5_000), finish, adv(3_000)],
    {
      http: [PERSIST_3, COMMITTED, ...dirtyGitStatus(3), ...SEED_ANSWERS],
    },
  ),
  base(
    'auto-commit: a pending auto-fix follow-up holds the countdown too',
    [
      ...SEND_IT,
      emit(START('a1')),
      emit(VERIFY_FAIL),
      adv(50),
      emit(DONE),
      finish,
      type('/autocommit 3'),
      key('Enter'),
      adv(1_000),
    ],
    {
      http: [PERSIST_3, ...dirtyGitStatus(3)],
    },
  ),
  base(
    "auto-commit: a teammate's remote turn holds the countdown the same way",
    [
      type('/autocommit 3'),
      key('Enter'),
      push(START('tm1')),
      adv(1_000),
      adv(4_000),
      push(DONE),
      adv(3_000),
      adv(1_000),
    ],
    {
      ...PUSH_EXTRA,
      http: [PERSIST_3, COMMITTED, ...CONV_READS, ...dirtyGitStatus(1), ...SEED_ANSWERS],
    },
  ),

  // ── Restarting the countdown ───────────────────────────────────────────────
  base(
    'auto-commit: an AI file change restarts the countdown from full',
    [
      type('/autocommit 3'),
      key('Enter'),
      adv(1_000),
      ...SEND_IT,
      emit(START('a1')),
      emit(DIFF('src/app.ts', 'const a = 1', 'const a = 2')),
      adv(400),
      emit(DONE),
      adv(50),
      finish,
    ],
    {
      http: [PERSIST_3, ...dirtyGitStatus(4)],
    },
  ),
  base(
    'auto-commit: a user-side file change restarts the countdown from full too',
    [type('/autocommit 3'), key('Enter'), adv(1_000), props({ gitStatusTick: 1 }), adv(400)],
    {
      http: [PERSIST_3, ...dirtyGitStatus(2)],
    },
  ),

  // ── Leaving the page ───────────────────────────────────────────────────────
  base(
    'auto-commit: unmounting stops the countdown — nothing commits afterwards',
    [type('/autocommit 3'), key('Enter'), { type: 'unmount' }, adv(5_000)],
    {
      http: [COMMITTED, ...dirtyGitStatus(1)],
    },
  ),

  // ── Who may hydrate, persist and fire ──────────────────────────────────────
  base('auto-commit: a viewer never hydrates the saved cadence', [...openSettings()], {
    props: { canEdit: false },
    http: [{ method: 'GET', url: '/projects/p1', data: { settings: { autoCommitSeconds: 30 } } }],
  }),
  base(
    'auto-commit: a mid-session demotion stops the cadence PATCH from ever going out',
    [type('/autocommit 30'), key('Enter'), props({ canEdit: false }), adv(600)],
    {
      http: dirtyGitStatus(1),
    },
  ),
  base(
    'auto-commit: a demoted client never fires the countdown that lapses afterwards',
    [type('/autocommit 3'), key('Enter'), adv(600), props({ canEdit: false }), adv(3_000)],
    {
      http: [PERSIST_3, ...dirtyGitStatus(1), ...SEED_ANSWERS],
    },
  ),
]
