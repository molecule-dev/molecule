/**
 * `chat:model-actions` — selecting a model, its billing region and its effort,
 * ported from React's `chat:model-actions` region. Each action PATCHes the
 * project's chat settings through the conversation-scoped URL.
 *
 * The mode-scoped selection persists to that mode's own settings field
 * (`planModel` / `executeModel` / `commitModel` / `compactModel`); a selection
 * with no mode sets the legacy single `chatModel`. Regions and effort are
 * shallow-merged on the server, so the WHOLE map is sent each time.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'
import {
  type EffortLevel,
  type EffortMode,
  type ModelMode,
  modeSettingKey,
  nativeEffortName,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatCtx } from './context.js'
import type { ModelRegion } from './use-chat-models.js'

const logger = getLogger('chat-panel')

/** What the `chat:model-actions` slice exposes. */
export interface ChatModelActionsSlice {
  /** Selects a model (optionally for one mode only) and persists it. */
  readonly selectModel: (modelId: string, displayName?: string, mode?: ModelMode) => Promise<void>
  /** Sets one model's billing region and persists it. */
  readonly setModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /** Sets the effort for one mode (and model) and persists it. */
  readonly applyEffortLevel: (
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ) => Promise<void>
}

/**
 * Builds the `chat:model-actions` slice.
 *
 * @param ctx - The panel context (the composer, the settings state and their PATCH URL).
 * @returns The model-actions slice.
 */
export function createChatModelActions(ctx: ChatCtx): ChatModelActionsSlice {
  /**
   * Selects and applies a model by id, persisting it and announcing the choice.
   *
   * @param modelId - The model to select.
   * @param displayName - The name to announce (defaults to the id).
   * @param mode - The mode to scope the choice to; unset sets the legacy `chatModel`.
   * @returns A promise that settles once the choice was persisted or the failure card shown.
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
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { [modeSettingKey(mode)]: modelId },
        })
        if (mode === 'plan') ctx.models.setPlanModel(modelId)
        else if (mode === 'execute') ctx.models.setExecuteModel(modelId)
        else if (mode === 'commit') ctx.models.setCommitModel(modelId)
        else ctx.models.setCompactModel(modelId)
        ctx.systemCards.addSystemCard(
          mode === 'plan'
            ? ctx.env.t(
                'ide.chat.planModelSet',
                { name },
                { defaultValue: 'Plan-mode model set to {{name}}' },
              )
            : mode === 'execute'
              ? ctx.env.t(
                  'ide.chat.executeModelSet',
                  { name },
                  { defaultValue: 'Execute-mode model set to {{name}}' },
                )
              : mode === 'commit'
                ? ctx.env.t(
                    'ide.chat.commitModelSet',
                    { name },
                    { defaultValue: 'Commit-message model set to {{name}}' },
                  )
                : ctx.env.t(
                    'ide.chat.compactModelSet',
                    { name },
                    { defaultValue: 'Compaction model set to {{name}}' },
                  ),
        )
      } else {
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), { settings: { chatModel: modelId } })
        ctx.models.setSavedChatModel(modelId)
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.modelSet', { name }, { defaultValue: 'Chat model set to {{name}}' }),
        )
      }
    } catch (error) {
      logger.warn('Failed to update chat model', { error })
      ctx.systemCards.addSystemCard(
        ctx.env.t('ide.chat.modelError', undefined, {
          defaultValue: 'Failed to update chat model.',
        }),
      )
    }
  }

  /**
   * Sets a model's processing region (US / native-China) and persists the map.
   *
   * @param modelId - The model whose region changes.
   * @param region - The region to bill that model in.
   * @returns A promise that settles once the map was persisted.
   */
  const setModelRegion = async (modelId: string, region: ModelRegion): Promise<void> => {
    if (ctx.models.modelRegions.value[modelId] === region) return
    const nextRegions = { ...ctx.models.modelRegions.value, [modelId]: region }
    ctx.models.setModelRegions(nextRegions)
    try {
      await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
        settings: { modelRegions: nextRegions },
      })
    } catch (error) {
      logger.warn('Failed to update model processing region', { error })
    }
  }

  /**
   * Persists a mode's reasoning effort (the typed `/effort` path and the picker).
   *
   * @param targetMode - The mode whose effort changes.
   * @param level - The level to apply.
   * @param targetModel - The model the level was chosen for, for the card's label.
   * @returns A promise that settles once the map was persisted or the failure card shown.
   */
  const applyEffortLevel = async (
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ): Promise<void> => {
    ctx.composer.setEffortPicker(null)
    ctx.composer.setInputValue('')
    try {
      const nextByMode = { ...ctx.models.effortByMode.value, [targetMode]: level }
      await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
        settings: { effortByMode: nextByMode },
      })
      ctx.models.setEffortByMode(nextByMode)
      ctx.systemCards.addSystemCard(
        ctx.env.t(
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
        ctx.env.t('ide.chat.effort.error', undefined, {
          defaultValue: 'Failed to update reasoning effort.',
        }),
      )
    }
  }

  return {
    selectModel,
    setModelRegion,
    applyEffortLevel,
  }
}
