/**
 * `chat:models` — the project settings the panel restores (models, effort,
 * regions, loops, auto-fix, auto-approve), the catalog it reads, and the two
 * restore effects (React's first `chat:models` region, ported by unit P3).
 *
 * React calls `useAIModels` in the region's body, where its fetch effect lands
 * between the sounds effects and the settings restore. Solid runs an effect
 * when it is created, so the catalog primitive is called inside this slice's
 * ledger slot (`effects[2]`) — right before the restore effect — and its
 * accessors reach the rest of the panel through a signal. That keeps the
 * mount-time request order identical to React's (`/ai/models`, then
 * `/projects/:id`).
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal } from 'solid-js'

import type { AppModelDefinition, AppModeModelDefaults, EffortLevel } from '@molecule/app-ai-models'
import { resolveAutoCommitSeconds } from '@molecule/app-ide-panel-logic'
import type { EffortMode } from '@molecule/app-ide-panel-logic/panels'
import {
  effectiveModeModelId,
  mergeSoundsConfig,
  parseChatProjectSettings,
  resolveRemovedModelFallback,
} from '@molecule/app-ide-panel-logic/panels'
import type { UseAIModelsResult } from '@molecule/app-solid/ai-models'
import { useAIModels } from '@molecule/app-solid/ai-models'

import type { ChatInnerCtx, ModelRegion, SliceEffects } from './context.js'

/**
 * The list read before the catalog primitive exists (and while it loads): one
 * shared empty array, so an unchanged catalog keeps its identity.
 */
const NO_MODELS: AppModelDefinition[] = []

/** What other slices read from `chat:models`. */
export interface ChatModelsSlice {
  /** The project's catalog (platform models plus its own custom ones). */
  availableModels: Accessor<AppModelDefinition[]>
  /** The catalog, by React's name (the same live list as `availableModels`). */
  AVAILABLE_MODELS: Accessor<AppModelDefinition[]>
  /** The server's per-mode default model ids, or undefined while loading. */
  serverModelDefaults: Accessor<AppModeModelDefaults | undefined>
  /** The catalog's free-tier model. */
  freeTierModel: Accessor<AppModelDefinition | undefined>
  /** Whether the catalog is still loading. */
  modelsLoading: Accessor<boolean>
  /** The free-tier model id (the model a free conversation falls back to). */
  freeTierModelId: Accessor<string>
  /** The free-tier model id, by React's name (the same value as `freeTierModelId`). */
  FREE_TIER_MODEL: Accessor<string>
  /** Whether the viewer is on the free tier. */
  isFreeTier: Accessor<boolean>
  /** The persisted legacy chat model. */
  savedChatModel: Accessor<string>
  /** Sets the persisted legacy chat model. */
  setSavedChatModel: Setter<string>
  /** The plan-mode model override ('' = unset). */
  planModel: Accessor<string>
  /** Sets the plan-mode model override. */
  setPlanModel: Setter<string>
  /** The execute-mode model override ('' = unset). */
  executeModel: Accessor<string>
  /** Sets the execute-mode model override. */
  setExecuteModel: Setter<string>
  /** The commit-message model override ('' = unset). */
  commitModel: Accessor<string>
  /** Sets the commit-message model override. */
  setCommitModel: Setter<string>
  /** The compaction model override ('' = unset). */
  compactModel: Accessor<string>
  /** Sets the compaction model override. */
  setCompactModel: Setter<string>
  /** The legacy effort level used when a mode has no explicit entry. */
  effortLevel: Accessor<EffortLevel>
  /** The per-mode effort levels. */
  effortByMode: Accessor<Partial<Record<EffortMode, EffortLevel>>>
  /** Sets the per-mode effort levels. */
  setEffortByMode: Setter<Partial<Record<EffortMode, EffortLevel>>>
  /** The per-model processing regions. */
  modelRegions: Accessor<Record<string, ModelRegion>>
  /** Sets the per-model processing regions. */
  setModelRegions: Setter<Record<string, ModelRegion>>
  /** The agentic loop cap. */
  currentMaxLoops: Accessor<number>
  /** Sets the agentic loop cap. */
  setCurrentMaxLoops: Setter<number>
  /** Whether the verification auto-fix is enabled. */
  autoFixEnabled: Accessor<boolean>
  /** Sets the auto-fix preference. */
  setAutoFixEnabled: Setter<boolean>
  /** Whether destructive commands skip their confirmation. */
  autoApproveCommandsEnabled: Accessor<boolean>
  /** Sets the auto-approve preference. */
  setAutoApproveCommandsEnabled: Setter<boolean>
  /** The model the default slot resolves to (saved choice, else the free tier). */
  currentModel: Accessor<string>
  /** The model a conversation mode will actually use. */
  effectiveModelForMode: (mode: 'plan' | 'execute') => string
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:models`.
 * @param ctx - The inner ctx (its props, HTTP client, logger, and the sounds,
 *   skills and auto-commit slices the restore writes through).
 * @returns The models slice.
 */
export function createChatModels(ctx: ChatInnerCtx): ChatModelsSlice {
  const { http, logger } = ctx.env
  // The catalog primitive is created at this slice's ledger slot (see the
  // module note); these read through it once it exists.
  const [catalog, setCatalog] = createSignal<UseAIModelsResult | null>(null)
  const availableModels = (): AppModelDefinition[] => catalog()?.models() ?? NO_MODELS
  const serverModelDefaults = (): AppModeModelDefaults | undefined => catalog()?.defaults()
  const freeTierModel = (): AppModelDefinition | undefined => catalog()?.freeTierModel()
  const modelsLoading = (): boolean => catalog()?.loading() ?? true
  const freeTierModelId = (): string => freeTierModel()?.id ?? availableModels()[0]?.id ?? ''
  const isFreeTier = (): boolean => !ctx.props.isPro

  // The PERSISTED legacy chatModel only — never seeded with the catalog
  // default. A seeded default is not a user choice, and treating it as one made
  // every plan-mode surface label the wrong model.
  const [savedChatModel, setSavedChatModel] = createSignal<string>('')
  // Per-mode model overrides (SYN5). Empty string = unset; `effectiveModelForMode`
  // then falls back to currentModel (the legacy single chatModel) for back-compat.
  const [planModel, setPlanModel] = createSignal<string>('')
  const [executeModel, setExecuteModel] = createSignal<string>('')
  // Auxiliary-job model overrides. Empty string = unset — the SERVER falls back
  // to its own fast default (never chatModel) for these.
  const [commitModel, setCommitModel] = createSignal<string>('')
  const [compactModel, setCompactModel] = createSignal<string>('')
  // Reasoning effort (SYN6) — applied by the backend at chat-call time. Effort
  // is PER-MODE (settings.effortByMode); the single `effortLevel` is the legacy
  // fallback used when a mode has no explicit entry.
  const [effortLevel, setEffortLevel] = createSignal<EffortLevel>('')
  const [effortByMode, setEffortByMode] = createSignal<Partial<Record<EffortMode, EffortLevel>>>({})
  // Per-model processing region (US default / native-China). Persisted as the
  // WHOLE map in settings.modelRegions, mirroring effortByMode's shape.
  const [modelRegions, setModelRegions] = createSignal<Record<string, ModelRegion>>({})
  const [currentMaxLoops, setCurrentMaxLoops] = createSignal<number>(100)
  const [autoFixEnabled, setAutoFixEnabled] = createSignal<boolean>(true)
  // Auto-approve destructive commands (skip the pre-tool "Proceed?" confirm).
  // Off by default — the gate is opt-out.
  const [autoApproveCommandsEnabled, setAutoApproveCommandsEnabled] = createSignal<boolean>(false)

  /** The model the default slot resolves to (saved choice, else the free tier). */
  const currentModel = (): string => savedChatModel() || freeTierModelId()

  /**
   * The model a conversation mode will ACTUALLY use, for every display surface
   * (picker pill, `/model` suffix, settings rows, fast-mode gating).
   * @param mode - The conversation mode to resolve.
   * @returns The model id the mode resolves to.
   */
  const effectiveModelForMode = (mode: 'plan' | 'execute'): string =>
    effectiveModeModelId(
      mode,
      { planModel: planModel(), executeModel: executeModel(), chatModel: savedChatModel() },
      serverModelDefaults(),
      isFreeTier(),
      availableModels(),
      freeTierModelId(),
    )

  return {
    availableModels,
    AVAILABLE_MODELS: availableModels,
    serverModelDefaults,
    freeTierModel,
    modelsLoading,
    freeTierModelId,
    FREE_TIER_MODEL: freeTierModelId,
    isFreeTier,
    savedChatModel,
    setSavedChatModel,
    planModel,
    setPlanModel,
    executeModel,
    setExecuteModel,
    commitModel,
    setCommitModel,
    compactModel,
    setCompactModel,
    effortLevel,
    effortByMode,
    setEffortByMode,
    modelRegions,
    setModelRegions,
    currentMaxLoops,
    setCurrentMaxLoops,
    autoFixEnabled,
    setAutoFixEnabled,
    autoApproveCommandsEnabled,
    setAutoApproveCommandsEnabled,
    currentModel,
    effectiveModelForMode,
    effects: {
      // #effect chat:models:2 — the mount restore. React calls `useAIModels` in
      // the region body, immediately before this effect; calling it here keeps
      // its `/ai/models` request at that exact place in the mount order.
      2: () => {
        setCatalog(useAIModels(() => ctx.props.projectId))
        createEffect(() => {
          http
            .get<{ settings?: Record<string, unknown> }>(`/projects/${ctx.props.projectId}`)
            .then((res) => {
              const s = res.data.settings
              const parsed = parseChatProjectSettings(s)
              if (parsed.chatModel !== undefined) {
                setSavedChatModel(parsed.chatModel)
              }
              if (parsed.planModel !== undefined) setPlanModel(parsed.planModel)
              if (parsed.executeModel !== undefined) setExecuteModel(parsed.executeModel)
              if (parsed.commitModel !== undefined) setCommitModel(parsed.commitModel)
              if (parsed.compactModel !== undefined) setCompactModel(parsed.compactModel)
              if (parsed.effortLevel !== undefined) {
                setEffortLevel(parsed.effortLevel)
              }
              if (parsed.effortByMode !== undefined) {
                setEffortByMode(parsed.effortByMode)
              }
              if (parsed.modelRegions !== undefined) {
                setModelRegions(parsed.modelRegions)
              }
              // Persisted per-project default-loaded skills (P2-06/P2-08).
              const savedDefaultSkills = s?.defaultSkills
              if (Array.isArray(savedDefaultSkills)) {
                // An explicit saved set wins over the "all initial skills" default (P3-11).
                ctx.skills.defaultSkillsExplicitRef.current = true
                ctx.skills.setDefaultSkillsExplicit(true)
                ctx.skills.setDefaultSkillPaths(
                  new Set(savedDefaultSkills.filter((p): p is string => typeof p === 'string')),
                )
              }
              if (parsed.maxToolLoops !== undefined) setCurrentMaxLoops(parsed.maxToolLoops)
              if (parsed.autoFix !== undefined) setAutoFixEnabled(parsed.autoFix)
              if (parsed.autoApproveCommands !== undefined) {
                setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
              }
              // Legacy migration only: sounds are per-device (localStorage) now —
              // apply the old project-level value only when this device has no local pref.
              if (
                s?.sounds &&
                typeof s.sounds === 'object' &&
                !ctx.sounds.soundsLocallySetRef.current
              ) {
                ctx.sounds.setSoundsConfig((prev) => mergeSoundsConfig(prev, s.sounds))
              }
              // Restore the persisted auto-commit cadence in the paused state (it
              // re-arms on the next file change). Never for a read-only VIEWER:
              // /commit is an editor action, so arming the countdown on a viewer's
              // client only produces a doomed dispatch when it lapses.
              const savedAutoCommit = resolveAutoCommitSeconds(s?.autoCommitSeconds)
              ctx.autoCommit.autoCommitPersistedRef.current = savedAutoCommit
              if (savedAutoCommit > 0 && ctx.autoCommit.readCanEdit() !== false) {
                ctx.autoCommit.dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
              }
              ctx.autoCommit.setAutoCommitLoaded(true)
            })
            .catch((error) => {
              // Settings load failed: leave auto-commit off for this session — we
              // can't know whether the user explicitly disabled it, and committing
              // against an explicit off is worse than skipping the default-on.
              logger.warn(
                'chat-panel: project settings load failed; auto-commit left off this session',
                { error },
              )
              ctx.autoCommit.autoCommitPersistedRef.current = 0
              ctx.autoCommit.setAutoCommitLoaded(true)
            })
        })
      },
      // #effect chat:models:3 — re-read the persisted agent-behavior settings
      // when the host signals a settings change. Deliberately does NOT touch
      // auto-commit or skills (they carry local in-session state the mount
      // effect owns). Skips the initial 0 value.
      3: () => {
        createEffect(() => {
          const signal = ctx.props.modelSelectionSignal
          if (!signal) return
          http
            .get<{ settings?: Record<string, unknown> }>(`/projects/${ctx.props.projectId}`)
            .then((res) => {
              const s = res.data.settings
              const parsed = parseChatProjectSettings(s)
              if (parsed.chatModel !== undefined) {
                setSavedChatModel(parsed.chatModel)
              }
              if (parsed.planModel !== undefined) setPlanModel(parsed.planModel)
              if (parsed.executeModel !== undefined) setExecuteModel(parsed.executeModel)
              if (parsed.commitModel !== undefined) setCommitModel(parsed.commitModel)
              if (parsed.compactModel !== undefined) setCompactModel(parsed.compactModel)
              if (parsed.effortLevel !== undefined) setEffortLevel(parsed.effortLevel)
              if (parsed.effortByMode !== undefined) {
                setEffortByMode(parsed.effortByMode)
              }
              if (parsed.modelRegions !== undefined) {
                setModelRegions(parsed.modelRegions)
              }
              if (parsed.maxToolLoops !== undefined) setCurrentMaxLoops(parsed.maxToolLoops)
              if (parsed.autoFix !== undefined) setAutoFixEnabled(parsed.autoFix)
              if (parsed.autoApproveCommands !== undefined) {
                setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
              }
            })
            .catch((error) => {
              // Non-fatal: the change was persisted server-side; this view just
              // won't refresh until the next signal or full settings read.
              logger.debug('chat-panel: settings re-read after a change signal failed', { error })
            })
        })
      },
      // #effect chat:models:4 — the removed-model recovery. If the saved
      // chatModel is no longer in the catalog (a provider retired it, or we
      // pruned the entry), notify once and fall back to the free-tier model.
      // Guarded by a ref so re-renders don't keep firing the card / patching
      // the project. Tracks the removed id so a user could in theory hit this
      // twice for two different removed models in the same session.
      4: () => {
        const removedModelNotifiedRef: { current: string | null } = { current: null }
        createEffect(() => {
          if (modelsLoading()) return
          const removedId = currentModel()
          if (!removedId) return
          const models = availableModels()
          if (models.some((m) => m.id === removedId)) return
          if (removedModelNotifiedRef.current === removedId) return
          const decision = resolveRemovedModelFallback(
            removedId,
            models,
            freeTierModelId(),
            ctx.env.t,
          )
          removedModelNotifiedRef.current = removedId
          ctx.systemCards.addSystemCard(decision.notice)
          if (!decision.fallback) return
          const fallback = decision.fallback
          setSavedChatModel(fallback)
          // Persisting the swap writes project settings — editor+ server-side,
          // so a viewer's tab keeps the in-memory switch (all this session
          // needs) and skips a PATCH that could only 403.
          if (ctx.props.canEdit !== false) {
            http
              .patch(ctx.chat.settingsPatchUrl(), { settings: { chatModel: fallback } })
              .catch((error) => {
                // Persistence is best-effort; the in-memory switch is what matters.
                logger.warn('chat-panel: persisting the model fallback swap failed', { error })
              })
          }
        })
      },
    },
  }
}
