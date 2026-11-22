/**
 * React's `chat:model-actions` region of ChatPanel.tsx (lines 3375–3492): the
 * three model-setting actions every surface funnels through — selecting a
 * model for one mode (or the legacy single chat model), choosing a model's
 * processing region, and persisting a mode's reasoning effort. Each one closes
 * the picker it came from, clears the composer text, PATCHes the project
 * settings and announces the outcome with a system card.
 *
 * Every value is read through `ctx` at call time, the way React's callbacks
 * close over the live state on each render: `settingsPatchUrl` names the open
 * conversation, `effortByMode` and `modelRegions` are the latest maps, and the
 * per-mode setters write the slice's own cells.
 *
 * @module
 */

import type { AppModelDefinition, EffortLevel } from '@molecule/app-ai-models'
import {
  type EffortMode,
  type ModelMode,
  modeSettingKey,
  nativeEffortName,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatContext, ModelRegion } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:model-actions` slice. */
export interface ChatModelActionsSlice {
  /**
   * Selects a model, persists it for its mode and announces it.
   *
   * @param modelId - The model's id.
   * @param displayName - The model's display name, when the picker has one.
   * @param mode - The mode to persist the choice for; unset writes the legacy `chatModel`.
   */
  readonly selectModel: (modelId: string, displayName?: string, mode?: ModelMode) => Promise<void>
  /**
   * Sets one model's processing region and persists the whole map.
   *
   * @param modelId - The model's id.
   * @param region - The region to use for that model.
   */
  readonly setModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /**
   * Applies a reasoning-effort level to a mode and persists the whole map.
   *
   * @param targetMode - The mode whose effort changes.
   * @param level - The model's native effort value.
   * @param targetModel - The mode's model, when known (names it in the card).
   */
  readonly applyEffortLevel: (
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ) => Promise<void>

  /** React's mount I/O for the region: none — it declares callbacks only. */
  mount(): void
}

/**
 * Creates the `chat:model-actions` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The three model-setting actions.
 */
export function createChatModelActions(ctx: ChatContext): ChatModelActionsSlice {
  return {
    async selectModel(modelId: string, displayName?: string, mode?: ModelMode): Promise<void> {
      const t = ctx.env.t
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
          await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
            settings: { chatModel: modelId },
          })
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
    },

    async setModelRegion(modelId: string, region: ModelRegion): Promise<void> {
      // Mirrors the effortByMode PATCH: shallow-merge on the server means we
      // send the WHOLE modelRegions map, not just the changed entry.
      const current = ctx.models.modelRegions
      if (current[modelId] === region) return
      const nextRegions = { ...current, [modelId]: region }
      ctx.models.setModelRegions(nextRegions)
      try {
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { modelRegions: nextRegions },
        })
      } catch (error) {
        logger.warn('Failed to update model processing region', { error })
      }
    },

    async applyEffortLevel(
      targetMode: EffortMode,
      level: EffortLevel,
      targetModel?: AppModelDefinition,
    ): Promise<void> {
      const t = ctx.env.t
      ctx.composer.setEffortPicker(null)
      ctx.composer.setInputValue('')
      try {
        const nextByMode = { ...ctx.models.effortByMode, [targetMode]: level }
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { effortByMode: nextByMode },
        })
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
    },

    mount(): void {
      // React's region declares callbacks only; there is no mount I/O.
    },
  }
}
