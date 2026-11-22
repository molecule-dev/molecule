/**
 * `ChatPanel` cases: Toggle and display commands. Every case name starts with
 * `toggle commands: `.
 *
 * The slash-command menu a typed `/` opens (the merged shared ∪ host registry,
 * its typed filtering, its row click and keyboard dispatch, and the live
 * `(on)` / `(off)` / `(v…)` state labels on its rows), the toggles —
 * `/autofix` and `/autoapprove` persisting a project setting through PATCH
 * with their failure paths, and the per-device `/timestamps` preference — and
 * the display commands: `/clear`, `/help`, `/version`, `/settings`, the
 * prefills (`/maxloops`, `/explain`), `/lint`'s send, the `/report` and `/bug`
 * modal, `/share` and its host gate, the host-provided commands (joining the
 * menu, overriding a shared row by id, taking the prefill path, hiding with
 * team messaging off), and the viewer's filtered menu plus the read-only note
 * a write command earns.
 *
 * @module
 */

import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  DONE,
  emit,
  finish,
  key,
  SEND,
  START,
  TEAM_COMMAND,
  TEXT,
  type,
} from './fixtures.js'

/** The composer's send a display-command case starts from (one turn, complete). */
const SEND_TURN = [
  type('Make it so'),
  click(SEND),
  emit(START('a1')),
  emit(TEXT('On it.')),
  adv(50),
  emit(DONE),
  finish,
]

/** The slash-command popup (bottom-anchored, topmost) — 06's popup selector. */
const POPUP = 'div[style*="z-index: 100"]'

/**
 * The first command row of the popup: popup → scroll area → category group →
 * button. A typed filter that leaves one row makes this exactly that row.
 */
const MENU_ROW = `${POPUP} > div > div > button`

/** The settings card's Edit button on the auto-fix row. */
const EDIT_AUTOFIX = '[data-mol-id="setting-edit-autoFix"]'

/** A host-provided command that adds to the shared registry (no shared id). */
const HOST_COMMAND = {
  id: 'deploy',
  label: '/deploy',
  description: 'Ship this project to production',
  category: 'collaborate',
  viewerSafe: false,
}

/**
 * A host command overriding the shared `/clear` by id (the host wins: the
 * shared row leaves the menu and the host's own label sits in its place).
 */
const CLEAR_OVERRIDE = {
  id: 'clear',
  label: '/clear-all',
  description: 'Wipe this transcript for everyone',
  category: 'context',
}

/** A mid-turn `context_usage` sample, so `/clear` has a ring to drop. */
const USAGE_EVENT = {
  type: 'context_usage',
  usage: {
    requestId: 'r9',
    at: '2023-11-14T22:13:21.000Z',
    inputTokens: 5_000,
    contextWindow: 100_000,
    backgroundCompactAtTokens: 10_000,
  },
}

/** The scripted answer a settings PATCH (`/autofix`, `/autoapprove`) gets. */
const SETTINGS_PATCHED = { method: 'PATCH', url: '/projects/p1', data: { settings: {} } }

/** The scripted answer of a settings PATCH the server refuses. */
const SETTINGS_PATCH_REFUSED = { method: 'PATCH', url: '/projects/p1', status: 500 }

/** The share-link list an opened share modal reads (none yet). */
const SHARES_EMPTY = { method: 'GET', url: '/projects/p1/shares', data: { data: [] } }

/**
 * Hovers a menu row (the pointer crossing it), as the mouse does.
 *
 * @param selector - The row.
 * @returns The step.
 */
const hover = (selector: string): Interaction => ({ type: 'mouseenter', selector })

/**
 * Moves the pointer off a menu row.
 *
 * @param selector - The row.
 * @returns The step.
 */
const unhover = (selector: string): Interaction => ({ type: 'mouseleave', selector })

/** Toggle and display commands. */
export const toggleCommandsCases: FeatureCase[] = [
  // ── The command menu ────────────────────────────────────────────────────────
  base('toggle commands: typing a slash opens the command menu grouped by category', [type('/')]),
  base('toggle commands: the menu narrows to the commands matching the typed text', [
    type('/auto'),
  ]),
  base(
    'toggle commands: clicking a menu row runs the command',
    [type('/autofix'), click(MENU_ROW)],
    {
      http: [SETTINGS_PATCHED],
    },
  ),
  base('toggle commands: hovering a menu row highlights it until the pointer leaves', [
    type('/autofix'),
    hover(MENU_ROW),
    unhover(MENU_ROW),
  ]),
  base(
    'toggle commands: arrow keys highlight a row and Enter runs it',
    [type('/autof'), key('ArrowDown'), key('Enter')],
    {
      http: [SETTINGS_PATCHED],
    },
  ),
  base(
    'toggle commands: the /autofix row labels the live state in the menu',
    [type('/autofix'), key('Enter'), type('/autofix')],
    {
      http: [SETTINGS_PATCHED],
    },
  ),
  base('toggle commands: the /version row labels the app version in the menu', [type('/ver')], {
    props: { version: '' },
  }),

  // ── The /autofix toggle ─────────────────────────────────────────────────────
  base(
    'toggle commands: /autofix turns auto-fix off and persists the setting',
    [type('/autofix'), key('Enter')],
    {
      http: [{ ...SETTINGS_PATCHED, data: { settings: { autoFix: false } } }],
    },
  ),
  base(
    'toggle commands: /autofix turns auto-fix on when the project had it off',
    [type('/autofix'), key('Enter')],
    {
      http: [
        { method: 'GET', url: '/projects/p1', data: { settings: { autoFix: false } } },
        { ...SETTINGS_PATCHED, data: { settings: { autoFix: true } } },
      ],
    },
  ),
  base(
    'toggle commands: a refused /autofix toggle says so and leaves it on',
    [type('/autofix'), key('Enter'), type('/autofix')],
    {
      http: [SETTINGS_PATCH_REFUSED],
    },
  ),

  // ── The /autoapprove toggle ─────────────────────────────────────────────────
  base(
    'toggle commands: /autoapprove turns auto-approve on',
    [type('/autoapprove'), key('Enter')],
    {
      http: [{ ...SETTINGS_PATCHED, data: { settings: { autoApproveCommands: true } } }],
    },
  ),
  base(
    'toggle commands: /autoapprove turns auto-approve off when the project had it on',
    [type('/autoapprove'), key('Enter')],
    {
      http: [
        { method: 'GET', url: '/projects/p1', data: { settings: { autoApproveCommands: true } } },
        { ...SETTINGS_PATCHED, data: { settings: { autoApproveCommands: false } } },
      ],
    },
  ),
  base(
    'toggle commands: a refused /autoapprove toggle says so and leaves it off',
    [type('/autoapprove'), key('Enter')],
    {
      http: [SETTINGS_PATCH_REFUSED],
    },
  ),

  // ── The /timestamps preference ──────────────────────────────────────────────
  base(
    'toggle commands: /timestamps shows message times and persists the choice',
    [...SEND_TURN, type('/timestamps'), key('Enter')],
    {
      context: { window: { localStorage: {} } },
    },
  ),
  base(
    'toggle commands: /timestamps off hides the times again',
    [...SEND_TURN, type('/timestamps off'), key('Enter')],
    {
      context: { window: { localStorage: { mol_chat_show_timestamps: 'true' } } },
    },
  ),
  base('toggle commands: an invalid /timestamps argument shows the usage line', [
    type('/timestamps banana'),
    key('Enter'),
  ]),

  // ── The display commands ────────────────────────────────────────────────────
  base('toggle commands: /clear empties the log, drops the ring and clears the composer', [
    type('Make it so'),
    click(SEND),
    emit(START('a1')),
    emit(TEXT('On it.')),
    emit(USAGE_EVENT),
    adv(50),
    emit(DONE),
    finish,
    type('/clear'),
    key('Enter'),
  ]),
  base('toggle commands: /help opens the workflow guide card', [type('/help'), key('Enter')]),
  base(
    'toggle commands: /version prints the version the host passed',
    [type('/version'), key('Enter')],
    {
      props: { version: '2.7.9' },
    },
  ),
  base('toggle commands: /settings opens the settings and command reference', [
    type('/settings'),
    key('Enter'),
  ]),
  base(
    'toggle commands: running a command from the settings card closes the overlay',
    [type('/settings'), key('Enter'), click(EDIT_AUTOFIX)],
    {
      http: [{ ...SETTINGS_PATCHED, data: { settings: { autoFix: false } } }],
    },
  ),
  base('toggle commands: /maxloops prefills the composer for the count', [
    type('/maxloops'),
    key('Enter'),
  ]),
  base('toggle commands: /explain prefills the composer for the topic', [
    type('/explain'),
    key('Enter'),
  ]),
  base('toggle commands: /lint sends the lint turn to the agent', [type('/lint'), key('Enter')]),
  base('toggle commands: /report opens the bug-report modal', [type('/report'), key('Enter')]),
  base('toggle commands: /bug opens the same modal through its alias', [
    type('/bug'),
    key('Enter'),
  ]),
  base('toggle commands: /share opens the share-link modal', [type('/share'), key('Enter')], {
    http: [SHARES_EMPTY],
  }),
  base(
    'toggle commands: a host-gated share capability leaves /share out of the menu',
    [type('/share')],
    {
      props: { canShare: false },
    },
  ),

  // ── Host-provided commands ──────────────────────────────────────────────────
  base('toggle commands: a host command joins the menu under its own category', [type('/dep')], {
    props: { extraCommands: [HOST_COMMAND] },
  }),
  base(
    'toggle commands: a host override drops the shared /clear row for the host label',
    [type('/clear-')],
    {
      props: { extraCommands: [CLEAR_OVERRIDE] },
    },
  ),
  base(
    'toggle commands: an overridden host command takes the host path, not the built-in',
    [...SEND_TURN, type('/clear-all'), key('Enter')],
    {
      props: { extraCommands: [CLEAR_OVERRIDE] },
    },
  ),
  base(
    'toggle commands: executing a host command prefills the composer with it',
    [type('/teamsay'), key('Enter')],
    {
      props: { extraCommands: [TEAM_COMMAND] },
    },
  ),
  base(
    'toggle commands: team messaging off hides the side-channel command from the menu',
    [type('/teamsay')],
    {
      props: { extraCommands: [TEAM_COMMAND], canSendTeamMessages: false },
    },
  ),

  // ── The read-only viewer ────────────────────────────────────────────────────
  base('toggle commands: a viewer’s menu lists only viewer-safe commands', [type('/')], {
    props: { canEdit: false },
  }),
  base(
    'toggle commands: a viewer running a write command gets the read-only note',
    [type('/settings'), key('Enter'), click(EDIT_AUTOFIX)],
    {
      props: { canEdit: false },
    },
  ),
]
