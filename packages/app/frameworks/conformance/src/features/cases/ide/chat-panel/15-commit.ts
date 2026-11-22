/**
 * `ChatPanel` cases: Commit, revert and git status. Every case name starts with `commit: `.
 *
 * The changed-files strip above the composer and the commit cards in the timeline: the
 * git-status fetch that feeds the strip (on mount, on a turn boundary, debounced after the
 * parent's file-mutation signal, on returning to the workspace, on the periodic refresh —
 * and the stale answer that arrives last and must not win), the commit action the strip
 * offers (disabled while the agent works, its running card, the success that clears the
 * strip and adds the card, the three refusals a clean, busy or failed tree gets, the
 * network failure that marks the card and re-arms the action), the `/commit` composer
 * path, a changed-file row opening its diff, the cards a persisted commit record renders
 * (an editor's and a viewer's), and the co-author trailer the card's label strips while
 * keeping the subject and body.
 *
 * The card's own revert control and the strip's per-file revert control are not covered
 * here: rendering either nests a `role="button"` span inside a real `<button>`
 * (`CommitCardItem`'s header and the pending-file row), which fails the kit's
 * `nested-interactive` rule; recording them would commit goldens the kit's own axe run
 * rejects. The fix is React markup (a row that is not a `<button>`, or the affordance as
 * a sibling of it); these cases record it once that fix lands.
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
  emit,
  key,
  MODELS,
  NOW,
  props,
  SEND,
  START,
  type,
} from './fixtures.js'

/** The composer's send a case starts from. */
const SEND_IT = [type('Build the header'), click(SEND)]

/** The changed-files strip. */
const TOGGLE = '[data-mol-id="chat-commit-toggle"]'
/** The strip's commit action. */
const BUTTON = '[data-mol-id="chat-commit-button"]'
/** A changed-file row inside the open strip. */
const FILE_ROW = '[data-mol-id="chat-commit-bar-detail"] button'
/** The commit card's label (the only `code` element a fresh conversation renders). */
const CARD_LABEL = 'code'

/** One pending changed file, as the git-status answer reports it. */
interface ChangedFile {
  /** Its workspace-relative path. */
  path: string
  /** The git status letter (`M`, `A`, …). */
  status: string
  /** Added lines, when the server reports them. */
  additions?: number
  /** Deleted lines, when the server reports them. */
  deletions?: number
}

/** Two changed files, one modified and one added. */
const TWO_FILES: ChangedFile[] = [
  { path: 'src/Login.tsx', status: 'M', additions: 3, deletions: 1 },
  { path: 'src/Footer.tsx', status: 'A', additions: 40 },
]

/** The single modified file the one-file cases script. */
const ONE_FILE: ChangedFile[] = [{ path: 'src/Login.tsx', status: 'M', additions: 3, deletions: 1 }]

/**
 * A `GET git-status` answer.
 *
 * @param files - The changed files it reports.
 * @param defer - Whether it stays pending until an `http` step answers it.
 * @returns The scripted request.
 */
const gitStatus = (files: ChangedFile[], defer = false): HttpScript => ({
  method: 'GET',
  url: '/projects/p1/git-status',
  data: { files },
  ...(defer ? { defer: true } : {}),
})

/**
 * A git-status answer for a project other than the baseline one.
 *
 * @param project - The project id.
 * @param files - The changed files it reports.
 * @returns The scripted request.
 */
const gitStatusAt = (project: string, files: ChangedFile[]): HttpScript => ({
  method: 'GET',
  url: `/projects/${project}/git-status`,
  data: { files },
})

/**
 * The mount requests a switch to project `p2` makes.
 *
 * @param files - The changed files the new project's git status reports.
 * @returns The scripted requests.
 */
const projectTwoMount = (files: ChangedFile[]): HttpScript[] => [
  { method: 'GET', url: '/ai/models?projectId=p2', data: MODELS },
  { method: 'GET', url: '/projects/p2', data: { settings: {} } },
  gitStatusAt('p2', files),
  { method: 'GET', url: '/projects/p2/files-list', data: { files: [] } },
  { method: 'GET', url: '/projects/p2/conversations', data: { conversations: [] } },
]

/** The commit POST, held back so the strip's running state is visible before the answer. */
const COMMIT_POST: HttpScript = { method: 'POST', url: '/projects/p1/commit', defer: true }

/**
 * The project settings a case that drives the strip's own commit button scripts: they
 * turn the default auto-commit cadence off, so the strip offers the plain commit button
 * instead of the green countdown badge (that badge is the auto-commit area's surface).
 */
const AUTO_COMMIT_OFF = {
  method: 'GET',
  url: '/projects/p1',
  data: { settings: { autoCommitSeconds: 0 } },
}

/**
 * The `POST /commit` answer for a commit that landed. No `hash`: the card a hashless
 * commit renders (the response type leaves the field out) is what these cases record.
 *
 * @param message - The commit message it reports.
 * @param files - The paths it reports committed.
 * @returns The response body.
 */
const commitOk = (
  message: string,
  files: string[] = ['src/Login.tsx'],
): Record<string, unknown> => ({
  ok: true,
  committed: true,
  message,
  files,
})

/**
 * The `POST /commit` answer for a commit the server did not make.
 *
 * @param message - Its refusal.
 * @returns The response body.
 */
const commitRefused = (message: string): Record<string, unknown> => ({
  ok: true,
  committed: false,
  message,
})

/** The user message a conversation starts with. */
const INTRO: ChatMessage = { id: 'u1', role: 'user', content: 'hi', timestamp: NOW + 1 }

/** The commit message the server returns, with its co-author trailer. */
const SUBJECT = 'feat: add login page'
const TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
/** The full message a real commit carries (subject + trailer). */
const FULL_MESSAGE = `${SUBJECT}\n\n${TRAILER}`
/** The hash the commit endpoint returns. */
const HASH = 'abc1234'

/**
 * A persisted commit record, as a history load brings one in.
 *
 * @param hash - The record's hash (a viewer's card carries one, an editor's renders the
 *   revert control the kit cannot record — see the module comment).
 * @returns The message.
 */
const commitRecord = (hash?: string): ChatMessage => ({
  id: 'commit-1',
  role: 'system',
  content: FULL_MESSAGE,
  timestamp: NOW + 5,
  commitRecord: { message: FULL_MESSAGE, files: ['src/Login.tsx'], ...(hash ? { hash } : {}) },
})

/**
 * Runs one slash command the way the menu does: type it, Enter executes the filtered row.
 *
 * @param command - The command text.
 * @returns The steps.
 */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/**
 * A {@link base} case whose project settings turn the default auto-commit cadence off,
 * so the strip offers the plain commit button the case drives.
 *
 * @param name - The case name.
 * @param interactions - Its steps.
 * @param extra - What the case adds to the baseline.
 * @returns The case.
 */
const baseButton = (
  name: string,
  interactions: Interaction[],
  extra: BaseExtra = {},
): FeatureCase =>
  base(name, interactions, { ...extra, http: [AUTO_COMMIT_OFF, ...(extra.http ?? [])] })

/**
 * A case with one more recorded host callback than the shared baseline lists.
 *
 * @param name - The case name.
 * @param extra - What the callback the case adds needs: the listed callbacks, the steps
 *   and what the case adds to the baseline.
 * @returns The case.
 */
const withCallbacks = (
  name: string,
  { add, interactions = [], ...extra }: { add: string[]; interactions?: Interaction[] } & BaseExtra,
): FeatureCase => ({ ...base(name, interactions, extra), callbacks: [...CALLBACKS, ...add] })

/** Commit, revert and git status. */
export const commitCases: FeatureCase[] = [
  // ── The changed-files strip ─────────────────────────────────────────────────
  base('commit: changed files fetch in and the strip offers the commit', [], {
    http: [gitStatus(TWO_FILES)],
  }),
  base(
    'commit: expanding the strip lists each changed file with its line counts',
    [click(TOGGLE)],
    {
      http: [gitStatus(TWO_FILES)],
    },
  ),
  base('commit: a clean tree fetches in with no strip at all'),
  base('commit: a failed git-status fetch leaves the strip out', [], {
    http: [{ method: 'GET', url: '/projects/p1/git-status', status: 500 }],
  }),
  baseButton(
    'commit: the commit action is disabled while the agent works',
    [...SEND_IT, emit(START('a1')), adv(50), click(BUTTON)],
    {
      http: [gitStatus(TWO_FILES), gitStatus(TWO_FILES)],
    },
  ),
  base(
    'commit: a file-mutation signal refetches git status once its debounce settles',
    [props({ gitStatusTick: 1 }), adv(500)],
    { http: [gitStatus(TWO_FILES), gitStatus(ONE_FILE)] },
  ),
  base(
    'commit: returning to the workspace refetches git status',
    [{ type: 'event', selector: 'window', event: 'focus' }],
    { http: [gitStatus(ONE_FILE), gitStatus([])] },
  ),
  base('commit: the periodic refresh settles files committed elsewhere', [adv(45_000)], {
    http: [gitStatus(ONE_FILE), gitStatus([])],
  }),
  base(
    'commit: a stale git-status answer that lands last changes nothing',
    [
      { type: 'event', selector: 'window', event: 'focus' },
      { type: 'event', selector: 'window', event: 'focus' },
      { type: 'http', method: 'GET', url: '/projects/p1/git-status', data: { files: ONE_FILE } },
    ],
    { http: [gitStatus(ONE_FILE), gitStatus(ONE_FILE, true), gitStatus([])] },
  ),
  baseButton(
    'commit: switching projects drops the commit card and re-reads git status',
    [click(BUTTON), props({ projectId: 'p2' })],
    {
      http: [
        gitStatus(ONE_FILE),
        { method: 'POST', url: '/projects/p1/commit', data: commitOk(FULL_MESSAGE) },
        ...projectTwoMount(TWO_FILES),
      ],
    },
  ),

  // ── The commit action ───────────────────────────────────────────────────────
  baseButton(
    'commit: clicking commit shows the running card and clears the strip on success',
    [
      click(BUTTON),
      { type: 'http', method: 'POST', url: '/projects/p1/commit', data: commitOk(FULL_MESSAGE) },
    ],
    { http: [gitStatus(ONE_FILE), COMMIT_POST] },
  ),
  baseButton(
    'commit: the card keeps the commit body but drops the co-author trailer',
    [
      click(BUTTON),
      {
        type: 'http',
        method: 'POST',
        url: '/projects/p1/commit',
        data: commitOk(`${SUBJECT}\n\nWires the OAuth callback.\n\n${TRAILER}`),
      },
    ],
    { http: [gitStatus(ONE_FILE), COMMIT_POST] },
  ),
  baseButton(
    'commit: the card discloses the files its commit contains',
    [click(BUTTON), click(CARD_LABEL)],
    {
      http: [
        gitStatus(TWO_FILES),
        {
          method: 'POST',
          url: '/projects/p1/commit',
          data: commitOk(FULL_MESSAGE, ['src/Login.tsx', 'src/Footer.tsx']),
        },
      ],
    },
  ),
  baseButton('commit: a clean tree answers no changes and refetches to nothing', [click(BUTTON)], {
    http: [
      gitStatus(ONE_FILE),
      { method: 'POST', url: '/projects/p1/commit', data: commitRefused('No changes to commit') },
      gitStatus([]),
    ],
  }),
  baseButton(
    'commit: a build in progress refuses the commit and keeps the files',
    [click(BUTTON)],
    {
      http: [
        gitStatus(ONE_FILE),
        {
          method: 'POST',
          url: '/projects/p1/commit',
          data: commitRefused('A build is in progress'),
        },
        gitStatus(ONE_FILE),
      ],
    },
  ),
  baseButton('commit: an unrecognized refusal shows the generic failure notice', [click(BUTTON)], {
    http: [
      gitStatus(ONE_FILE),
      { method: 'POST', url: '/projects/p1/commit', data: commitRefused('The sandbox refused') },
      gitStatus(ONE_FILE),
    ],
  }),
  baseButton(
    'commit: a failed commit request marks its card failed and re-arms the action',
    [
      click(BUTTON),
      {
        type: 'http',
        method: 'POST',
        url: '/projects/p1/commit',
        networkError: 'The sandbox is unreachable',
      },
    ],
    { http: [gitStatus(ONE_FILE), COMMIT_POST] },
  ),
  baseButton('commit: /commit in the composer commits without sending a turn', run('/commit'), {
    http: [
      gitStatus(ONE_FILE),
      { method: 'POST', url: '/projects/p1/commit', data: commitOk(FULL_MESSAGE) },
    ],
  }),

  // ── The cards a persisted commit record renders ─────────────────────────────
  base('commit: a persisted commit record renders as its card', [], {
    context: { areas: { chat: { history: [[INTRO, commitRecord()]] } } },
  }),
  base('commit: a read-only viewer sees the commit card without its revert control', [], {
    props: { canEdit: false },
    context: { areas: { chat: { history: [[INTRO, commitRecord(HASH)]] } } },
  }),
  withCallbacks('commit: clicking a changed file opens its diff', {
    add: ['onFileDiff'],
    interactions: [click(TOGGLE), click(FILE_ROW)],
    http: [gitStatus(TWO_FILES)],
  }),
]
