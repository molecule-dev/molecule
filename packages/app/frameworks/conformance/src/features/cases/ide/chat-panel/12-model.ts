/**
 * `ChatPanel` cases: Model selection — the `/model` picker and the model
 * settings it reads and writes. Every case name starts with `model: `.
 *
 * Typing `/model ` opens the picker over the composer, scoped to the live
 * conversation mode (or a `--plan`/`--execute`/`--commit`/`--compact` flag);
 * its mode dropdown re-scopes the open picker in place, its sort control
 * reorders the rows, deprecated models fold into an "Older models" section
 * (auto-expanding when the current model or the only match is deprecated, and
 * never listing disabled or superseded entries), and typing narrows the rows.
 * A pick — click, or Enter on the highlighted (else first) row — PATCHes the
 * scoped settings key (`chatModel` for the Default scope, `planModel` /
 * `executeModel` for the conversation modes, `commitModel` / `compactModel`
 * for the aux jobs), drops a system card, closes the picker and clears the
 * composer; a failed PATCH reports a card instead and keeps the old model, and
 * a pick in a resumed conversation PATCHes the conversation-scoped settings
 * URL. The free tier is clamped: a paid row carries the "Pro" pill and shows
 * the host's upgrade card, a model the free tier uses in another mode carries
 * a muted "free in <mode>" pill and a plain one-liner, the server-named
 * per-mode default stays selectable in its own scope, and `custom` (bring
 * your own AI) models are never locked. The host's `onManageCustomModels`
 * seam renders the anchored "Add or manage your own models…" footer — absent
 * without the callback — whose click and last arrow index close the picker and
 * fire the callback with the picker's mode. Each row shows its provider,
 * capability badges, its ×usage rate (re-rated by a saved or newly chosen
 * processing region, whose menu lists every region's rate and closes on an
 * outside click or Escape), its knowledge cutoff, and the "current" pill for
 * the model the selected mode actually uses — a saved `chatModel` /
 * `planModel` / `executeModel` / `commitModel` / `compactModel` / `modelRegions`
 * from project settings names the mode options, marks the pill and rates the
 * rows. A model with peak-hour pricing shows the multiplier in force now, and
 * an active-mode model with fast pricing shows the composer's fast-mode toggle.
 *
 * @module
 */

import type { FeatureCase } from '../../../spec.js'
import { base, click, CONV_HTTP, key, M_FREE, M_PRO, model, MODELS, type } from './fixtures.js'

/** The model picker popup (the only `z-index: 100` overlay a `/model` case opens). */
const PICKER = 'div[style*="z-index: 100"]'

/** The picker's scrolling list — the popup's second child div. */
const LIST = `${PICKER} > div:nth-child(2)`

/**
 * The list's nth row button, top-down in the picker's current sort (name
 * ascending for every catalog here unless a case re-sorts first). Each row
 * button sits in a positioning wrapper (its region control is the button's
 * SIBLING, overlaid on the row's bottom-right — a control cannot sit inside
 * the row button, axe `nested-interactive`), so the wrapper is what the list
 * counts.
 *
 * @param n - 1-based row position.
 * @returns Its selector.
 */
const ROW = (n: number): string => `${LIST} > div:nth-of-type(${n}) > button`

/**
 * The "Older models" collapse/expand disclosure — the list's only direct
 * button child (the model rows sit in wrapper divs).
 */
const OLDER_MODELS = `${LIST} > button`

/** The picker's mode dropdown. */
const MODE_SELECT = '[data-mol-id="chat-model-mode-select"]'

/** The sort-column select. */
const SORT_COLUMN = '[data-mol-id="model-sort-column"]'

/** The sort-direction toggle button. */
const SORT_DIRECTION = '[data-mol-id="model-sort-direction"]'

/**
 * A model row's processing-region control.
 *
 * @param id - The model id.
 * @returns Its selector.
 */
const REGION_TRIGGER = (id: string): string => `[data-mol-id="model-region-${id}"]`

/**
 * One region item of a model's open region menu.
 *
 * @param id - The model id.
 * @param region - The region code of the item.
 * @returns Its selector.
 */
const REGION_ITEM = (id: string, region: string): string =>
  `[data-mol-id="model-region-${id}-${region}"]`

/** The host-seam "Add or manage your own models…" footer. */
const MANAGE = '[data-mol-id="chat-model-manage-custom"]'

/** The composer's fast-mode toggle. */
const FAST_TOGGLE = '[data-mol-id="chat-fast-mode-toggle"]'

/**
 * A catalog answer for `GET /ai/models?projectId=p1` that replaces the shared
 * one for a case.
 *
 * @param models - The model list.
 * @param defaults - The per-mode server defaults (omittable entries are read
 *   back by the panel with `?.`).
 * @returns The scripted entry.
 */
const CATALOG = (
  models: unknown,
  defaults: unknown,
): { method: string; url: string; data: unknown } => ({
  method: 'GET',
  url: '/ai/models?projectId=p1',
  data: { models, defaults },
})

/** A paid model the server names as the execute default, so the free tier may use it there and nowhere else. */
const M_EXEC = model('m-exec', 'vendor', 'M Exec')

/** A bring-your-own AI model: `custom` providers are never free-tier locked. */
const M_CUSTOM = model('custom/acme/x1', 'custom', 'ACME X1', {
  inputPricePerMTok: 5,
  outputPricePerMTok: 25,
})

/** A retired model, kept selectable in the "Older models" section. */
const M_OLD = model('m-old', 'deepseek', 'M Old Legacy', { deprecatedAt: '2023-11-01' })

/** A model the provider disabled entirely — never offered, not even as older. */
const M_DISABLED = model('m-disabled', 'deepseek', 'M Disabled', { disabled: true })

/** A model replaced by a newer generation — treated like a disabled one. */
const M_SUPERSEDED = model('m-superseded', 'deepseek', 'M Superseded', {
  supersededBy: 'm-pro',
})

/** The catalog with an older, a disabled and a superseded entry beside the live ones. */
const LEGACY_CATALOG = CATALOG([M_FREE, M_PRO, M_OLD, M_DISABLED, M_SUPERSEDED], MODELS.defaults)

/** The catalog whose per-mode defaults differ and whose aux defaults are absent. */
const MODE_OPTIONS_CATALOG = CATALOG([M_FREE, M_EXEC, M_PRO], {
  plan: 'm-free',
  execute: 'm-exec',
})

/** The catalog the free-tier clamp cases use (the execute default is a paid model). */
const EXEC_DEFAULT_CATALOG = CATALOG([M_FREE, M_EXEC, M_PRO], {
  plan: 'm-free',
  execute: 'm-exec',
  commit: 'm-free',
  compact: 'm-free',
})

/** The free model with a differently-priced native-China region. */
const M_REGIONAL = model('m-free', 'deepseek', 'M Free', {
  freeTier: true,
  regions: ['us', 'cn'],
  regionPricing: { cn: { inputPricePerMTok: 0.2, outputPricePerMTok: 0.4 } },
})

/** The catalog whose free model bills differently per region. */
const REGION_CATALOG = CATALOG([M_REGIONAL, M_PRO], MODELS.defaults)

/** A China-only model: a single-entry regions list pins the region. */
const M_CN_ONLY = model('m-cn', 'deepseek', 'M Cn Only', { regions: ['cn'] })

/** The catalog with a single-region model beside the regionless default ones. */
const CN_ONLY_CATALOG = CATALOG([M_FREE, M_PRO, M_CN_ONLY], MODELS.defaults)

/** A model billed at a permanent peak multiplier (its only window is all day). */
const M_PEAK = model('m-peak', 'anthropic', 'M Peak', {
  peakPricing: { windows: [{ startMinuteUtc: 0, endMinuteUtc: 1440 }], multiplier: 3 },
})

/** The catalog with an all-day-peak model beside the flat free one. */
const PEAK_CATALOG = CATALOG([M_FREE, M_PEAK], MODELS.defaults)

/** A model with every capability badge the picker renders. */
const M_FLASH = model('m-flash', 'google', 'M Flash', {
  supportsVision: true,
  supportsThinking: true,
  supportsPromptCaching: true,
  fastPricing: {
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1,
  },
})

/** The catalog with a fully-flagged model beside the plain free one. */
const BADGES_CATALOG = CATALOG([M_FLASH, M_FREE], MODELS.defaults)

/** The free model carrying fast pricing, so the active mode's model declares it. */
const M_FAST = model('m-free', 'deepseek', 'M Free', {
  freeTier: true,
  fastPricing: {
    inputPricePerMTok: 1,
    outputPricePerMTok: 3,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 1.25,
  },
})

/** The catalog whose only model is fast-mode capable. */
const FAST_CATALOG = CATALOG([M_FAST], MODELS.defaults)

/** The default model, deprecated — the seeding still adopts it, so the section opens expanded. */
const M_FREE_OLD = model('m-free', 'deepseek', 'M Free', {
  freeTier: true,
  deprecatedAt: '2023-11-01',
})

/** The catalog whose free-tier default model is itself deprecated. */
const DEPRECATED_DEFAULT_CATALOG = CATALOG([M_FREE_OLD, M_PRO], MODELS.defaults)

/** A paid model with a smaller context window, so the context sort reorders the rows. */
const M_SHORT = model('m-pro', 'anthropic', 'M Pro', { contextWindow: 100_000 })

/** The catalog whose two models differ in context window. */
const CONTEXT_CATALOG = CATALOG([M_FREE, M_SHORT], MODELS.defaults)

/** Typing the `/model` command with its trailing space opens the picker. */
const OPEN = type('/model ')

/** Pressing Enter in the composer. */
const ENTER = key('Enter')

/** Pressing Escape in the composer. */
const ESCAPE = key('Escape')

/** The conversation a mount resumes, so a settings PATCH names it. */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** A successful answer for the settings PATCH a pick sends (`/projects/p1`). */
const PATCH_OK = { method: 'PATCH', url: '/projects/p1', data: {} }

/** Model selection. */
export const modelCases: FeatureCase[] = [
  // ── Opening and scoping ─────────────────────────────────────────────────
  base('model: typing /model opens the picker over the composer', [OPEN]),
  base("model: the picker opens scoped to the conversation's live mode", [OPEN], {
    context: { areas: { chat: { meta: [{ mode: 'plan' }] } } },
  }),
  base('model: /model --commit preselects the commit scope', [type('/model --commit ')]),
  base('model: each mode option names the model it resolves to', [OPEN], {
    http: [MODE_OPTIONS_CATALOG],
  }),
  base(
    'model: the picker shows its loading list until the catalog answers',
    [OPEN, { type: 'http', method: 'GET', url: '/ai/models?projectId=p1', data: MODELS }],
    {
      http: [{ method: 'GET', url: '/ai/models?projectId=p1', data: MODELS, defer: true }],
      withoutHttp: ['/ai/models?projectId=p1'],
    },
  ),
  base(
    'model: an empty catalog leaves the picker hidden',
    [OPEN, { type: 'http', method: 'GET', url: '/ai/models?projectId=p1', data: { models: [] } }],
    {
      http: [{ method: 'GET', url: '/ai/models?projectId=p1', data: MODELS, defer: true }],
      withoutHttp: ['/ai/models?projectId=p1'],
    },
  ),
  base('model: Escape closes the picker and keeps the draft', [OPEN, ESCAPE]),

  // ── Filtering and sorting ───────────────────────────────────────────────
  base('model: the picker filters the rows as you type', [OPEN, type('/model pro')]),
  base(
    'model: sorting by context reorders the rows',
    [OPEN, { type: 'input', selector: SORT_COLUMN, value: 'context' }],
    {
      http: [CONTEXT_CATALOG],
    },
  ),
  base('model: toggling the sort direction reverses the rows', [OPEN, click(SORT_DIRECTION)]),

  // ── The Older models section ────────────────────────────────────────────
  base(
    'model: deprecated models fold into a collapsed Older models section',
    [OPEN, click(OLDER_MODELS)],
    {
      http: [LEGACY_CATALOG],
    },
  ),
  base('model: the section auto-expands when the current model is deprecated', [OPEN], {
    http: [DEPRECATED_DEFAULT_CATALOG],
  }),
  base(
    'model: a filter matching only deprecated models auto-expands the section',
    [type('/model legacy')],
    {
      http: [LEGACY_CATALOG],
    },
  ),
  base('model: disabled and superseded models never appear in the picker', [OPEN], {
    http: [LEGACY_CATALOG],
  }),

  // ── Picking: keyboard ───────────────────────────────────────────────────
  base('model: Enter with no highlight picks the first visible row', [OPEN, ENTER], {
    http: [PATCH_OK],
  }),
  base(
    'model: Enter picks the arrow-highlighted row',
    [OPEN, key('ArrowDown'), key('ArrowDown'), ENTER],
    {
      props: { isPro: true },
      http: [PATCH_OK],
    },
  ),

  // ── Picking: scopes ─────────────────────────────────────────────────────
  base(
    'model: the Default scope persists the legacy chat model',
    [OPEN, { type: 'input', selector: MODE_SELECT, value: '' }, click(ROW(1))],
    { http: [PATCH_OK] },
  ),
  base(
    'model: the commit scope persists the commit model',
    [OPEN, { type: 'input', selector: MODE_SELECT, value: 'commit' }, click(ROW(1))],
    { http: [PATCH_OK] },
  ),
  base(
    'model: re-scoping the mode dropdown clears the highlighted row',
    [
      OPEN,
      key('ArrowDown'),
      key('ArrowDown'),
      { type: 'input', selector: MODE_SELECT, value: 'commit' },
      key('ArrowDown'),
    ],
    { props: { isPro: true } },
  ),
  base(
    'model: a picked model reopens as the current pill naming the Default scope',
    [OPEN, { type: 'input', selector: MODE_SELECT, value: '' }, click(ROW(1)), OPEN],
    { http: [PATCH_OK] },
  ),
  base('model: a failed settings patch reports the failure card', [OPEN, click(ROW(1))], {
    http: [{ method: 'PATCH', url: '/projects/p1', status: 500 }],
  }),
  base(
    'model: picking in a resumed conversation patches the conversation settings URL',
    [OPEN, click(ROW(1))],
    {
      context: { window: { localStorage: SAVED_CONV } },
      http: [
        ...CONV_HTTP('c1'),
        { method: 'PATCH', url: '/projects/p1?conversationId=c1', data: {} },
      ],
    },
  ),

  // ── The typed /model command ────────────────────────────────────────────
  base('model: submitting /model alone shows the usage card', [type('/model'), ESCAPE, ENTER]),
  base('model: submitting an unknown model name applies it as given', [type('/model zz'), ENTER], {
    props: { isPro: true },
    http: [PATCH_OK],
  }),
  base('model: the free tier cannot apply a model by typed name', [type('/model zz'), ENTER]),

  // ── The free-tier clamp ─────────────────────────────────────────────────
  base(
    'model: clicking a paid model on the free tier shows the upgrade card',
    [OPEN, click(ROW(2))],
    {
      props: { buildUpgradeCta: { $callback: 'buildUpgradeCta' } },
    },
  ),
  base(
    'model: a mode-locked model shows the muted free-in pill, never Pro',
    [OPEN, { type: 'input', selector: MODE_SELECT, value: 'plan' }, click(ROW(1))],
    {
      http: [EXEC_DEFAULT_CATALOG],
    },
  ),
  base('model: the server execute default is selectable in its own scope', [OPEN, click(ROW(1))], {
    http: [EXEC_DEFAULT_CATALOG, PATCH_OK],
  }),
  base('model: a custom-provider model is never locked', [OPEN, click(ROW(1))], {
    http: [CATALOG([M_CUSTOM, M_FREE], MODELS.defaults), PATCH_OK],
  }),

  // ── The manage-custom-models seam ───────────────────────────────────────
  base('model: the manage row fires the host callback with the live mode', [OPEN, click(MANAGE)], {
    props: { onManageCustomModels: { $callback: 'onManageCustomModels' } },
  }),
  base('model: the manage row in plan mode fires with plan', [OPEN, click(MANAGE)], {
    props: { onManageCustomModels: { $callback: 'onManageCustomModels' } },
    context: { areas: { chat: { meta: [{ mode: 'plan' }] } } },
  }),
  base(
    'model: Enter on the manage row invokes the host callback',
    [OPEN, key('ArrowDown'), key('ArrowDown'), key('ArrowDown'), ENTER],
    {
      props: { onManageCustomModels: { $callback: 'onManageCustomModels' } },
    },
  ),
  base('model: without the host callback there is no manage row', [OPEN]),

  // ── Processing regions ──────────────────────────────────────────────────
  base('model: opening a model region menu lists its regions with rates', [
    OPEN,
    click(REGION_TRIGGER('m-free')),
  ]),
  base(
    'model: choosing another region persists the region map and re-rates the row',
    [OPEN, click(REGION_TRIGGER('m-free')), click(REGION_ITEM('m-free', 'cn'))],
    {
      http: [REGION_CATALOG, PATCH_OK],
    },
  ),
  base('model: choosing the active region changes nothing', [
    OPEN,
    click(REGION_TRIGGER('m-free')),
    click(REGION_ITEM('m-free', 'us')),
  ]),
  base(
    'model: a single-region model shows a fixed region pill without a menu',
    [OPEN, click(REGION_TRIGGER('m-cn'))],
    {
      http: [CN_ONLY_CATALOG],
    },
  ),
  base('model: a click outside closes the region menu', [
    OPEN,
    click(REGION_TRIGGER('m-free')),
    { type: 'event', selector: 'document', event: 'click', bubbles: true },
  ]),
  base('model: Escape on the region trigger closes its menu', [
    OPEN,
    click(REGION_TRIGGER('m-free')),
    { type: 'keydown', selector: REGION_TRIGGER('m-free'), key: 'Escape' },
  ]),

  // ── Saved settings ──────────────────────────────────────────────────────
  base('model: a saved chat model is the current pill and names the Default scope', [OPEN], {
    props: { isPro: true },
    http: [{ method: 'GET', url: '/projects/p1', data: { settings: { chatModel: 'm-pro' } } }],
  }),
  base('model: on the free tier the current pill marks the model the mode actually uses', [OPEN], {
    http: [{ method: 'GET', url: '/projects/p1', data: { settings: { chatModel: 'm-pro' } } }],
  }),
  base('model: saved per-mode models name their mode options', [OPEN], {
    http: [
      {
        method: 'GET',
        url: '/projects/p1',
        data: {
          settings: {
            planModel: 'm-pro',
            executeModel: 'm-free',
            commitModel: 'm-pro',
            compactModel: 'm-free',
          },
        },
      },
    ],
  }),
  base('model: a saved processing region labels and rates the row', [OPEN], {
    http: [
      {
        method: 'GET',
        url: '/projects/p1',
        data: { settings: { modelRegions: { 'm-free': 'cn' } } },
      },
      REGION_CATALOG,
    ],
  }),

  // ── Row capability display ──────────────────────────────────────────────
  base('model: capability badges render on the model rows', [OPEN], {
    http: [BADGES_CATALOG],
  }),
  base('model: a peak-window model shows its live peak rate', [OPEN], {
    http: [PEAK_CATALOG],
  }),
  base(
    'model: a fast-pricing active model shows the fast-mode toggle and flips it',
    [click(FAST_TOGGLE)],
    {
      props: { canEdit: true },
      http: [FAST_CATALOG, { method: 'PATCH', url: '/projects/p1/chat-mode', data: {} }],
    },
  ),
]
