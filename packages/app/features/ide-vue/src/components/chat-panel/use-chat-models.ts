/**
 * `chat:models` — the persisted model / settings state, ported from React's two
 * `chat:models` regions: the per-mode models, the per-mode effort, the model
 * regions, the loop cap, the free-tier resolution and the hydration effects.
 *
 * The catalog comes from the framework binding's `useAIModels` (the same
 * shared, scope-keyed cache React's hook uses), the project settings are read
 * once on mount and again whenever the host bumps its change signal, and the
 * removed-model recovery swaps a retired model for a live one and persists the
 * swap for an editor.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, type Ref, ref, shallowRef, watch } from 'vue'

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'
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
import { useAIModels, type UseAIModelsResult } from '@molecule/app-vue'

import type { ChatCtx, ChatEffect, SetState } from './context.js'

const logger = getLogger('chat-panel')

/** The empty catalog every reader sees until the mount hook subscribes to the shared one. */
const NO_MODELS: AppModelDefinition[] = []

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** A model's billing region: a country/region key, or the provider's default. */
export type ModelRegion = string

/** What the `chat:models` slice exposes. */
export interface ChatModelsSlice {
  /** The plan mode's model id. */
  readonly planModel: Ref<string>
  /** Sets the plan model. */
  readonly setPlanModel: SetState<string>
  /** The execute mode's model id. */
  readonly executeModel: Ref<string>
  /** Sets the execute model. */
  readonly setExecuteModel: SetState<string>
  /** The commit-message mode's model id. */
  readonly commitModel: Ref<string>
  /** Sets the commit model. */
  readonly setCommitModel: SetState<string>
  /** The compaction mode's model id. */
  readonly compactModel: Ref<string>
  /** Sets the compaction model. */
  readonly setCompactModel: SetState<string>
  /** The legacy single chat model, read as a fallback. */
  readonly savedChatModel: Ref<string>
  /** Sets the legacy chat model. */
  readonly setSavedChatModel: SetState<string>
  /** Per-model billing-region overrides. */
  readonly modelRegions: Ref<Record<string, ModelRegion>>
  /** Sets the region overrides. */
  readonly setModelRegions: SetState<Record<string, ModelRegion>>
  /** Per-mode effort overrides. */
  readonly effortByMode: Ref<Partial<Record<EffortMode, EffortLevel>>>
  /** Sets the effort overrides. */
  readonly setEffortByMode: SetState<Partial<Record<EffortMode, EffortLevel>>>
  /** The current effort level. */
  readonly effortLevel: Ref<EffortLevel>
  /** Whether auto-fix is enabled. */
  readonly autoFixEnabled: Ref<boolean>
  /** Sets the auto-fix preference. */
  readonly setAutoFixEnabled: SetState<boolean>
  /** Whether auto-approving commands is enabled. */
  readonly autoApproveCommandsEnabled: Ref<boolean>
  /** Sets the auto-approve preference. */
  readonly setAutoApproveCommandsEnabled: SetState<boolean>
  /** The free tier's model id. */
  readonly FREE_TIER_MODEL: ComputedRef<string>
  /** The project's model catalog (platform models plus its own custom ones). */
  readonly AVAILABLE_MODELS: Ref<AppModelDefinition[]>
  /** The server's per-mode default model ids, or `undefined` while loading. */
  readonly serverModelDefaults: Ref<AppModeModelDefaults | undefined>
  /** Whether the model catalog is still loading. */
  readonly modelsLoading: Ref<boolean>
  /** Whether the viewer is on the free tier. */
  readonly isFreeTier: ComputedRef<boolean>
  /** The model id a mode actually runs. */
  readonly effectiveModelForMode: (mode: 'plan' | 'execute') => string
  /** The model the picker calls current (the saved one, or the default). */
  readonly currentModel: ComputedRef<string>
  /** The tool-loop cap. */
  readonly currentMaxLoops: Ref<number>
  /** Sets the tool-loop cap. */
  readonly setCurrentMaxLoops: SetState<number>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:models:2`. */
    readonly 2: ChatEffect
    /** `#effect chat:models:3`. */
    readonly 3: ChatEffect
    /** `#effect chat:models:4`. */
    readonly 4: ChatEffect
  }
}

/**
 * Builds the `chat:models` slice.
 *
 * @param ctx - The panel context (HTTP, props, the sibling slices settings hydrate).
 * @returns The models slice.
 */
export function createChatModels(ctx: ChatCtx): ChatModelsSlice {
  // React calls `useAIModels` while rendering its models region, so the shared
  // catalog's fetch lands in effect order — after the chat session has
  // connected, before the project-settings read. Calling the composable from
  // this slice's first mount hook reproduces exactly that position; Vue runs
  // lifecycle hooks inside the component's effect scope, so its subscription
  // and watchers are disposed with the panel.
  const catalog = shallowRef<UseAIModelsResult | null>(null)
  onMounted(() => {
    catalog.value = useAIModels(() => ctx.props.projectId)
  })
  const AVAILABLE_MODELS = computed<AppModelDefinition[]>(
    () => catalog.value?.models.value ?? NO_MODELS,
  )
  const serverModelDefaults = computed<AppModeModelDefaults | undefined>(
    () => catalog.value?.defaults.value,
  )
  const modelsLoading = computed(() => catalog.value?.loading.value ?? true)
  const FREE_TIER_MODEL = computed(
    () => catalog.value?.freeTierModel.value?.id ?? AVAILABLE_MODELS.value[0]?.id ?? '',
  )
  const isFreeTier = computed(() => !ctx.props.isPro)

  const savedChatModel = ref('')
  const setSavedChatModel = makeSetter(savedChatModel)
  const planModel = ref('')
  const setPlanModel = makeSetter(planModel)
  const executeModel = ref('')
  const setExecuteModel = makeSetter(executeModel)
  const commitModel = ref('')
  const setCommitModel = makeSetter(commitModel)
  const compactModel = ref('')
  const setCompactModel = makeSetter(compactModel)
  const effortLevel = ref<EffortLevel>('')
  const setEffortLevel = makeSetter(effortLevel)
  const effortByMode = ref<Partial<Record<EffortMode, EffortLevel>>>({})
  const setEffortByMode = makeSetter(effortByMode)
  const modelRegions = ref<Record<string, ModelRegion>>({})
  const setModelRegions = makeSetter(modelRegions)
  const currentMaxLoops = ref<number>(100)
  const setCurrentMaxLoops = makeSetter(currentMaxLoops)
  const autoFixEnabled = ref<boolean>(true)
  const setAutoFixEnabled = makeSetter(autoFixEnabled)
  const autoApproveCommandsEnabled = ref<boolean>(false)
  const setAutoApproveCommandsEnabled = makeSetter(autoApproveCommandsEnabled)

  // Adopt the free-tier model id as soon as the catalog resolves, unless the
  // project-settings fetch already populated the saved choice.
  const currentModel = computed(() => savedChatModel.value || FREE_TIER_MODEL.value)

  /**
   * The model a conversation mode will ACTUALLY use, mirroring the server's
   * selection chain: per-mode setting → saved chatModel → the server-sent
   * per-mode default → the catalog clamp.
   *
   * @param mode - The mode to resolve.
   * @returns The model id that mode runs.
   */
  const effectiveModelForMode = (mode: 'plan' | 'execute'): string =>
    effectiveModeModelId(
      mode,
      {
        planModel: planModel.value,
        executeModel: executeModel.value,
        chatModel: savedChatModel.value,
      },
      serverModelDefaults.value,
      isFreeTier.value,
      AVAILABLE_MODELS.value,
      FREE_TIER_MODEL.value,
    )

  const removedModelNotifiedRef: { current: string | null } = { current: null }

  /**
   * Reads the project's persisted chat settings and hydrates every field the
   * parse recognized, plus the default-skills set and the auto-commit cadence.
   */
  const loadSettings = (): void => {
    ctx.env.http
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
        // Legacy migration only: sounds are per-device (localStorage) now — apply
        // the old project-level value only when this device has no local pref.
        if (s?.sounds && typeof s.sounds === 'object' && !ctx.sounds.soundsLocallySetRef.current) {
          ctx.sounds.setSoundsConfig((prev) => mergeSoundsConfig(prev, s.sounds))
        }
        // Restore the persisted auto-commit cadence in the paused state (it
        // re-arms on the next file change). Never for a read-only VIEWER.
        const savedAutoCommit = resolveAutoCommitSeconds(s?.autoCommitSeconds)
        ctx.autoCommit.autoCommitPersistedRef.current = savedAutoCommit
        if (savedAutoCommit > 0 && ctx.autoCommit.readCanEdit() !== false) {
          ctx.autoCommit.dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
        }
        ctx.autoCommit.setAutoCommitLoaded(true)
      })
      .catch((error: unknown) => {
        // Settings load failed: leave auto-commit off for this session — we
        // can't know whether the user explicitly disabled it.
        logger.warn('chat-panel: project settings load failed; auto-commit left off this session', {
          error,
        })
        ctx.autoCommit.autoCommitPersistedRef.current = 0
        ctx.autoCommit.setAutoCommitLoaded(true)
      })
  }

  /**
   * Re-reads the persisted agent-behavior settings after the host signals a
   * change, so this browser's pickers and toggles match the new values.
   */
  const reloadSettings = (): void => {
    if (!ctx.props.modelSelectionSignal) return
    ctx.env.http
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
      .catch((error: unknown) => {
        // Non-fatal: the change was persisted server-side; this view just won't
        // refresh until the next signal or full settings read.
        logger.debug('chat-panel: settings re-read after a change signal failed', { error })
      })
  }

  /**
   * Recovers from a saved model that left the catalog: notifies once and falls
   * back to a live model, persisting the swap for an editor.
   */
  const recoverRemovedModel = (): void => {
    if (modelsLoading.value) return
    if (!currentModel.value) return
    if (AVAILABLE_MODELS.value.some((m) => m.id === currentModel.value)) return
    const removedId = currentModel.value
    if (removedModelNotifiedRef.current === removedId) return
    const decision = resolveRemovedModelFallback(
      removedId,
      AVAILABLE_MODELS.value,
      FREE_TIER_MODEL.value,
      ctx.env.t,
    )
    removedModelNotifiedRef.current = removedId
    ctx.systemCards.addSystemCard(decision.notice)
    if (!decision.fallback) return
    const fallback = decision.fallback
    setSavedChatModel(fallback)
    // Persisting the swap writes project settings — editor+ server-side, so a
    // viewer's tab keeps the in-memory switch and skips a PATCH that could only 403.
    if (ctx.props.canEdit !== false) {
      ctx.env.http
        .patch(ctx.chat.settingsPatchUrl(), { settings: { chatModel: fallback } })
        .catch((error: unknown) => {
          // Persistence is best-effort; the in-memory switch is what matters.
          logger.warn('chat-panel: persisting the model fallback swap failed', { error })
        })
    }
  }

  return {
    planModel,
    setPlanModel,
    executeModel,
    setExecuteModel,
    commitModel,
    setCommitModel,
    compactModel,
    setCompactModel,
    savedChatModel,
    setSavedChatModel,
    modelRegions,
    setModelRegions,
    effortByMode,
    setEffortByMode,
    effortLevel,
    autoFixEnabled,
    setAutoFixEnabled,
    autoApproveCommandsEnabled,
    setAutoApproveCommandsEnabled,
    FREE_TIER_MODEL,
    AVAILABLE_MODELS,
    serverModelDefaults,
    modelsLoading,
    isFreeTier,
    effectiveModelForMode,
    currentModel,
    currentMaxLoops,
    setCurrentMaxLoops,
    effects: {
      2: () => {
        onMounted(loadSettings)
        watch([() => ctx.props.projectId, () => ctx.env.http], loadSettings, { flush: 'post' })
      },
      3: () => {
        onMounted(reloadSettings)
        watch(
          [() => ctx.props.modelSelectionSignal, () => ctx.props.projectId, () => ctx.env.http],
          reloadSettings,
          { flush: 'post' },
        )
      },
      4: () => {
        onMounted(recoverRemovedModel)
        watch(
          [modelsLoading, currentModel, AVAILABLE_MODELS, FREE_TIER_MODEL],
          recoverRemovedModel,
          {
            flush: 'post',
          },
        )
      },
    },
  }
}
