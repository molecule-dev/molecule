/**
 * `ChatPanel` cases: Removed model and live settings re-read. Every case name
 * starts with `removed model: `.
 *
 * When the saved chat model is no longer in the catalog (a provider retired it,
 * or the entry was pruned), the panel announces it once with a system card and
 * falls back: first to a still-available model of the SAME custom provider, else
 * the free-tier model — an empty catalog leaves the notice without a fallback
 * and swaps nothing. An editor's swap persists `chatModel` through the settings
 * PATCH; a viewer's stays in memory. The notice waits for the catalog to answer
 * before saying anything, fires again for a second removed id, and never twice
 * for the same one.
 *
 * The host's `modelSelectionSignal` bump re-reads the persisted project
 * settings instead of waiting for the next mount: the chat model, the per-mode
 * and aux-job models, the per-mode effort, the max tool loops, auto-fix,
 * auto-approve and the processing regions all land on the surfaces that show
 * them — the open model picker's current pill and region rates, the settings
 * card, the `/effort ?` status line and the command menu's `/autofix`,
 * `/autoapprove` and `/maxloops` rows — refreshed in place, and a failed
 * re-read leaves the settings loaded at mount.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { base, key, M_FREE, M_PRO, model, MODELS, props as bumpSignal, type } from './fixtures.js'

/**
 * The project settings a mount or a signal re-read answers (`GET /projects/p1`).
 *
 * @param settings - The settings bag.
 * @returns The scripted entry.
 */
const SETTINGS = (settings: Record<string, unknown>): HttpScript => ({
  method: 'GET',
  url: '/projects/p1',
  data: { settings },
})

/** The second settings read, the one the signal re-read's failure case gets. */
const SETTINGS_READ_FAILS: HttpScript = { method: 'GET', url: '/projects/p1', status: 500 }

/** The settings PATCH the fallback swap of an editor persists. */
const SETTINGS_PATCHED: HttpScript = {
  method: 'PATCH',
  url: '/projects/p1',
  data: { settings: {} },
}

/**
 * A catalog answer for `GET /ai/models?projectId=p1` that replaces the shared one.
 *
 * @param models - The model list.
 * @returns The scripted entry.
 */
const CATALOG = (models: unknown[]): HttpScript => ({
  method: 'GET',
  url: '/ai/models?projectId=p1',
  data: { models, defaults: MODELS.defaults },
})

/** A still-available model of the custom provider the removed model belonged to. */
const M_CUSTOM_X1 = model('custom/acme/x1', 'custom', 'ACME X1', {
  inputPricePerMTok: 5,
  outputPricePerMTok: 25,
})

/** The free model with a differently-priced native-China region. */
const M_REGIONAL = model('m-free', 'deepseek', 'M Free', {
  freeTier: true,
  regions: ['us', 'cn'],
  regionPricing: { cn: { inputPricePerMTok: 0.2, outputPricePerMTok: 0.4 } },
})

/** The catalog whose free model bills differently per region. */
const REGION_CATALOG: HttpScript = {
  method: 'GET',
  url: '/ai/models?projectId=p1',
  data: { models: [M_REGIONAL, M_PRO], defaults: MODELS.defaults },
}

/** Removed model and live settings re-read. */
export const removedModelCases: FeatureCase[] = [
  // ── Removed-model recovery ──────────────────────────────────────────────
  base(
    'removed model: a saved model the catalog dropped announces the switch to the free model',
    [type('/model ')],
    {
      http: [SETTINGS({ chatModel: 'm-gone' }), SETTINGS_PATCHED],
    },
  ),
  base("removed model: the fallback stays on the removed model's own custom provider", [], {
    http: [
      CATALOG([M_FREE, M_PRO, M_CUSTOM_X1]),
      SETTINGS({ chatModel: 'custom/acme/gone' }),
      SETTINGS_PATCHED,
    ],
  }),
  base('removed model: an empty catalog announces no replacement is bonded', [], {
    http: [CATALOG([]), SETTINGS({ chatModel: 'm-gone' })],
  }),
  base(
    "removed model: a viewer's fallback switch stays in memory and sends no settings patch",
    [],
    {
      props: { canEdit: false },
      http: [SETTINGS({ chatModel: 'm-gone' })],
    },
  ),
  base(
    'removed model: the notice waits for the catalog to answer',
    [{ type: 'http', method: 'GET', url: '/ai/models?projectId=p1', data: MODELS }],
    {
      http: [
        { method: 'GET', url: '/ai/models?projectId=p1', data: MODELS, defer: true },
        SETTINGS({ chatModel: 'm-gone' }),
        SETTINGS_PATCHED,
      ],
    },
  ),
  base(
    'removed model: a second removed model announces again',
    [bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [
        SETTINGS({ chatModel: 'm-gone' }),
        SETTINGS({ chatModel: 'm-old' }),
        SETTINGS_PATCHED,
        SETTINGS_PATCHED,
      ],
    },
  ),
  base(
    'removed model: the same removed model announces once across a settings re-read',
    [bumpSignal({ modelSelectionSignal: 1 }), type('/')],
    {
      http: [
        CATALOG([]),
        SETTINGS({ chatModel: 'm-gone' }),
        SETTINGS({ chatModel: 'm-gone', maxToolLoops: 42 }),
      ],
    },
  ),
  base('removed model: no saved model and an empty catalog announces nothing', [], {
    http: [CATALOG([]), SETTINGS({})],
  }),

  // ── The live settings re-read ───────────────────────────────────────────
  base(
    'removed model: a settings signal moves the current pill in the open model picker',
    [type('/model '), bumpSignal({ modelSelectionSignal: 1 })],
    {
      // Pro, so the re-read model is not free-tier clamped away from the pill.
      props: { isPro: true },
      http: [SETTINGS({}), SETTINGS({ chatModel: 'm-pro' })],
    },
  ),
  base(
    'removed model: a settings signal refreshes the per-mode models in the open settings card',
    [type('/settings'), key('Enter'), bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [
        SETTINGS({}),
        SETTINGS({
          planModel: 'm-pro',
          executeModel: 'm-free',
          commitModel: 'm-pro',
          compactModel: 'm-free',
        }),
      ],
    },
  ),
  base(
    'removed model: a settings signal refreshes the effort the status line reports',
    [bumpSignal({ modelSelectionSignal: 1 }), type('/effort ?'), key('Enter')],
    {
      http: [SETTINGS({}), SETTINGS({ effortByMode: { plan: 'high' }, effortLevel: 'low' })],
    },
  ),
  base(
    'removed model: a settings signal refreshes the max loops on the command menu row',
    [type('/maxloops'), bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [SETTINGS({}), SETTINGS({ maxToolLoops: 42 })],
    },
  ),
  base(
    'removed model: a settings signal flips the auto-fix state the menu row labels',
    [type('/autofix'), bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [SETTINGS({}), SETTINGS({ autoFix: false })],
    },
  ),
  base(
    'removed model: a settings signal flips the auto-approve row in the open settings card',
    [type('/settings'), key('Enter'), bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [SETTINGS({}), SETTINGS({ autoApproveCommands: true })],
    },
  ),
  base(
    'removed model: a settings signal re-rates the open picker row for a saved region',
    [type('/model '), bumpSignal({ modelSelectionSignal: 1 })],
    {
      http: [REGION_CATALOG, SETTINGS({}), SETTINGS({ modelRegions: { 'm-free': 'cn' } })],
    },
  ),
  base(
    'removed model: a failed settings re-read keeps the settings loaded at mount',
    [bumpSignal({ modelSelectionSignal: 1 }), type('/settings'), key('Enter')],
    {
      http: [SETTINGS({}), SETTINGS_READ_FAILS],
    },
  ),
]
