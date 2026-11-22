/**
 * `ChatPanel` cases: Functions the panel hands its host (pushed frames, history reconcile, the
 * tests strip). Every case name starts with `host handles: `.
 *
 * The three registration contracts a host lives against: the pushed-frame handler the panel
 * hands over on mount (which renders a teammate's broadcast, drops frames for other
 * conversations, and keeps the Stop button up while the teammate's turn is live) and takes
 * back on unmount or on a new handler prop; the history reconcile that converges this panel
 * on the transcript its push channel missed, and adds nothing on a transcript it already
 * shows; and the host signals' mount guard (a signal already set at mount opens nothing).
 * The tests strip: discovery through the host's `listTests` (on its own, after the turn that
 * writes the first spec, never a second probe once tests are known, gated on the environment
 * and on the device's shown/hidden preference), the strip opening the tests browser, a viewer
 * seeing it too, and a host's `nativeTests` strip rendering in place of the built-in one or
 * leaving none while hidden.
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
  CALLBACKS,
  click,
  CONV_HTTP,
  DONE,
  emit,
  finish,
  NOW,
  props,
  SEND,
  serverStreaming,
  START,
  TEXT,
  type,
} from './fixtures.js'

/** The conversation a pushed-frame case mounts with: the handler only applies its frames. */
const CONV = 'c1'

/**
 * Delivers one broadcast stream event by calling the handler the panel handed to the named
 * registration callback, as the host holding it would: the handler's first argument names
 * the conversation the frame belongs to.
 *
 * @param callback - The registration callback holding the handler.
 * @param conversationId - The conversation the frame belongs to.
 * @param event - The broadcast stream event.
 * @returns The step.
 */
const pushFrame = (callback: string, conversationId: string, event: unknown): Interaction => ({
  type: 'invoke',
  callback,
  path: [0],
  args: [conversationId, event],
})

/**
 * What a case that drives the handed-over pushed-frame handler adds: the conversation mount
 * (the handler only applies frames for the open conversation) and the registration callback.
 *
 * @returns The `extra` argument for {@link base}.
 */
const withConvPush = (): BaseExtra => ({
  props: { conversationId: CONV, onRegisterPushHandler: { $callback: 'onRegisterPushHandler' } },
  context: { http: CONV_HTTP(CONV) },
})

/** A teammate's note, as the persisted transcript carries it (what a missed broadcast left behind). */
const TEAM_NOTE: ChatMessage = {
  id: 'note-1',
  role: 'user',
  content: 'Heads up: the API keys rotate tonight',
  timestamp: NOW + 2,
}

/**
 * What a case that drives the handed-over history reconcile adds: the conversation mount,
 * the registration callback, and the scripted transcript reads — the mount's empty one, then
 * the teammate's note the reconcile pulls.
 *
 * @returns The `extra` argument for {@link base}.
 */
const withReconcile = (): BaseExtra => ({
  props: {
    conversationId: CONV,
    onRegisterHistoryReconcile: { $callback: 'onRegisterHistoryReconcile' },
  },
  context: {
    areas: { chat: { history: [[], [TEAM_NOTE]] } },
    http: CONV_HTTP(CONV),
  },
})

/** The share-link list an opened share modal reads (none yet). */
const SHARES_EMPTY: HttpScript = { method: 'GET', url: '/projects/p1/shares', data: { data: [] } }

/** Two discovered tests the host's `listTests` resolves with. */
const TESTS = [
  { id: 't1', file: 'e2e/home.spec.ts', kind: 'e2e', workspace: 'app', title: 'Home page loads' },
  { id: 't2', file: 'tests/util.test.ts', kind: 'unit', workspace: 'api', title: 'util helpers' },
]

/** The one spec the turn of the first-spec case is said to have written. */
const FIRST_SPEC = TESTS[0]

/**
 * Hands the panel the host's `listTests` callback, resolving with `answer` at every call.
 *
 * @param testCase - The case.
 * @param answer - What `listTests` resolves with (default: the two discovered tests).
 * @returns The case with the callback wired and its answer declared.
 */
const withListTests = (testCase: FeatureCase, answer: unknown = { tests: TESTS }): FeatureCase => ({
  ...testCase,
  callbacks: [...CALLBACKS, 'listTests'],
  callbackResults: { listTests: { resolve: answer } },
})

/**
 * Hands the panel the host's `listTests` callback and holds its answers until a `settle`
 * step, so a snapshot can show the panel before and after discovery answers — and a settle
 * with no pending call fails the case, proving when the panel did and did not probe.
 *
 * @param testCase - The case.
 * @returns The case with the callback wired deferred.
 */
const withListTestsDeferred = (testCase: FeatureCase): FeatureCase => ({
  ...testCase,
  callbacks: [...CALLBACKS, 'listTests'],
  callbackResults: { listTests: { defer: true } },
})

/**
 * Settles the oldest pending `listTests` call with an answer.
 *
 * @param tests - The discovered tests.
 * @returns The step.
 */
const settleListTests = (tests: unknown): Interaction => ({
  type: 'settle',
  callback: 'listTests',
  value: { tests },
})

/** The composer's send a tests case starts from. */
const SEND_IT = [type('Run the checks'), click(SEND)]

/** The tests strip's whole-row disclosure button (its click opens the tests browser). */
const STRIP_TOGGLE = '[data-mol-id="tests-bar-toggle"]'

/**
 * A host's `nativeTests` strip, shown: the built-in strip's slot renders the host's own node
 * instead (the markers become the framework's node and function).
 */
const NATIVE_UP = {
  visible: true,
  history: { $nodes: [] },
  renderStatus: {
    $fn: 'renderStatus',
    nodes: [
      {
        tag: 'div',
        attrs: { 'data-mol-id': 'host-tests-strip' },
        children: ['The host renders its own tests status'],
      },
    ],
  },
}

/** The same host strip, hidden by its `visible` flag. */
const NATIVE_DOWN = { ...NATIVE_UP, visible: false }

/** Functions the panel hands its host (pushed frames, history reconcile, the tests strip). */
export const hostHandlesCases: FeatureCase[] = [
  // ── The pushed-frame handler the panel hands the host ──────────────────────
  base(
    "host handles: the pushed-frame handler the panel hands the host renders a teammate's frame and is withdrawn on unmount",
    [
      pushFrame('onRegisterPushHandler', CONV, START('tm1')),
      pushFrame('onRegisterPushHandler', CONV, TEXT('Checking the build now.')),
      adv(50),
      { type: 'unmount' },
    ],
    withConvPush(),
  ),
  base(
    'host handles: a new push-handler prop withdraws the handler from the old callback and hands it to the new one',
    [
      props({ onRegisterPushHandler: { $callback: 'onRegisterPushHandler2' } }),
      pushFrame('onRegisterPushHandler2', CONV, START('tm1')),
      pushFrame('onRegisterPushHandler2', CONV, TEXT('New registration, same panel.')),
      adv(50),
    ],
    withConvPush(),
  ),
  base(
    'host handles: a pushed frame for another conversation changes nothing on this panel',
    [
      pushFrame('onRegisterPushHandler', 'c2', START('x1')),
      pushFrame('onRegisterPushHandler', 'c2', TEXT('This turn belongs to another conversation.')),
      adv(50),
      pushFrame('onRegisterPushHandler', CONV, START('tm1')),
      pushFrame('onRegisterPushHandler', CONV, TEXT('This one is mine.')),
      adv(50),
    ],
    withConvPush(),
  ),
  base(
    "host handles: a teammate's live turn keeps the Stop button up on this panel",
    [
      serverStreaming(true),
      pushFrame('onRegisterPushHandler', CONV, START('tm1')),
      pushFrame('onRegisterPushHandler', CONV, TEXT('Fixing the header now.')),
      adv(50),
    ],
    withConvPush(),
  ),

  // ── The history reconcile the panel hands the host ─────────────────────────
  base(
    'host handles: invoking the history reconcile the panel hands over pulls the transcript the push channel missed',
    [{ type: 'invoke', callback: 'onRegisterHistoryReconcile', path: [0] }],
    withReconcile(),
  ),
  base(
    'host handles: a reconcile over a transcript the panel already shows adds nothing new',
    [
      { type: 'invoke', callback: 'onRegisterHistoryReconcile', path: [0] },
      { type: 'invoke', callback: 'onRegisterHistoryReconcile', path: [0] },
    ],
    withReconcile(),
  ),

  // ── The host signals' mount guard ──────────────────────────────────────────
  base(
    'host handles: mounting with the open-settings signal already set opens no settings overlay',
    [],
    {
      props: { openSettingsSignal: 1 },
    },
  ),
  base(
    'host handles: mounting with the open-report signal already set opens no bug-report modal',
    [],
    {
      props: { openReportSignal: 1 },
    },
  ),
  base('host handles: mounting with the open-share signal already set opens no share modal', [], {
    props: { openShareSignal: 1 },
    http: [SHARES_EMPTY],
  }),

  // ── The tests strip's discovery ────────────────────────────────────────────
  withListTestsDeferred(
    base(
      "host handles: discovering the project's tests brings the tests strip up on its own",
      [settleListTests(TESTS)],
      {
        props: { testsAvailable: true },
      },
    ),
  ),
  withListTestsDeferred(
    base('host handles: an empty tests answer keeps the strip hidden', [settleListTests([])], {
      props: { testsAvailable: true },
    }),
  ),
  withListTestsDeferred(
    base(
      "host handles: the turn that writes the project's first spec brings the tests strip up",
      [
        adv(50),
        settleListTests([]),
        ...SEND_IT,
        emit(START('a1')),
        emit(TEXT('Adding the first spec now.')),
        adv(50),
        emit(DONE),
        finish,
        adv(50),
        settleListTests([FIRST_SPEC]),
      ],
      {
        props: { testsAvailable: true },
      },
    ),
  ),
  withListTests(
    base(
      'host handles: a project whose tests are already known is not probed again when a turn ends',
      [
        ...SEND_IT,
        emit(START('a1')),
        emit(TEXT('Touching nothing about tests.')),
        adv(50),
        emit(DONE),
        finish,
        adv(50),
      ],
      { props: { testsAvailable: true } },
    ),
  ),
  withListTestsDeferred(
    base(
      'host handles: the strip waits for the tests environment to come up before it discovers',
      [props({ testsAvailable: true }), settleListTests(TESTS)],
      {
        props: { testsAvailable: false },
      },
    ),
  ),
  withListTestsDeferred(
    base(
      'host handles: a device that turned the strip off discovers nothing until it is turned back on',
      [
        { type: 'localStorage', key: 'mol_chat_show_tests_bar', value: 'true' },
        settleListTests(TESTS),
      ],
      {
        props: { testsAvailable: true },
        context: { window: { localStorage: { mol_chat_show_tests_bar: 'false' } } },
      },
    ),
  ),

  // ── The tests strip itself ─────────────────────────────────────────────────
  withListTestsDeferred(
    base(
      'host handles: clicking the tests strip opens the tests browser over the composer',
      [settleListTests(TESTS), click(STRIP_TOGGLE)],
      {
        props: { testsAvailable: true },
      },
    ),
  ),
  withListTestsDeferred(
    base('host handles: a viewer sees the tests strip too', [settleListTests(TESTS)], {
      props: { testsAvailable: true, canEdit: false },
    }),
  ),
  withListTests(
    base("host handles: a host's native tests strip renders in place of the built-in one", [], {
      props: { testsAvailable: true, nativeTests: NATIVE_UP },
    }),
  ),
  withListTests(
    base(
      'host handles: a native tests strip the host hides leaves no strip until the host shows it',
      [props({ nativeTests: NATIVE_UP })],
      { props: { testsAvailable: true, nativeTests: NATIVE_DOWN } },
    ),
  ),
]
