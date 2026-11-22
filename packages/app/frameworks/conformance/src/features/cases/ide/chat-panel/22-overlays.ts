/**
 * `ChatPanel` cases: Panel overlays, header buttons and signals. Every case name starts with
 * `overlays: `.
 *
 * The closeable overlay above the composer that /skills, /scripts, /settings and /test open —
 * each variant's card inside the dialog (Skills, Scripts, Tests, Settings), a trailing query
 * seeding the card's search, the ✕ and an Escape from inside the card's own search box closing
 * it, an open overlay closing a sibling sounds picker, and hiding the queue bar and the work
 * card until it closes. The header's share, bug-report and gear buttons: the modals and the
 * settings overlay they open, and the share button following the host's share capability
 * through its explicit gate and its viewer derivation. And the host signals: an
 * `autoSubmitSignal` bump submitting the current draft (the mount's initial value, a
 * whitespace draft and a repeated value each sending nothing), and the open-settings /
 * open-report / open-share signals opening their view — the share one below the host's
 * capability included.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase, FeatureCaseContext } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  CALLBACKS,
  click,
  emit,
  key,
  NOW,
  props,
  SEND,
  START,
  TOOL,
  type,
} from './fixtures.js'

/** The overlay header's ✕. */
const CLOSE = '[data-mol-id="panel-overlay-close"]'

/** The skills browser's search box (the card inside the overlay). */
const SKILLS_SEARCH = '[data-mol-id="skills-search"]'

/** The header gear button (bumps the panel's open-settings signal). */
const SETTINGS_BUTTON = '[data-mol-id="chat-settings-button"]'

/** The header bug-report button (bumps the open-report signal). */
const REPORT_BUTTON = '[data-mol-id="chat-report-button"]'

/** The header share button (bumps the open-share signal). */
const SHARE_BUTTON = '[data-mol-id="chat-share-button"]'

/** The share-link list an opened share modal reads (none yet). */
const SHARES_EMPTY: HttpScript = { method: 'GET', url: '/projects/p1/shares', data: { data: [] } }

/** One skill file the sandbox holds, and its SKILL.md content. */
const SKILL_PATH = '.agents/skills/deploy/SKILL.md'
const SKILL_MD = '---\nname: Deploy\ndescription: Ship the app to production\n---\n'

/**
 * The file reads a skills-overlay case scripts: the mount's skills seed takes an empty list
 * first (as at {@link NOW} a cold sandbox answers nothing), then the overlay's own card reads
 * the skill and its content.
 */
const SKILLS_HTTP: HttpScript[] = [
  { method: 'GET', url: '/projects/p1/files-list', data: { files: [] } },
  { method: 'GET', url: '/projects/p1/files-list', data: { files: [SKILL_PATH] } },
  { method: 'GET', url: `/projects/p1/files/${SKILL_PATH}`, data: { content: SKILL_MD } },
]

/**
 * The {@link base} extra that scripts those skills reads (the base list answers the seed
 * alone, which would leave the overlay's card nothing to read).
 *
 * @returns The extra.
 */
const withSkills = (): BaseExtra => ({
  withoutHttp: ['/projects/p1/files-list'],
  http: SKILLS_HTTP,
})

/** Two saved scripts the scripts browser lists (a query narrows them to one). */
const SCRIPTS = {
  scripts: [
    {
      name: 'deploy',
      description: 'Ship the app to production',
      createdAt: '2023-11-01T00:00:00.000Z',
    },
    {
      name: 'backup',
      description: 'Snapshot the database',
      createdAt: '2023-11-02T00:00:00.000Z',
    },
  ],
}

/** The scripts list a scripts-overlay case scripts for the card's own read. */
const SCRIPTS_HTTP: HttpScript[] = [{ method: 'GET', url: '/projects/p1/scripts', data: SCRIPTS }]

/** Two discovered tests the host's `listTests` resolves with. */
const TESTS = [
  { id: 't1', file: 'e2e/home.spec.ts', kind: 'e2e', workspace: 'app', title: 'Home page loads' },
  { id: 't2', file: 'tests/util.test.ts', kind: 'unit', workspace: 'api', title: 'util helpers' },
]

/**
 * Hands the panel the host's `listTests` callback, so the tests browser's open can list.
 *
 * @param testCase - The case.
 * @returns The case with the callback wired and its answer declared.
 */
const withTests = (testCase: FeatureCase): FeatureCase => ({
  ...testCase,
  callbacks: [...CALLBACKS, 'listTests'],
  callbackResults: { listTests: { resolve: { tests: TESTS } } },
})

/**
 * Runs a case on a coarse pointer (a touch screen), for the ✕'s touch-target branch.
 *
 * @param testCase - The case.
 * @returns The case with the pointer switched.
 */
const coarse = (testCase: FeatureCase): FeatureCase => ({ ...testCase, pointer: 'coarse' })

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

/** Opens the notification-sounds picker the way a user does: the /sounds command. */
const OPEN_SOUNDS = [type('/sounds'), key('Enter')]

/**
 * A queued user message restored from history, so the queue bar stands above the composer.
 *
 * @param id - The message id.
 * @param content - Its text.
 * @returns The message.
 */
const queuedMessage = (id: string, content: string): ChatMessage => ({
  id,
  role: 'user',
  content,
  timestamp: NOW + 2,
  queued: true,
})

/**
 * The {@link base} context that restores one queued message from history.
 *
 * @returns The context.
 */
const QUEUED_CONTEXT: FeatureCaseContext = {
  areas: { chat: { history: [[queuedMessage('q1', 'Add a footer too')]] } },
}

/** Streams the turn the work-card case opens, carrying a two-row working plan. */
const PLAN_TURN = [
  type('Plan the work'),
  click(SEND),
  emit(START('a1')),
  emit(
    TOOL('t1', 'update_task_list', {
      todos: [
        { content: 'Draft the plan', status: 'in_progress' },
        { content: 'Build it', status: 'pending' },
      ],
    }),
  ),
  adv(50),
]

/** Panel overlays, header buttons and signals. */
export const overlaysCases: FeatureCase[] = [
  // ── Opening the overlay ─────────────────────────────────────────────────────
  base(
    'overlays: /skills opens the skills browser overlay',
    [type('/skills'), key('Enter')],
    withSkills(),
  ),
  base(
    "overlays: /skills with a query seeds the browser's search",
    [type('/skills dep'), key('Enter')],
    withSkills(),
  ),
  base('overlays: /scripts opens the scripts browser overlay', [type('/scripts'), key('Enter')], {
    http: SCRIPTS_HTTP,
  }),
  base(
    "overlays: /scripts with a query seeds the browser's search",
    [type('/scripts dep'), key('Enter')],
    { http: SCRIPTS_HTTP },
  ),
  withTests(base('overlays: /test opens the tests browser overlay', [type('/test'), key('Enter')])),

  // ── Closing the overlay ─────────────────────────────────────────────────────
  base('overlays: the ✕ closes the overlay', [type('/settings'), key('Enter'), click(CLOSE)]),
  coarse(
    base('overlays: a coarse pointer grows the ✕ to the 36px touch target', [
      type('/settings'),
      key('Enter'),
    ]),
  ),
  base(
    "overlays: Escape closes the overlay from inside its card's search box",
    [type('/skills'), key('Enter'), click(SKILLS_SEARCH), keyOn(SKILLS_SEARCH, 'Escape')],
    withSkills(),
  ),
  base('overlays: opening an overlay closes an open sounds picker', [
    ...OPEN_SOUNDS,
    click(SETTINGS_BUTTON),
  ]),

  // ── What the open overlay hides ─────────────────────────────────────────────
  base(
    'overlays: the queue bar hides while the overlay is open and returns after it closes',
    [click(SETTINGS_BUTTON), click(CLOSE)],
    { context: QUEUED_CONTEXT },
  ),
  base('overlays: the work card hides while the overlay is open and returns after it closes', [
    ...PLAN_TURN,
    click(SETTINGS_BUTTON),
    click(CLOSE),
  ]),

  // ── The header buttons ──────────────────────────────────────────────────────
  base('overlays: the header gear button opens the settings overlay', [click(SETTINGS_BUTTON)]),
  base('overlays: the header bug button opens the bug-report modal', [click(REPORT_BUTTON)]),
  base('overlays: the header share button opens the share-link modal', [click(SHARE_BUTTON)], {
    http: [SHARES_EMPTY],
  }),
  base('overlays: a host-gated share capability hides the header share button', [], {
    props: { canShare: false },
  }),
  base('overlays: a viewer gets no header share button', [], {
    props: { canEdit: false },
  }),
  base('overlays: a viewer granted the share capability keeps the share button', [], {
    props: { canEdit: false, canShare: true },
  }),

  // ── The host signals ────────────────────────────────────────────────────────
  base('overlays: mounting with an autoSubmitSignal already set sends nothing', [], {
    props: { autoSubmitSignal: 7, initialInputValue: 'Draft carried over from the prompt page' },
  }),
  base('overlays: bumping autoSubmitSignal submits the current draft', [
    type('Ship the footer'),
    props({ autoSubmitSignal: 1 }),
  ]),
  base('overlays: an autoSubmitSignal bump over a whitespace draft sends nothing', [
    type('   '),
    props({ autoSubmitSignal: 1 }),
  ]),
  base('overlays: a repeated autoSubmitSignal value does not send again', [
    type('Ship the footer'),
    props({ autoSubmitSignal: 3 }),
    props({ autoSubmitSignal: 3 }),
  ]),
  base('overlays: bumping openSettingsSignal opens the settings overlay', [
    props({ openSettingsSignal: 1 }),
  ]),
  base('overlays: bumping openReportSignal opens the bug-report modal', [
    props({ openReportSignal: 1 }),
  ]),
  base(
    'overlays: bumping openShareSignal opens the share-link modal',
    [props({ openShareSignal: 1 })],
    {
      http: [SHARES_EMPTY],
    },
  ),
  base(
    'overlays: an openShareSignal bump below the share capability opens no share modal',
    [props({ openShareSignal: 1 })],
    {
      props: { canShare: false },
    },
  ),
]
