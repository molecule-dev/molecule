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
 * the effective model for a mode, and compute the free-tier clamp (plan →
 * `deepseek-v4-pro`, execute → `deepseek-v4-flash`, commit/compact → any
 * free-tier-flagged model) against the live catalog. The clamp ids mirror the
 * server's FREE_TIER_MODELS in molecule-dev's `model-selection.ts` — keep the
 * two in sync (a stale Sonnet-plan assumption here once highlighted the wrong
 * "current" model in the picker).
 *
 * Everything here is deterministic and side-effect free so it can be unit tested
 * without rendering or a backend. The component owns persistence (`PATCH
 * /projects/:id { settings }`) and any `t()` prose.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'

/** A conversation mode or auxiliary job that can have its own model. */
export type ModelMode = 'plan' | 'execute' | 'commit' | 'compact'

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
 * Computes the free-tier-allowed model id for a mode from the live catalog. The
 * free/anon tier is clamped — with no mixing — to `deepseek-v4-pro` in plan
 * mode and `deepseek-v4-flash` in execute mode (the auxiliary commit/compact
 * jobs share the execute clamp), mirroring the server's FREE_TIER_MODELS.
 * Matching is catalog-driven (by id/provider) so it survives id churn; when no
 * specific match exists it falls back to the supplied `fallback` (the
 * catalog's free-tier model id).
 *
 * @param models - The available models from the catalog.
 * @param mode - The conversation mode or auxiliary job.
 * @param fallback - The free-tier model id to use when no match is found.
 * @returns The clamped model id for the mode.
 */
export function freeTierModeModelId(
  models: readonly AppModelDefinition[],
  mode: ModelMode,
  fallback: string,
): string {
  if (mode === 'plan') {
    const exact = models.find((m) => m.id === 'deepseek-v4-pro')
    if (exact) return exact.id
    const deepseekPro = models.find((m) => m.provider === 'deepseek' && /pro/i.test(m.id))
    if (deepseekPro) return deepseekPro.id
    const anyDeepseek = models.find((m) => m.provider === 'deepseek')
    return anyDeepseek?.id ?? fallback
  }
  // execute (and the commit/compact auxiliary jobs, which share its clamp)
  const exact = models.find((m) => m.id === 'deepseek-v4-flash')
  if (exact) return exact.id
  const deepseekFlash = models.find((m) => m.provider === 'deepseek' && /flash/i.test(m.id))
  if (deepseekFlash) return deepseekFlash.id
  const anyDeepseek = models.find((m) => m.provider === 'deepseek')
  return anyDeepseek?.id ?? fallback
}

/**
 * Whether a model is locked (not selectable) for the given mode under the
 * free-tier clamp. Pro users are never locked; free/anon users may pick only the
 * mode's clamped model — plus any `provider: 'custom'` (bring-your-own AI)
 * model, which is exempt on every tier because the user pays their own
 * provider directly. The auxiliary commit/compact jobs are looser: any
 * free-tier-flagged (or custom) model is selectable, mirroring the server's
 * aux-model selection, which ignores a non-free platform pick anyway.
 *
 * @param modelId - The candidate model id.
 * @param mode - The conversation mode the picker is scoped to.
 * @param isFreeTier - Whether the current user is on the free/anon tier.
 * @param models - The available models from the catalog.
 * @param fallback - The free-tier model id to use when no clamp match is found.
 * @returns `true` when the model is locked for this user and mode.
 */
export function isModeModelLocked(
  modelId: string,
  mode: ModelMode,
  isFreeTier: boolean,
  models: readonly AppModelDefinition[],
  fallback: string,
): boolean {
  if (!isFreeTier) return false
  const candidate = models.find((m) => m.id === modelId)
  if (candidate?.provider === 'custom') return false
  if (mode === 'commit' || mode === 'compact') return candidate?.freeTier !== true
  return modelId !== freeTierModeModelId(models, mode, fallback)
}
