/**
 * React's first `chat:models` region of ChatPanel.tsx (lines 1922–2110): the
 * model / effort / region / loop / auto-fix settings state, the shared model
 * catalog, and the two settings reads — the mount hydrate (`#effect
 * chat:models:2`) and the re-read after the host's change signal (`#effect
 * chat:models:3`).
 *
 * The catalog comes from the framework binding's `useAIModels` (the same
 * shared, scope-keyed cache React's hook uses). It is subscribed when `#effect
 * chat:models:2` is registered, so its fetch keeps React's effect position —
 * after the chat session's history load and before this slice's settings read.
 * The settings read hydrates every parsed field, the project's default-skills
 * set, the legacy project-level sounds value (a migration only) and the saved
 * auto-commit cadence. The removed-model recovery is the region's second part
 * and stays with its own unit.
 *
 * @module
 */

import { computed, inject, Injectable, Injector, signal } from '@angular/core'

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'
import { useAIModels, type UseAIModelsResult } from '@molecule/app-angular'
import { resolveAutoCommitSeconds } from '@molecule/app-ide-panel-logic'
import {
  effectiveModeModelId,
  type EffortLevel,
  type EffortMode,
  mergeSoundsConfig,
  parseChatProjectSettings,
  resolveRemovedModelFallback,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatSkills } from './chat-skills.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The empty catalog every reader sees until the shared catalog resolves. */
const NO_MODELS: AppModelDefinition[] = []

/** A model's billing region: a country/region key, or the provider's default. */
export type ModelRegion = string

/** The identifiers other slices and sections read from the `chat:models` slice. */
export interface ChatModelsSlice {
  /** React's mount I/O for the region (its requests run on the first effect runs). */
  mount(): void

  /** React's `#effect chat:models:<n>` entry points, at React's positions. */
  readonly effects: { 2: () => void; 3: () => void; 4: () => void }

  /** The model catalog the pickers read. */
  readonly AVAILABLE_MODELS: () => AppModelDefinition[]
  /** Per-mode server default model ids, or `undefined` while loading. */
  readonly serverModelDefaults: () => AppModeModelDefaults | undefined
  /** `true` while the initial model fetch is in flight. */
  readonly modelsLoading: () => boolean
  /** The free tier's model id. */
  readonly FREE_TIER_MODEL: () => string
  /** Whether the viewer is on the free tier. */
  readonly isFreeTier: () => boolean
  /** The legacy single chat model, read as a fallback. */
  readonly savedChatModel: () => string
  /** Sets the legacy chat model. */
  readonly setSavedChatModel: ChatSetState<string>
  /** The plan mode's model id. */
  readonly planModel: () => string
  /** Sets the plan model. */
  readonly setPlanModel: ChatSetState<string>
  /** The execute mode's model id. */
  readonly executeModel: () => string
  /** Sets the execute model. */
  readonly setExecuteModel: ChatSetState<string>
  /** The commit-message mode's model id. */
  readonly commitModel: () => string
  /** Sets the commit model. */
  readonly setCommitModel: ChatSetState<string>
  /** The compaction mode's model id. */
  readonly compactModel: () => string
  /** Sets the compaction model. */
  readonly setCompactModel: ChatSetState<string>
  /** The current effort level. */
  readonly effortLevel: () => EffortLevel
  /** Per-mode effort overrides. */
  readonly effortByMode: () => Partial<Record<EffortMode, EffortLevel>>
  /** Sets the effort overrides. */
  readonly setEffortByMode: ChatSetState<Partial<Record<EffortMode, EffortLevel>>>
  /** Per-model billing-region overrides. */
  readonly modelRegions: () => Record<string, ModelRegion>
  /** Sets the region overrides. */
  readonly setModelRegions: ChatSetState<Record<string, ModelRegion>>
  /** The tool-loop cap. */
  readonly currentMaxLoops: () => number
  /** Sets the tool-loop cap. */
  readonly setCurrentMaxLoops: ChatSetState<number>
  /** Whether auto-fix is enabled. */
  readonly autoFixEnabled: () => boolean
  /** Sets the auto-fix preference. */
  readonly setAutoFixEnabled: ChatSetState<boolean>
  /** Whether auto-approving commands is enabled. */
  readonly autoApproveCommandsEnabled: () => boolean
  /** Sets the auto-approve preference. */
  readonly setAutoApproveCommandsEnabled: ChatSetState<boolean>
  /** The model the picker calls current (the saved one, or the default). */
  readonly currentModel: () => string
  /** The model id a mode actually runs. */
  readonly effectiveModelForMode: (mode: 'plan' | 'execute') => string
}

/** React's `chat:models` slice: the settings state and its two reads. */
@Injectable()
export class ChatModels implements ChatModelsSlice {
  /** The shared state, read for the project and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the reads in. */
  private readonly injector = inject(Injector)

  /** The subscribed model catalog, bound when `effects.2` is registered. */
  private readonly catalog = signal<UseAIModelsResult | null>(null)

  /** The removed model id whose notice already fired (React's `removedModelNotifiedRef`). */
  private readonly removedModelNotifiedRef: { current: string | null } = { current: null }

  /** The project whose settings and catalog this slice reads. */
  private readonly projectId = computed(() => this.state.props().projectId)

  /** The host's settings-change counter (React's `modelSelectionSignal`). */
  private readonly modelSelectionSignal = computed(() => this.state.props().modelSelectionSignal)

  /** Whether the viewer is on the free tier (React's `!isPro`). */
  readonly isFreeTier = computed(() => !this.state.props().isPro)

  /** The project's model catalog (platform models plus its own custom ones). */
  readonly AVAILABLE_MODELS = computed<AppModelDefinition[]>(
    () => this.catalog()?.models() ?? NO_MODELS,
  )

  /** The server's per-mode default model ids, or `undefined` while loading. */
  readonly serverModelDefaults = computed<AppModeModelDefaults | undefined>(() =>
    this.catalog()?.defaults(),
  )

  /** Whether the model catalog is still loading. */
  readonly modelsLoading = computed(() => this.catalog()?.loading() ?? true)

  /** The free tier's model id (React's `freeTierModel?.id ?? models[0]?.id ?? ''`). */
  readonly FREE_TIER_MODEL = computed(
    () => this.catalog()?.freeTierModel()?.id ?? this.AVAILABLE_MODELS()[0]?.id ?? '',
  )

  /** The legacy single chat model, read as a fallback. */
  readonly savedChatModel = signal('')

  /** The plan mode's model id. */
  readonly planModel = signal('')

  /** The execute mode's model id. */
  readonly executeModel = signal('')

  /** The commit-message mode's model id. */
  readonly commitModel = signal('')

  /** The compaction mode's model id. */
  readonly compactModel = signal('')

  /** The current effort level (the legacy fallback for a mode with no entry). */
  readonly effortLevel = signal<EffortLevel>('')

  /** Per-mode effort overrides. */
  readonly effortByMode = signal<Partial<Record<EffortMode, EffortLevel>>>({})

  /** Per-model billing-region overrides. */
  readonly modelRegions = signal<Record<string, ModelRegion>>({})

  /** The tool-loop cap (React's `100`). */
  readonly currentMaxLoops = signal(100)

  /** Whether auto-fix is enabled (React's `true`). */
  readonly autoFixEnabled = signal(true)

  /** Whether auto-approving commands is enabled (React's `false`). */
  readonly autoApproveCommandsEnabled = signal(false)

  /** The model the picker calls current (the saved one, or the free-tier default). */
  readonly currentModel = computed(() => this.savedChatModel() || this.FREE_TIER_MODEL())

  /** React's mount I/O for the region: its requests run on the first effect runs. */
  mount(): void {
    // `chat:models` has no mount I/O outside its effects: the catalog fetch is
    // bound when `effects.2` registers, and the settings read is its first run.
  }

  /** Sets the legacy chat model (value or updater). */
  readonly setSavedChatModel: ChatSetState<string> = (next) => {
    this.savedChatModel.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the plan model (value or updater). */
  readonly setPlanModel: ChatSetState<string> = (next) => {
    this.planModel.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the execute model (value or updater). */
  readonly setExecuteModel: ChatSetState<string> = (next) => {
    this.executeModel.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the commit model (value or updater). */
  readonly setCommitModel: ChatSetState<string> = (next) => {
    this.commitModel.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the compaction model (value or updater). */
  readonly setCompactModel: ChatSetState<string> = (next) => {
    this.compactModel.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the effort overrides (value or updater). */
  readonly setEffortByMode: ChatSetState<Partial<Record<EffortMode, EffortLevel>>> = (next) => {
    this.effortByMode.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the region overrides (value or updater). */
  readonly setModelRegions: ChatSetState<Record<string, ModelRegion>> = (next) => {
    this.modelRegions.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the tool-loop cap (value or updater). */
  readonly setCurrentMaxLoops: ChatSetState<number> = (next) => {
    this.currentMaxLoops.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the auto-fix preference (value or updater). */
  readonly setAutoFixEnabled: ChatSetState<boolean> = (next) => {
    this.autoFixEnabled.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the auto-approve preference (value or updater). */
  readonly setAutoApproveCommandsEnabled: ChatSetState<boolean> = (next) => {
    this.autoApproveCommandsEnabled.update((prev) =>
      typeof next === 'function' ? next(prev) : next,
    )
  }

  /**
   * The model a conversation mode will ACTUALLY use, mirroring the server's
   * selection chain: per-mode setting → saved chatModel → the server-sent
   * per-mode default → the catalog clamp.
   *
   * @param mode - The mode to resolve.
   * @returns The model id that mode runs.
   */
  effectiveModelForMode(mode: 'plan' | 'execute'): string {
    return effectiveModeModelId(
      mode,
      {
        planModel: this.planModel(),
        executeModel: this.executeModel(),
        chatModel: this.savedChatModel(),
      },
      this.serverModelDefaults(),
      this.isFreeTier(),
      this.AVAILABLE_MODELS(),
      this.FREE_TIER_MODEL(),
    )
  }

  /**
   * Registers React's settings effects: the mount hydrate, the change-signal
   * re-read, and (unported) the removed-model recovery.
   */
  readonly effects = {
    2: (): void => {
      // React calls `useAIModels` while rendering this region, so the shared
      // catalog's subscription and fetch land at this effect position — after
      // the chat session's history load, before the settings read below.
      this.catalog.set(useAIModels(this.projectId))
      registerChatEffect(this.injector, () => {
        this.loadSettings(this.projectId())
      })
    },
    3: (): void => {
      registerChatEffect(this.injector, () => {
        const signalValue = this.modelSelectionSignal()
        this.projectId()
        if (!signalValue) return
        this.reloadSettings(this.projectId())
      })
    },
    4: (): void => {
      // Removed-model recovery: if the saved chatModel is no longer in the
      // catalog (a provider retired it, or we pruned the entry), notify once and
      // fall back to the free-tier model. The ref tracks the removed id so a user
      // could in theory hit this twice for two different removed models.
      registerChatEffect(this.injector, () => {
        if (this.modelsLoading()) return
        const currentModel = this.currentModel()
        if (!currentModel) return
        const models = this.AVAILABLE_MODELS()
        if (models.some((m) => m.id === currentModel)) return
        const removedId = currentModel
        if (this.removedModelNotifiedRef.current === removedId) return
        const decision = resolveRemovedModelFallback(
          removedId,
          models,
          this.FREE_TIER_MODEL(),
          this.state.env.t,
        )
        this.removedModelNotifiedRef.current = removedId
        this.state.slice(ChatSystemCards).addSystemCard(decision.notice)
        if (!decision.fallback) return
        const fallback = decision.fallback
        this.setSavedChatModel(fallback)
        // Persisting the swap writes project settings — editor+ server-side, so
        // a viewer's tab keeps the in-memory switch and skips a PATCH that could
        // only 403. Persistence is best-effort; the in-memory switch is what
        // matters.
        if (this.state.props().canEdit !== false) {
          this.state.env.http
            .patch(this.state.slice(ChatChat).settingsPatchUrl(), {
              settings: { chatModel: fallback },
            })
            .catch((error: unknown) => {
              logger.warn('chat-panel: persisting the model fallback swap failed', { error })
            })
        }
      })
    },
  }

  /**
   * Reads the project's persisted chat settings and hydrates every field the
   * parse recognized, plus the default-skills set, the legacy sounds value and
   * the auto-commit cadence.
   *
   * @param projectId - The project whose settings are read.
   */
  private loadSettings(projectId: string): void {
    this.state.env.http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        const parsed = parseChatProjectSettings(s)
        if (parsed.chatModel !== undefined) {
          this.setSavedChatModel(parsed.chatModel)
        }
        if (parsed.planModel !== undefined) this.setPlanModel(parsed.planModel)
        if (parsed.executeModel !== undefined) this.setExecuteModel(parsed.executeModel)
        if (parsed.commitModel !== undefined) this.setCommitModel(parsed.commitModel)
        if (parsed.compactModel !== undefined) this.setCompactModel(parsed.compactModel)
        if (parsed.effortLevel !== undefined) {
          this.effortLevel.set(parsed.effortLevel)
        }
        if (parsed.effortByMode !== undefined) {
          this.setEffortByMode(parsed.effortByMode)
        }
        if (parsed.modelRegions !== undefined) {
          this.setModelRegions(parsed.modelRegions)
        }
        // Persisted per-project default-loaded skills.
        const savedDefaultSkills = s?.['defaultSkills']
        if (Array.isArray(savedDefaultSkills)) {
          // An explicit saved set wins over the "all initial skills" default.
          const skills = this.state.slice(ChatSkills)
          skills.defaultSkillsExplicitRef.current = true
          skills.setDefaultSkillsExplicit(true)
          skills.setDefaultSkillPaths(
            new Set(savedDefaultSkills.filter((p): p is string => typeof p === 'string')),
          )
        }
        if (parsed.maxToolLoops !== undefined) this.setCurrentMaxLoops(parsed.maxToolLoops)
        if (parsed.autoFix !== undefined) this.setAutoFixEnabled(parsed.autoFix)
        if (parsed.autoApproveCommands !== undefined) {
          this.setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
        }
        // Legacy migration only: sounds are per-device (localStorage) now — apply
        // the old project-level value only when this device has no local pref.
        const sounds = s?.['sounds']
        if (
          sounds &&
          typeof sounds === 'object' &&
          !this.state.slice(ChatSounds).soundsLocallySetRef.current
        ) {
          this.state.slice(ChatSounds).setSoundsConfig((prev) => mergeSoundsConfig(prev, sounds))
        }
        // Restore the persisted auto-commit cadence in the paused state (it
        // re-arms on the next file change). Never for a read-only VIEWER.
        const autoCommit = this.state.slice(ChatAutoCommit)
        const savedAutoCommit = resolveAutoCommitSeconds(s?.['autoCommitSeconds'])
        autoCommit.autoCommitPersistedRef.current = savedAutoCommit
        if (savedAutoCommit > 0 && this.state.props().canEdit !== false) {
          autoCommit.dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
        }
        autoCommit.setAutoCommitLoaded(true)
      })
      .catch((error: unknown) => {
        // Settings load failed: leave auto-commit off for this session — we
        // can't know whether the user explicitly disabled it, and committing
        // against an explicit off is worse than skipping the default-on.
        logger.warn('chat-panel: project settings load failed; auto-commit left off this session', {
          error,
        })
        const autoCommit = this.state.slice(ChatAutoCommit)
        autoCommit.autoCommitPersistedRef.current = 0
        autoCommit.setAutoCommitLoaded(true)
      })
  }

  /**
   * Re-reads the persisted agent-behavior settings after the host signals a
   * change, so this browser's pickers and toggles match the new values.
   *
   * @param projectId - The project whose settings are re-read.
   */
  private reloadSettings(projectId: string): void {
    this.state.env.http
      .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
      .then((res) => {
        const s = res.data.settings
        const parsed = parseChatProjectSettings(s)
        if (parsed.chatModel !== undefined) {
          this.setSavedChatModel(parsed.chatModel)
        }
        if (parsed.planModel !== undefined) this.setPlanModel(parsed.planModel)
        if (parsed.executeModel !== undefined) this.setExecuteModel(parsed.executeModel)
        if (parsed.commitModel !== undefined) this.setCommitModel(parsed.commitModel)
        if (parsed.compactModel !== undefined) this.setCompactModel(parsed.compactModel)
        if (parsed.effortLevel !== undefined) this.effortLevel.set(parsed.effortLevel)
        if (parsed.effortByMode !== undefined) {
          this.setEffortByMode(parsed.effortByMode)
        }
        if (parsed.modelRegions !== undefined) {
          this.setModelRegions(parsed.modelRegions)
        }
        if (parsed.maxToolLoops !== undefined) this.setCurrentMaxLoops(parsed.maxToolLoops)
        if (parsed.autoFix !== undefined) this.setAutoFixEnabled(parsed.autoFix)
        if (parsed.autoApproveCommands !== undefined) {
          this.setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
        }
      })
      .catch((error: unknown) => {
        // Non-fatal: the change was persisted server-side; this view just won't
        // refresh until the next signal or full settings read.
        logger.debug('chat-panel: settings re-read after a change signal failed', { error })
      })
  }
}
