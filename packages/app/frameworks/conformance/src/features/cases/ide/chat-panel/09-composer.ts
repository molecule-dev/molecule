/**
 * `ChatPanel` cases: Composer parsing and keyboard navigation. Every case name starts with
 * `composer: `.
 *
 * What typing in the composer parses into and what the keyboard drives: the draft session
 * storage keeps across a reload (restored, persisted debounced, dropped) and the host's
 * prefill, the `@` file reference picker (its ranking, its fifteen-row cap, keyboard
 * attaching), the `/` command menu (typed filtering, the viewer's safe-only list, the
 * share gate, the slash button's list-everything toggle whose bare Enter submits the
 * text), the `/model` and `/effort` pickers (mode scoping, typed filtering, the sort
 * controls, the deprecated "Older models" partition and its auto-expansion), and the
 * keyboard over every popup — arrows with wrap-around, Enter and Tab applying, a locked
 * model row refused, the manage-custom-models row handing the mode to the host, an
 * exactly-typed effort level beating the first filtered row, Escape closing each popup
 * and stopping a live stream, typing closing the button-driven pickers, and an IME
 * composition Enter that never sends.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  click,
  emit,
  key,
  model,
  SEND,
  START,
  TA,
  TEAM_COMMAND,
  TEXT,
  type,
} from './fixtures.js'

/** The composer container (clicking it moves focus into the textarea). */
const COMPOSER = '[data-mol-id="chat-composer"]'

/** The composer's reference-a-file button. */
const MENTION_BUTTON = '[title="Reference a file"]'

/** The composer's slash-commands button. */
const SLASH_BUTTON = '[title="Slash commands"]'

/** The model picker's sort-column select. */
const SORT_COLUMN = '[data-mol-id="model-sort-column"]'

/** The model picker's sort-direction toggle. */
const SORT_DIRECTION = '[data-mol-id="model-sort-direction"]'

/** The persisted draft key (`ChatPanel` keys it by project). */
const DRAFT_KEY = 'mol-chat-draft:p1'

/** A `keydown` the way an IME delivers Enter: composing, with the legacy 229 code. */
const COMPOSING_ENTER: Interaction = {
  type: 'keydown',
  selector: TA,
  key: 'Enter',
  isComposing: true,
  keyCode: 229,
}

/** The project files a scripted files-list answers with. */
const FILES = ['README.md', 'src/app.ts', 'src/util.ts', 'styles/main.css']

/** Sixteen-plus entries, so the picker's fifteen-row cap is visible. */
const MANY_FILES = Array.from({ length: 17 }, (_, i) => `file${String(i + 1).padStart(2, '0')}.txt`)

/**
 * The files-list answers a file-picker case scripts: the mount's skills seed reads the
 * first (empty) list, then the `@` keystroke's own fetch reads the project's files.
 *
 * @param files - The files the `@` fetch answers with.
 * @returns The scripted requests.
 */
const FILE_HTTP = (files: string[]): HttpScript[] => [
  { method: 'GET', url: '/projects/p1/files-list', data: { files: [] } },
  { method: 'GET', url: '/projects/p1/files-list', data: { files } },
]

/**
 * A catalog `GET /ai/models` answer replacing the base one (consumed at mount, since it
 * is scripted first).
 *
 * @param data - The catalog body.
 * @returns The scripted request.
 */
const CATALOG_HTTP = (data: unknown): HttpScript => ({
  method: 'GET',
  url: '/ai/models?projectId=p1',
  data,
})

/** The settings write a model or effort choice persists (the base scripts none). */
const SETTINGS_PATCH: HttpScript = { method: 'PATCH', url: '/projects/p1', data: {} }

/** Two models with different context windows, for the sort-by-column case. */
const MODELS_CONTEXT = {
  models: [
    model('m-free', 'deepseek', 'M Free', { freeTier: true, contextWindow: 250_000 }),
    model('m-pro', 'anthropic', 'M Pro', { contextWindow: 100_000 }),
  ],
  defaults: { plan: 'm-free', execute: 'm-free', commit: 'm-free', compact: 'm-free' },
}

/**
 * One model whose level list is deliberately NOT ascending (`xhigh` before `high`), so
 * "Enter applies the exactly-typed level" is distinguishable from "Enter applies the
 * first filtered row": `/effort high` filters to `[xhigh, high]` and must still apply
 * `high`.
 */
const MODELS_UNORDERED_LEVELS = {
  models: [
    model('m-x', 'anthropic', 'M X', {
      freeTier: true,
      supportedEffortLevels: ['low', 'xhigh', 'high'],
      defaultEffortLevel: 'low',
    }),
  ],
  defaults: { plan: 'm-x', execute: 'm-x', commit: 'm-x', compact: 'm-x' },
}

/** A catalog with one superseded model in the picker's "Older models" partition. */
const MODELS_DEPRECATED = {
  models: [
    model('m-free', 'deepseek', 'M Free', { freeTier: true }),
    // Deprecated before the case clock (2023-11-14), so the partition puts it in
    // the picker's "Older models" section.
    model('m-old', 'openai', 'M Old', { deprecatedAt: '2023-01-01' }),
  ],
  defaults: { plan: 'm-free', execute: 'm-free', commit: 'm-free', compact: 'm-free' },
}

/** A dictation engine catalog, so the `/mic` picker renders its rows. */
const VOICE_ENGINES = {
  engines: [
    { id: 'native', label: 'Browser native', kind: 'native', accuracy: 2, languages: 'all' },
  ],
} as const

/** Opens the notification-sounds picker the way a user does: the /sounds command. */
const OPEN_SOUNDS = [type('/sounds'), key('Enter')]

/** Opens the dictation-engine picker the way a user does: the /mic command. */
const OPEN_MIC = [type('/mic'), key('Enter')]

/** Composer parsing and keyboard navigation. */
export const composerCases: FeatureCase[] = [
  // ── The draft session storage keeps ────────────────────────────────────────
  base('composer: a draft saved in session storage restores into the composer on mount', [], {
    context: { window: { sessionStorage: { [DRAFT_KEY]: 'Half a plan from yesterday' } } },
  }),
  base(
    'composer: typing persists the draft to session storage after half a second',
    [type('Build the header first'), adv(600)],
    {
      context: { window: { sessionStorage: {} } },
    },
  ),
  base(
    'composer: retyping within half a second keeps the draft out of session storage',
    [type('Half a plan'), adv(400), type('Half a plan for the header'), adv(200)],
    {
      context: { window: { sessionStorage: {} } },
    },
  ),
  base(
    'composer: clearing the composer drops the persisted draft',
    [type('Draft to drop'), adv(600), type(''), adv(600)],
    {
      context: { window: { sessionStorage: {} } },
    },
  ),
  base('composer: a host-provided initial value prefills the composer and lights send', [], {
    props: { initialInputValue: 'Build the header first' },
  }),
  base(
    "composer: a viewer's bare /teamsay prefill does not light send",
    [type('/teamsay checking in')],
    {
      props: { canEdit: false },
    },
  ),
  base('composer: clicking the composer body focuses the input', [
    { type: 'blur', selector: TA },
    click(COMPOSER),
  ]),
  base('composer: an IME composition Enter never sends', [
    type('Build it now'),
    COMPOSING_ENTER,
    key('Enter'),
  ]),

  // ── The @ file reference picker ────────────────────────────────────────────
  base('composer: typing @ opens the file picker over the project files', [type('@')], {
    http: FILE_HTTP(FILES),
  }),
  base(
    'composer: typing @ over an open command menu switches to the file picker',
    [type('/'), type('@')],
    {
      http: FILE_HTTP(FILES),
    },
  ),
  base('composer: the file picker ranks the active file and open tabs first', [type('@')], {
    props: { activeFile: '/workspace/src/app.ts', openTabs: ['/workspace/src/util.ts'] },
    http: FILE_HTTP(FILES),
  }),
  base('composer: the file picker narrows as the query grows', [type('@'), type('@ut')], {
    http: FILE_HTTP(FILES),
  }),
  base('composer: the file picker lists at most fifteen entries', [type('@')], {
    http: FILE_HTTP(MANY_FILES),
  }),
  base(
    'composer: Enter attaches the highlighted file and lifts the @ query out',
    [type('@ut'), key('ArrowDown'), key('Enter')],
    {
      http: FILE_HTTP(FILES),
    },
  ),
  base(
    'composer: the file picker wraps from no selection to its last row and Tab attaches it',
    [type('@'), key('ArrowUp'), key('Tab')],
    {
      http: FILE_HTTP(FILES),
    },
  ),
  base(
    'composer: the reference-file button opens the picker with an @ inserted',
    [click(MENTION_BUTTON)],
    {
      http: FILE_HTTP(FILES),
    },
  ),

  // ── The / command menu ─────────────────────────────────────────────────────
  base('composer: the command menu narrows as the user keeps typing and a space closes it', [
    type('/'),
    type('/cl'),
    type('/cl '),
  ]),
  base("composer: a viewer's command menu lists only what a viewer may run", [type('/')], {
    props: { canEdit: false, extraCommands: [TEAM_COMMAND] },
  }),
  base('composer: a host without the share capability drops the /share row', [type('/')], {
    props: { canShare: false },
  }),
  base('composer: the slash button lists every command over existing text', [
    type('How do I deploy this?'),
    click(SLASH_BUTTON),
  ]),
  base('composer: Enter over a slash-button menu submits the typed text as a message', [
    type('How do I deploy this?'),
    click(SLASH_BUTTON),
    key('Enter'),
  ]),
  base('composer: clicking the slash button again closes the menu and keeps the text', [
    type('How do I deploy this?'),
    click(SLASH_BUTTON),
    click(SLASH_BUTTON),
  ]),

  // ── The /model and /effort pickers a keystroke opens ───────────────────────
  base('composer: /model opens the picker scoped to the live conversation mode', [type('/model ')]),
  base('composer: /model --plan scopes the open picker to plan mode', [type('/model --plan ')]),
  base('composer: the model picker narrows as the user keeps typing', [
    type('/model '),
    type('/model pro'),
  ]),
  base("composer: /effort opens the level picker for the mode's model", [type('/effort ')]),
  base('composer: /effort ? closes the picker and keeps the status path', [
    type('/effort high'),
    type('/effort ?'),
  ]),

  // ── Typing closes the button-driven pickers ────────────────────────────────
  base('composer: typing closes the sounds picker', [...OPEN_SOUNDS, type('Also add a footer')]),
  // Sounds are per-device; a project that still holds the old project-level value seeds a device
  // with no local preference, keeping only known events with known modes.
  base(
    'composer: legacy project sounds seed the sounds picker, keeping only known modes',
    OPEN_SOUNDS,
    {
      http: [
        {
          method: 'GET',
          url: '/projects/p1',
          data: { settings: { sounds: { done: 'always', message: 42, bogus: 'always' } } },
        },
      ],
    },
  ),
  base(
    'composer: typing closes the dictation-engine picker',
    [...OPEN_MIC, type('Also add a footer')],
    {
      context: { areas: { voice: VOICE_ENGINES } },
    },
  ),

  // ── Escape ─────────────────────────────────────────────────────────────────
  base('composer: Escape closes the command menu', [type('/'), key('Escape')]),
  base('composer: Escape closes the file picker', [type('@'), key('Escape')], {
    http: FILE_HTTP(FILES),
  }),
  base('composer: Escape closes the model picker', [type('/model '), key('Escape')]),
  base('composer: Escape closes the effort picker', [type('/effort '), key('Escape')]),
  base('composer: Escape closes the sounds picker', [...OPEN_SOUNDS, key('Escape')]),
  base('composer: Escape closes the dictation-engine picker', [...OPEN_MIC, key('Escape')], {
    context: { areas: { voice: VOICE_ENGINES } },
  }),
  base('composer: Escape closes the settings overlay', [
    type('/settings'),
    key('Enter'),
    key('Escape'),
  ]),
  base('composer: Escape mid-stream stops the turn', [
    type('Draw the login page'),
    click(SEND),
    emit(START('a1')),
    emit(TEXT('Starting the login page')),
    adv(50),
    key('Escape'),
  ]),

  // ── The keyboard over the command menu ─────────────────────────────────────
  base('composer: the command menu wraps from its last row back to the first', [
    type('/m'),
    key('ArrowUp'),
    key('ArrowDown'),
    key('Enter'),
  ]),
  base('composer: arrow keys walk the menu and Enter runs the highlighted command', [
    type('/m'),
    key('ArrowDown'),
    key('ArrowDown'),
    key('Enter'),
  ]),

  // ── The keyboard over the model picker ─────────────────────────────────────
  base('composer: Enter on a locked model row is refused and the picker stays open', [
    type('/model '),
    key('ArrowDown'),
    key('ArrowDown'),
    key('Enter'),
  ]),
  base(
    'composer: Enter picks the highlighted model and persists the choice',
    [type('/model '), key('ArrowDown'), key('Enter')],
    {
      http: [SETTINGS_PATCH],
    },
  ),
  base(
    'composer: the manage-custom-models row is reached from the bottom and hands the mode to the host',
    [type('/model '), key('ArrowUp'), key('Enter')],
    { props: { onManageCustomModels: { $callback: 'onManageCustomModels' } } },
  ),

  // ── The keyboard over the effort picker ────────────────────────────────────
  base(
    'composer: the effort picker wraps to its last row and Tab applies it',
    [type('/effort '), key('ArrowUp'), key('Tab')],
    {
      http: [SETTINGS_PATCH],
    },
  ),
  base(
    'composer: Enter with an exactly typed level applies it, not the first filtered row',
    [type('/effort high'), key('Enter')],
    {
      http: [CATALOG_HTTP(MODELS_UNORDERED_LEVELS), SETTINGS_PATCH],
    },
  ),
  base(
    'composer: the sounds picker wraps from no selection to its last event row',
    [...OPEN_SOUNDS, key('ArrowUp'), key('Enter')],
    {
      context: { window: { localStorage: {} } },
    },
  ),

  // ── The model picker's derived rows ────────────────────────────────────────
  base(
    'composer: sorting by context puts the smaller window first',
    [type('/model '), { type: 'input', selector: SORT_COLUMN, value: 'context' }],
    {
      http: [CATALOG_HTTP(MODELS_CONTEXT)],
    },
  ),
  base('composer: the sort direction button reverses the model rows', [
    type('/model '),
    click(SORT_DIRECTION),
  ]),
  base(
    'composer: a deprecated saved model auto-expands the older models section',
    [type('/model ')],
    {
      props: { isPro: true },
      http: [
        CATALOG_HTTP(MODELS_DEPRECATED),
        { method: 'GET', url: '/projects/p1', data: { settings: { chatModel: 'm-old' } } },
      ],
    },
  ),
  base('composer: a query that matches only older models expands them too', [type('/model ol')], {
    http: [CATALOG_HTTP(MODELS_DEPRECATED)],
  }),
]
