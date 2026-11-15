/**
 * Pure helpers backing the per-mode model pickers (`/model --plan`,
 * `/model --execute`, `/model --commit`, and `/model --compact`).
 *
 * A project stores optional per-mode model ids in its settings — `planModel`
 * (used in plan mode) and `executeModel` (used in execute mode) alongside the
 * legacy single `chatModel`, plus two auxiliary jobs: `commitModel` (the
 * commit-message generator) and `compactModel` (conversation compaction), which
 * fall back to the server's own fast default (never `chatModel`) when unset.
 * These helpers parse the mode flag, map a mode to its settings field, resolve
 * the effective model for a mode, and compute the free-tier clamp.
 *
 * The clamp is entirely SERVER-DRIVEN — no model id is ever named here. A
 * free/anon user may use, in any mode, a model the catalog flags `freeTier`,
 * plus the server-sent per-mode default for that mode (`GET /ai/models`
 * `defaults`, which the server resolves from its own free-tier policy). Two
 * earlier generations of this file hardcoded the clamp ids (first a Sonnet
 * planner, then `deepseek-v4-pro`); each went stale the moment the server's
 * policy moved and the picker advertised a model the server would not use.
 *
 * Everything here is deterministic and side-effect free so it can be unit tested
 * without rendering or a backend. The component owns persistence (`PATCH
 * /projects/:id { settings }`) and any `t()` prose.
 *
 * @module
 */

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'

/** A conversation mode or auxiliary job that can have its own model. */
export type ModelMode = 'plan' | 'execute' | 'commit' | 'compact'

/**
 * The server-sent per-mode defaults (`GET /ai/models` `defaults`) — the
 * server's own resolution of what each mode uses for this requester's tier.
 * Partial/absent while the catalog is loading or on servers that don't send it.
 */
export type ServerModeDefaults = Partial<AppModeModelDefaults> | undefined

/** The subset of project settings this module reads for model resolution. */
export interface PerModeModelSettings {
  /** Model id used in plan mode (falls back to {@link PerModeModelSettings.chatModel}). */
  planModel?: string
  /** Model id used in execute mode (falls back to {@link PerModeModelSettings.chatModel}). */
  executeModel?: string
  /** Model id for commit-message generation (server's fast default when unset). */
  commitModel?: string
  /** Model id for conversation compaction (server's fast default when unset). */
  compactModel?: string
  /** Legacy single model id, used when the plan/execute field is unset. */
  chatModel?: string
}

/**
 * Parses a `/model --plan`, `--execute`, `--commit`, or `--compact` command.
 * Returns the targeted mode plus any trailing filter `query` (the text after
 * the flag), or `null` when the input is not a mode-scoped `/model` command.
 * Use this *before* the generic `/model <name>` handler so the flag is not
 * mistaken for a model name.
 *
 * @param input - The raw chat input.
 * @returns `{ mode, query }` for a mode-scoped command, else `null`.
 */
export function parseModelModeCommand(input: string): { mode: ModelMode; query: string } | null {
  const match = input.trim().match(/^\/model\s+--(plan|execute|commit|compact)\b\s*(.*)$/i)
  if (!match) return null
  return { mode: match[1].toLowerCase() as ModelMode, query: match[2].trim() }
}

/**
 * Maps a mode to the project-settings field that stores its model id.
 *
 * @param mode - The conversation mode or auxiliary job.
 * @returns The settings field for the mode (e.g. `'planModel'` for plan mode).
 */
export function modeSettingKey(
  mode: ModelMode,
): 'planModel' | 'executeModel' | 'commitModel' | 'compactModel' {
  switch (mode) {
    case 'plan':
      return 'planModel'
    case 'execute':
      return 'executeModel'
    case 'commit':
      return 'commitModel'
    case 'compact':
      return 'compactModel'
  }
}

/**
 * Resolves the effective model id for a mode. The conversation modes
 * (plan/execute) fall back to the legacy single `chatModel` when the per-mode
 * field is unset (back-compat); the auxiliary jobs (commit/compact) do NOT —
 * the server applies its own fast default for them, mirrored here by returning
 * `undefined`.
 *
 * @param settings - The project's model settings.
 * @param mode - The conversation mode or auxiliary job.
 * @returns The resolved model id, or `undefined` when nothing is configured.
 */
export function resolveModeModel(
  settings: PerModeModelSettings,
  mode: ModelMode,
): string | undefined {
  switch (mode) {
    case 'plan':
      return settings.planModel ?? settings.chatModel
    case 'execute':
      return settings.executeModel ?? settings.chatModel
    case 'commit':
      return settings.commitModel
    case 'compact':
      return settings.compactModel
  }
}

/**
 * The model a free/anon user gets in a mode when nothing else applies: the
 * server-sent default for that mode, else the catalog's `freeTier`-flagged
 * model, else the supplied `fallback`. Never names a model id — the server's
 * free-tier policy (and the catalog flag it publishes) is the only source.
 *
 * @param models - The available models from the catalog.
 * @param mode - The conversation mode or auxiliary job.
 * @param fallback - The free-tier model id to use when neither source has one.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns The free-tier model id for the mode.
 */
export function freeTierModeModelId(
  models: readonly AppModelDefinition[],
  mode: ModelMode,
  fallback: string,
  serverDefaults?: ServerModeDefaults,
): string {
  return serverDefaults?.[mode] || models.find((m) => m.freeTier === true)?.id || fallback
}

/**
 * Whether a free/anon user may use a (non-custom) model in a mode: the catalog
 * flags it `freeTier` (free in every mode, as the server's `freeTierAllows`
 * treats it), or it is the server-sent default for that very mode (the server
 * only sends a free user defaults it would itself dispatch to).
 *
 * @param model - The candidate's catalog entry (undefined when unknown).
 * @param modelId - The candidate model id.
 * @param mode - The conversation mode or auxiliary job.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns `true` when the free tier may use the model in that mode.
 */
function freeTierAllowsIn(
  model: AppModelDefinition | undefined,
  modelId: string,
  mode: ModelMode,
  serverDefaults: ServerModeDefaults,
): boolean {
  return model?.freeTier === true || (!!serverDefaults?.[mode] && serverDefaults[mode] === modelId)
}

/**
 * The model id that will ACTUALLY serve a conversation mode, for display.
 *
 * Mirrors the server's `selectModelForMode` candidate chain (minus the
 * per-request override, which the UI never has): the project's per-mode model,
 * then the project's SAVED legacy `chatModel`, each skipped when the free-tier
 * clamp would reject it — then the server-sent per-mode default (which already
 * folds in the owner's account-level settings and tier), then the catalog's
 * free-tier model as the last resort.
 *
 * `settings.chatModel` must be the PERSISTED value only — never a UI-seeded
 * default. Seeding the catalog's free-tier model as "current" once made every
 * plan-mode surface label the wrong model while the server planned with its
 * own plan default.
 *
 * @param mode - The conversation mode to resolve.
 * @param settings - Persisted per-mode + legacy model settings (saved only).
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @param isFreeTier - Whether the current user is on the free/anon tier.
 * @param models - The available models from the catalog.
 * @param fallback - The free-tier model id to use when no other source exists.
 * @returns The model id the mode resolves to.
 */
export function effectiveModeModelId(
  mode: 'plan' | 'execute',
  settings: PerModeModelSettings,
  serverDefaults: ServerModeDefaults,
  isFreeTier: boolean,
  models: readonly AppModelDefinition[],
  fallback: string,
): string {
  const candidates =
    mode === 'plan'
      ? [settings.planModel, settings.chatModel]
      : [settings.executeModel, settings.chatModel]
  for (const candidate of candidates) {
    if (!candidate) continue
    // Mirror the server: a candidate the free-tier clamp rejects falls
    // through to the next, it does not stick as the label.
    if (freeTierLockReason(candidate, mode, isFreeTier, models, serverDefaults) === null) {
      return candidate
    }
  }
  return freeTierModeModelId(models, mode, fallback, serverDefaults)
}

/**
 * Why a model is locked for a free-tier user in a given mode — `'paid'` for a
 * genuinely paid model, `'mode'` for a model the free tier CAN use, just in a
 * different mode (e.g. another mode's server default shown in this picker).
 */
export type FreeTierLockReason = 'paid' | 'mode'

/** Every mode a per-mode clamp exists for — used to test "free elsewhere". */
const MODEL_MODES: readonly ModelMode[] = ['plan', 'execute', 'commit', 'compact']

/**
 * The lock reason for a model in a mode under the free-tier clamp, or `null`
 * when it is selectable. Pro users and `provider: 'custom'` (bring-your-own
 * AI) models are never locked; a free/anon user may pick a `freeTier`-flagged
 * model in any mode, or the server-sent default for the scoped mode.
 *
 * A locked model splits into two very different cases the UI must not
 * conflate: `'paid'` (upgrade actually unlocks it) versus `'mode'` (the model
 * is free-tier-usable in ANOTHER mode, so a "Pro" badge would be flatly wrong).
 *
 * @param modelId - The candidate model id.
 * @param mode - The conversation mode the picker is scoped to.
 * @param isFreeTier - Whether the current user is on the free/anon tier.
 * @param models - The available models from the catalog.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns `'paid'` / `'mode'` when locked, `null` when selectable.
 */
export function freeTierLockReason(
  modelId: string,
  mode: ModelMode,
  isFreeTier: boolean,
  models: readonly AppModelDefinition[],
  serverDefaults?: ServerModeDefaults,
): FreeTierLockReason | null {
  if (!isFreeTier) return null
  const candidate = models.find((m) => m.id === modelId)
  if (candidate?.provider === 'custom') return null
  if (freeTierAllowsIn(candidate, modelId, mode, serverDefaults)) return null
  const freeElsewhere = MODEL_MODES.some(
    (other) => other !== mode && freeTierAllowsIn(candidate, modelId, other, serverDefaults),
  )
  return freeElsewhere ? 'mode' : 'paid'
}

/**
 * The mode a free-tier user can actually use this model in — `'plan'` /
 * `'execute'` when the free tier allows it there, `'commit'` (standing for
 * both auxiliary jobs) when only an aux job allows it, `null` when the free
 * tier can't use it anywhere. Drives the "free in <mode>" labeling next to a
 * `'mode'`-locked row.
 *
 * @param modelId - The candidate model id.
 * @param models - The available models from the catalog.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns The mode the model is free-tier-usable in, or `null`.
 */
export function freeTierUsableMode(
  modelId: string,
  models: readonly AppModelDefinition[],
  serverDefaults?: ServerModeDefaults,
): ModelMode | null {
  const candidate = models.find((m) => m.id === modelId)
  if (freeTierAllowsIn(candidate, modelId, 'plan', serverDefaults)) return 'plan'
  if (freeTierAllowsIn(candidate, modelId, 'execute', serverDefaults)) return 'execute'
  if (
    freeTierAllowsIn(candidate, modelId, 'commit', serverDefaults) ||
    freeTierAllowsIn(candidate, modelId, 'compact', serverDefaults)
  ) {
    return 'commit'
  }
  return null
}

/**
 * Whether a model is locked (not selectable) for the given mode under the
 * free-tier clamp — the boolean view of {@link freeTierLockReason} (which see
 * for the rules).
 *
 * @param modelId - The candidate model id.
 * @param mode - The conversation mode the picker is scoped to.
 * @param isFreeTier - Whether the current user is on the free/anon tier.
 * @param models - The available models from the catalog.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns `true` when the model is locked for this user and mode.
 */
export function isModeModelLocked(
  modelId: string,
  mode: ModelMode,
  isFreeTier: boolean,
  models: readonly AppModelDefinition[],
  serverDefaults?: ServerModeDefaults,
): boolean {
  return freeTierLockReason(modelId, mode, isFreeTier, models, serverDefaults) !== null
}
