/**
 * `ChatPanel` cases: Effort, max loops and fast mode. Every case name starts with `effort: `.
 *
 * Three composer surfaces persist project settings through the same PATCH route, each
 * answering in the timeline as a local system card:
 *
 * - `/effort` — reasoning effort is per mode (`settings.effortByMode`, the legacy single
 *   `effortLevel` the fallback) and shown in the target mode's model's OWN native levels.
 *   A bare `/effort` (or a bare `--plan`/`--execute` flag) opens the selectable level
 *   picker; `?` prints the textual status for both modes; a level sets the target mode.
 *   An unknown level, a second argument, and a model with a single reasoning mode each
 *   answer with their own card instead of persisting.
 * - `/maxloops <n>` — sets `settings.maxToolLoops` locally; a refusal at the tier limit
 *   renders the backend's message with the host-built remedy buttons, any other failure
 *   the generic failure card. The command menu's `/maxloops` row shows the live value.
 * - fast mode (⚡) — a composer toggle the live mode's model must declare fast pricing
 *   for; toggling persists per conversation on the chat-mode route, and a failed persist
 *   reverts the toggle.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { base, click, CONV_HTTP, key, model, type } from './fixtures.js'

/** Types the command and presses Enter (the menu row's dispatch, or the composer's submit). */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** Opens the effort picker the way the command menu does: type the command, Enter runs its row. */
const OPEN: Interaction[] = run('/effort')

/** The effort picker's level row for one native level. */
const LEVEL = (value: string): string => `[data-mol-id="chat-effort-level-${value}"]`

/** The effort picker's mode dropdown. */
const EFFORT_MODE_SELECT = 'select[data-mol-id="chat-effort-mode-select"]'

/** The effort picker's header ✕. */
const EFFORT_CLOSE = '[data-mol-id="chat-effort-picker-close"]'

/** The composer's ⚡ toggle. */
const FAST = '[data-mol-id="chat-fast-mode-toggle"]'

/** The project settings a mount reads (`GET /projects/p1`). */
const SETTINGS = (settings: Record<string, unknown>): HttpScript => ({
  method: 'GET',
  url: '/projects/p1',
  data: { settings },
})

/** A settings PATCH that succeeds (the route every /effort and /maxloops persist takes). */
const SETTINGS_PATCH: HttpScript = { method: 'PATCH', url: '/projects/p1', data: { ok: true } }

/** A settings PATCH the server refuses without a tier-limit payload. */
const SETTINGS_PATCH_FAIL: HttpScript = { method: 'PATCH', url: '/projects/p1', status: 500 }

/** The chat-mode persist a fast-mode toggle scripts. */
const MODE_PATCH: HttpScript = {
  method: 'PATCH',
  url: '/projects/p1/chat-mode',
  data: { ok: true },
}

/** A model with the provider's fast-tier pricing (`fastPricing` marks it ⚡-capable). */
const M_FAST = model('m-fast', 'anthropic', 'M Fast', {
  fastPricing: {
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
  },
})

/** The catalog a fast-mode case serves: the ⚡ model is both conversation modes' default. */
const FAST_CATALOG = {
  models: [M_FAST],
  defaults: { plan: 'm-fast', execute: 'm-fast', commit: 'm-fast', compact: 'm-fast' },
}

/** What a fast-mode case mounts with: the ⚡ catalog, a paid account, and its persist answer. */
const FAST_BASE = {
  props: { isPro: true },
  http: [{ method: 'GET', url: '/ai/models?projectId=p1', data: FAST_CATALOG } as HttpScript],
}

/** The conversation a mount resumes, so a settings PATCH names it. */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** Effort, max loops and fast mode. */
export const effortCases: FeatureCase[] = [
  // ── The typed /effort command ───────────────────────────────────────────────
  base(
    'effort: /effort sets the current mode’s effort and persists the per-mode map',
    run('/effort high'),
    {
      http: [SETTINGS_PATCH],
    },
  ),
  base(
    "effort: /effort --plan sets plan mode's effort without touching execute",
    run('/effort --plan low'),
    {
      http: [SETTINGS_PATCH],
    },
  ),
  // The status/reject branches run inside the submit handler, whose memoized
  // closure is rebuilt when a seeded `effortByMode` lands (or after a real
  // set below) — seeding it on these cases also gives the model catalog time
  // to land, so the card names the model instead of a placeholder.
  base("effort: /effort rejects a level the mode's model does not offer", run('/effort max'), {
    http: [SETTINGS({ effortByMode: { plan: 'low' } })],
  }),
  base('effort: /effort with a second argument shows usage', run('/effort high extra')),
  base(
    "effort: /effort ? reports each mode's model, its current level and the available levels",
    run('/effort ?'),
    {
      http: [SETTINGS({ effortByMode: { plan: 'low' } })],
    },
  ),
  base('effort: /effort ? shows a persisted per-mode level', run('/effort ?'), {
    http: [SETTINGS({ effortByMode: { plan: 'low', execute: 'high' } })],
  }),
  base(
    'effort: /effort ? falls back to the legacy single level when a mode has none',
    [
      // A real set rebuilds the submit handler's closure before the status read.
      ...run('/effort --plan low'),
      ...run('/effort ?'),
    ],
    {
      http: [SETTINGS({ effortLevel: 'high' }), SETTINGS_PATCH],
    },
  ),
  base('effort: /effort ? says fixed on a model with a single reasoning mode', run('/effort ?'), {
    props: { isPro: true },
    http: [SETTINGS({ chatModel: 'm-pro', effortByMode: { plan: 'low' } })],
  }),
  base(
    'effort: /effort on a fixed-reasoning model says there is nothing to set',
    run('/effort high'),
    {
      props: { isPro: true },
      http: [SETTINGS({ chatModel: 'm-pro', effortByMode: { plan: 'low' } })],
    },
  ),
  base('effort: a failed effort persist reports the failure', run('/effort high'), {
    http: [SETTINGS_PATCH_FAIL],
  }),
  base(
    'effort: an effort persist names the open conversation in its request',
    run('/effort high'),
    {
      context: { window: { localStorage: SAVED_CONV } },
      http: [
        { method: 'PATCH', url: '/projects/p1?conversationId=c1', data: { ok: true } },
        ...CONV_HTTP('c1'),
      ],
    },
  ),

  // ── The effort picker ───────────────────────────────────────────────────────
  base("effort: /effort opens the picker listing the mode's model's own levels", OPEN),
  base(
    "effort: the picker's mode dropdown re-scopes the open picker in place",
    [...OPEN, { type: 'input', selector: EFFORT_MODE_SELECT, value: 'plan' }],
    {
      props: { isPro: true },
      http: [SETTINGS({ planModel: 'm-pro' })],
    },
  ),
  base(
    'effort: choosing a level applies it and closes the picker',
    [...OPEN, click(LEVEL('high'))],
    {
      http: [SETTINGS_PATCH],
    },
  ),
  base("effort: the picker's close button closes it without persisting", [
    ...OPEN,
    click(EFFORT_CLOSE),
  ]),
  base("effort: typing after /effort filters the open picker's rows", [
    ...OPEN,
    type('/effort lo'),
  ]),
  base(
    'effort: the arrow keys move the picker’s highlight and Enter applies it',
    [...OPEN, key('ArrowDown'), key('ArrowDown'), key('Enter')],
    {
      http: [SETTINGS_PATCH],
    },
  ),
  base('effort: Escape closes the effort picker', [...OPEN, key('Escape')]),
  base('effort: /effort --plan opens the picker already scoped to plan', [type('/effort --plan')]),
  base("effort: a fixed-reasoning model's picker says there is nothing to set", OPEN, {
    props: { isPro: true },
    http: [SETTINGS({ chatModel: 'm-pro' })],
  }),
  base('effort: the picker marks the level a legacy single effort resolves to', OPEN, {
    http: [SETTINGS({ effortLevel: 'high' })],
  }),

  // ── /maxloops ───────────────────────────────────────────────────────────────
  base("effort: /maxloops sets the project's max tool iterations", run('/maxloops 25'), {
    http: [SETTINGS_PATCH],
  }),
  base('effort: /maxloops clamps a value below one to one', run('/maxloops 0'), {
    http: [SETTINGS_PATCH],
  }),
  {
    // base() has no callbackResults field, so the host CTA builder's answer is added here.
    ...base(
      'effort: a maxloops refusal at the tier limit renders the server message and the host remedy',
      run('/maxloops 60'),
      {
        props: { buildUpgradeCta: { $callback: 'buildUpgradeCta' } },
        http: [
          {
            method: 'PATCH',
            url: '/projects/p1',
            status: 403,
            data: {
              error: '60 tool loops a turn is above the free plan cap of 25.',
              limitType: 'max_tool_loops',
              requiresSignup: false,
              billingAction: 'upgrade',
              upgradeTier: 'pro',
            },
          },
        ],
      },
    ),
    callbackResults: { buildUpgradeCta: { returns: [{ label: 'Upgrade' }] } },
  },
  base(
    'effort: a maxloops failure without a tier limit says the update failed',
    run('/maxloops 25'),
    {
      http: [SETTINGS_PATCH_FAIL],
    },
  ),
  base("effort: the command menu shows the project's max loops on its /maxloops row", [type('/')], {
    http: [SETTINGS({ maxToolLoops: 42 })],
  }),
  base(
    'effort: choosing /maxloops in the command menu prefills the composer for a number',
    run('/maxloops'),
  ),

  // ── Fast mode ───────────────────────────────────────────────────────────────
  base(
    'effort: a ⚡-capable model shows the toggle and turning it on persists the conversation flag',
    [click(FAST)],
    {
      ...FAST_BASE,
      http: [...FAST_BASE.http, MODE_PATCH],
    },
  ),
  base('effort: turning fast mode off persists the conversation flag cleared', [click(FAST)], {
    ...FAST_BASE,
    context: { areas: { chat: { meta: [{ fastMode: true }] } } },
    http: [...FAST_BASE.http, MODE_PATCH],
  }),
  base('effort: a failed fast-mode persist reverts the toggle', [click(FAST)], {
    ...FAST_BASE,
    http: [...FAST_BASE.http, { method: 'PATCH', url: '/projects/p1/chat-mode', status: 500 }],
  }),
  base('effort: a model without fast pricing renders no fast-mode toggle'),
  base('effort: a read-only viewer gets no fast-mode toggle', [], {
    ...FAST_BASE,
    props: { ...FAST_BASE.props, canEdit: false },
  }),
]
