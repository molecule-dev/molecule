/**
 * Pure helpers backing the per-mode model pickers (`/model --plan` and
 * `/model --execute`).
 *
 * A project stores two optional model ids in its settings — `planModel` (used in
 * plan mode) and `executeModel` (used in execute mode) — alongside the legacy
 * single `chatModel`. These helpers parse the mode flag, map a mode to its
 * settings field, resolve the effective model for a mode with back-compat
 * fallback to `chatModel`, and compute the free-tier clamp (plan → a Sonnet-class
 * model, execute → `deepseek-v4-flash`) against the live catalog.
 *
 * Everything here is deterministic and side-effect free so it can be unit tested
 * without rendering or a backend. The component owns persistence (`PATCH
 * /projects/:id { settings }`) and any `t()` prose.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'

/** A conversation mode that can have its own model. */
export type ModelMode = 'plan' | 'execute'

/** The subset of project settings this module reads for model resolution. */
export interface PerModeModelSettings {
  /** Model id used in plan mode (falls back to {@link PerModeModelSettings.chatModel}). */
  planModel?: string
  /** Model id used in execute mode (falls back to {@link PerModeModelSettings.chatModel}). */
  executeModel?: string
  /** Legacy single model id, used when the per-mode field is unset. */
  chatModel?: string
}

/**
 * Parses a `/model --plan` or `/model --execute` command. Returns the targeted
 * mode plus any trailing filter `query` (the text after the flag), or `null`
 * when the input is not a mode-scoped `/model` command. Use this *before* the
 * generic `/model <name>` handler so the flag is not mistaken for a model name.
 *
 * @param input - The raw chat input.
 * @returns `{ mode, query }` for a mode-scoped command, else `null`.
 */
export function parseModelModeCommand(input: string): { mode: ModelMode; query: string } | null {
  const match = input.trim().match(/^\/model\s+--(plan|execute)\b\s*(.*)$/i)
  if (!match) return null
  return { mode: match[1].toLowerCase() as ModelMode, query: match[2].trim() }
}

/**
 * Maps a mode to the project-settings field that stores its model id.
 *
 * @param mode - The conversation mode.
 * @returns `'planModel'` for plan mode, `'executeModel'` for execute mode.
 */
export function modeSettingKey(mode: ModelMode): 'planModel' | 'executeModel' {
  return mode === 'plan' ? 'planModel' : 'executeModel'
}

/**
 * Resolves the effective model id for a mode, falling back to the legacy single
 * `chatModel` when the per-mode field is unset (back-compat).
 *
 * @param settings - The project's model settings.
 * @param mode - The conversation mode.
 * @returns The resolved model id, or `undefined` when nothing is configured.
 */
export function resolveModeModel(
  settings: PerModeModelSettings,
  mode: ModelMode,
): string | undefined {
  const perMode = mode === 'plan' ? settings.planModel : settings.executeModel
  return perMode ?? settings.chatModel
}

/**
 * Computes the free-tier-allowed model id for a mode from the live catalog. The
 * free/anon tier is clamped — with no mixing — to a Sonnet-class model in plan
 * mode and `deepseek-v4-flash` in execute mode. Matching is catalog-driven (by
 * id/provider) so it survives id churn; when no specific match exists it falls
 * back to the supplied `fallback` (the catalog's free-tier model id).
 *
 * @param models - The available models from the catalog.
 * @param mode - The conversation mode.
 * @param fallback - The free-tier model id to use when no match is found.
 * @returns The clamped model id for the mode.
 */
export function freeTierModeModelId(
  models: readonly AppModelDefinition[],
  mode: ModelMode,
  fallback: string,
): string {
  if (mode === 'plan') {
    const sonnetFree = models.find((m) => /sonnet/i.test(m.id) && m.freeTier)
    if (sonnetFree) return sonnetFree.id
    const sonnet = models.find((m) => /sonnet/i.test(m.id))
    return sonnet?.id ?? fallback
  }
  // execute
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
 * mode's clamped model.
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
  return modelId !== freeTierModeModelId(models, mode, fallback)
}
