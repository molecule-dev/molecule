/**
 * `chat:model-actions` — model selection, the processing region and the
 * reasoning-effort level, each persisted to project settings (React's
 * `chat:model-actions` region).
 *
 * Every action reads its slice state at call time (Solid accessors), so it sees
 * the latest catalog, regions and effort map — the same values React's committed
 * closure holds. PATCHes go to the open conversation's settings URL.
 *
 * @module
 */

import type { AppModelDefinition, EffortLevel } from '@molecule/app-ai-models'
import type { EffortMode, ModelMode } from '@molecule/app-ide-panel-logic/panels'
import { modeSettingKey, nativeEffortName } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, ModelRegion, SliceEffects } from './context.js'

/** What other slices read from `chat:model-actions`. */
export interface ChatModelActionsSlice {
  /** Selects a model, persists it for its mode and announces it. */
  selectModel: (modelId: string, displayName?: string, mode?: ModelMode) => Promise<void>
  /** Sets one model's processing region and persists it. */
  setModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /** Applies a reasoning-effort level to a mode and persists it. */
  applyEffortLevel: (
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ) => Promise<void>
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:model-actions`.
 * @param ctx - The inner ctx (the composer it clears, the settings PATCH URL, the
 *   model/effort settings it writes and the system cards it announces through).
 * @returns The model-actions slice.
 */
export function createChatModelActions(ctx: ChatInnerCtx): ChatModelActionsSlice {
  const { http, logger, t } = ctx.env

  /**
   * Select and apply a model by ID. When `mode` is given the choice persists to
   * that mode's per-mode field (`planModel` / `executeModel` /
   * `commitModel` / `compactModel`); otherwise it sets the legacy single
   * `chatModel`.
   * @param modelId - The model's id.
   * @param displayName - The model's display name, when the picker has one.
   * @param mode - The mode to persist the choice for.
   * @returns A promise that settles once the choice is persisted.
   */
  const selectModel = async (
    modelId: string,
    displayName?: string,
    mode?: ModelMode,
  ): Promise<void> => {
    ctx.composer.setModelPicker(null)
    ctx.composer.setInputValue('')
    const name = displayName ?? modelId
    try {
      if (mode) {
        await http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { [modeSettingKey(mode)]: modelId },
        })
        if (mode === 'plan') ctx.models.setPlanModel(modelId)
        else if (mode === 'execute') ctx.models.setExecuteModel(modelId)
        else if (mode === 'commit') ctx.models.setCommitModel(modelId)
        else ctx.models.setCompactModel(modelId)
        ctx.systemCards.addSystemCard(
          mode === 'plan'
            ? t(
                'ide.chat.planModelSet',
                { name },
                { defaultValue: 'Plan-mode model set to {{name}}' },
              )
            : mode === 'execute'
              ? t(
                  'ide.chat.executeModelSet',
                  { name },
                  { defaultValue: 'Execute-mode model set to {{name}}' },
                )
              : mode === 'commit'
                ? t(
                    'ide.chat.commitModelSet',
                    { name },
                    { defaultValue: 'Commit-message model set to {{name}}' },
                  )
                : t(
                    'ide.chat.compactModelSet',
                    { name },
                    { defaultValue: 'Compaction model set to {{name}}' },
                  ),
        )
      } else {
        await http.patch(ctx.chat.settingsPatchUrl(), { settings: { chatModel: modelId } })
        ctx.models.setSavedChatModel(modelId)
        ctx.systemCards.addSystemCard(
          t('ide.chat.modelSet', { name }, { defaultValue: 'Chat model set to {{name}}' }),
        )
      }
    } catch (error) {
      logger.warn('Failed to update chat model', { error })
      ctx.systemCards.addSystemCard(
        t('ide.chat.modelError', undefined, {
          defaultValue: 'Failed to update chat model.',
        }),
      )
    }
  }

  /**
   * Set a model's processing region (US / native-China). Mirrors the
   * effortByMode PATCH: shallow-merge on the server means we send the WHOLE
   * modelRegions map, not just the changed entry.
   * @param modelId - The model's id.
   * @param region - The region to persist for it.
   * @returns A promise that settles once the choice is persisted.
   */
  const setModelRegion = async (modelId: string, region: ModelRegion): Promise<void> => {
    const modelRegions = ctx.models.modelRegions()
    if (modelRegions[modelId] === region) return
    const nextRegions = { ...modelRegions, [modelId]: region }
    ctx.models.setModelRegions(nextRegions)
    try {
      await http.patch(ctx.chat.settingsPatchUrl(), {
        settings: { modelRegions: nextRegions },
      })
    } catch (error) {
      logger.warn('Failed to update model processing region', { error })
    }
  }

  /**
   * Persist a mode's reasoning effort (used by both the `/effort <level>` typed
   * path and the effort picker). Shallow-merge on the server means we send the
   * WHOLE effortByMode map, not just the changed entry.
   * @param targetMode - The mode the level applies to.
   * @param level - The effort level to persist.
   * @param targetModel - The model whose native effort name labels the level.
   * @returns A promise that settles once the choice is persisted.
   */
  const applyEffortLevel = async (
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ): Promise<void> => {
    ctx.composer.setEffortPicker(null)
    ctx.composer.setInputValue('')
    try {
      const nextByMode = { ...ctx.models.effortByMode(), [targetMode]: level }
      await http.patch(ctx.chat.settingsPatchUrl(), { settings: { effortByMode: nextByMode } })
      ctx.models.setEffortByMode(nextByMode)
      ctx.systemCards.addSystemCard(
        t(
          'ide.chat.effort.setMode',
          {
            mode: targetMode,
            level: nativeEffortName(targetModel, level) ?? level,
            model: targetModel?.label ?? '?',
          },
          { defaultValue: 'Reasoning effort for {{mode}} set to {{level}} ({{model}}).' },
        ),
      )
    } catch (error) {
      logger.warn('Failed to update reasoning effort level', { error })
      ctx.systemCards.addSystemCard(
        t('ide.chat.effort.error', undefined, {
          defaultValue: 'Failed to update reasoning effort.',
        }),
      )
    }
  }

  return {
    selectModel,
    setModelRegion,
    applyEffortLevel,
    effects: {},
  }
}
