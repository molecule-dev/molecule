/**
 * React's `chat:model-actions` region of ChatPanel.tsx (lines 3375–3492): the
 * three model settings writers the pickers and typed commands call.
 *
 * `selectModel` persists a model for one mode (or the legacy single
 * `chatModel`), closes the model picker, clears the composer and announces the
 * choice; `setModelRegion` shallow-merges a model's billing region into the whole
 * map; `applyEffortLevel` shallow-merges a mode's effort into the whole map and
 * announces it. Each mirrors React's arguments, request bodies, i18n keys and
 * `defaultValue`s, and its failure card and logged warning.
 *
 * Every writer looks the other slices up through {@link ChatInnerState.slice} at
 * call time, so no slice captures another at construction.
 *
 * @module
 */

import { inject, Injectable } from '@angular/core'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { nativeEffortName } from '@molecule/app-ai-models'
import {
  type EffortLevel,
  type EffortMode,
  type ModelMode,
  modeSettingKey,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import type { ModelRegion } from './chat-models.slice.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:model-actions` slice. */
export interface ChatModelActionsSlice {
  /** React's mount I/O for the region: none — the region declares callbacks. */
  mount(): void

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

/** React's `chat:model-actions` slice: the three model settings writers. */
@Injectable()
export class ChatModelActions implements ChatModelActionsSlice {
  /** The shared state, read for the env and the other slices at call time. */
  private readonly state = inject(ChatInnerState)

  /** React's mount work for the region: none — the region declares callbacks. */
  mount(): void {
    // No mount I/O in `chat:model-actions`: React builds three callbacks only.
  }

  /**
   * Selects and applies a model by id. When `mode` is given the choice persists
   * to that mode's per-mode field; otherwise it sets the legacy single
   * `chatModel`.
   *
   * @param modelId - The model's id.
   * @param displayName - The model's display name, when the picker has one.
   * @param mode - The mode to persist the choice for.
   * @returns A promise that settles once the choice is persisted.
   */
  async selectModel(modelId: string, displayName?: string, mode?: ModelMode): Promise<void> {
    const composer = this.state.slice(ChatComposer)
    composer.setModelPicker(null)
    composer.setInputValue('')
    const models = this.state.slice(ChatModels)
    const name = displayName ?? modelId
    const t = this.state.env.t
    try {
      if (mode) {
        await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
          settings: { [modeSettingKey(mode)]: modelId },
        })
        if (mode === 'plan') models.setPlanModel(modelId)
        else if (mode === 'execute') models.setExecuteModel(modelId)
        else if (mode === 'commit') models.setCommitModel(modelId)
        else models.setCompactModel(modelId)
        this.state
          .slice(ChatSystemCards)
          .addSystemCard(
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
        await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
          settings: { chatModel: modelId },
        })
        models.setSavedChatModel(modelId)
        this.state
          .slice(ChatSystemCards)
          .addSystemCard(
            t('ide.chat.modelSet', { name }, { defaultValue: 'Chat model set to {{name}}' }),
          )
      }
    } catch (error) {
      logger.warn('Failed to update chat model', { error })
      this.state
        .slice(ChatSystemCards)
        .addSystemCard(
          t('ide.chat.modelError', undefined, { defaultValue: 'Failed to update chat model.' }),
        )
    }
  }

  /**
   * Sets a model's processing region (US / native-China). Mirrors the
   * `effortByMode` PATCH: shallow-merge on the server means we send the WHOLE
   * `modelRegions` map, not just the changed entry.
   *
   * @param modelId - The model's id.
   * @param region - The region code.
   * @returns A promise that settles once the choice is persisted.
   */
  async setModelRegion(modelId: string, region: ModelRegion): Promise<void> {
    const models = this.state.slice(ChatModels)
    const modelRegions = models.modelRegions()
    if (modelRegions[modelId] === region) return
    const nextRegions = { ...modelRegions, [modelId]: region }
    models.setModelRegions(nextRegions)
    try {
      await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
        settings: { modelRegions: nextRegions },
      })
    } catch (error) {
      logger.warn('Failed to update model processing region', { error })
    }
  }

  /**
   * Persists a mode's reasoning effort (used by both the `/effort <level>` typed
   * path and the effort picker). Shallow-merge on the server means we send the
   * WHOLE `effortByMode` map, not just the changed entry.
   *
   * @param targetMode - The mode whose effort is set.
   * @param level - The native effort value.
   * @param targetModel - The model the value belongs to (for the native name).
   * @returns A promise that settles once the choice is persisted.
   */
  async applyEffortLevel(
    targetMode: EffortMode,
    level: EffortLevel,
    targetModel?: AppModelDefinition,
  ): Promise<void> {
    const composer = this.state.slice(ChatComposer)
    composer.setEffortPicker(null)
    composer.setInputValue('')
    const models = this.state.slice(ChatModels)
    const t = this.state.env.t
    try {
      const nextByMode = { ...models.effortByMode(), [targetMode]: level }
      await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
        settings: { effortByMode: nextByMode },
      })
      models.setEffortByMode(nextByMode)
      this.state.slice(ChatSystemCards).addSystemCard(
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
      this.state.slice(ChatSystemCards).addSystemCard(
        t('ide.chat.effort.error', undefined, {
          defaultValue: 'Failed to update reasoning effort.',
        }),
      )
    }
  }
}
