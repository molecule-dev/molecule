/**
 * React's `chat:models` regions of ChatPanel.tsx: the first (lines 1921–2109)
 * holds the project-scoped catalog, the free-tier resolution, the persisted
 * agent settings (per-mode models, effort, processing regions, loop cap,
 * auto-fix, auto-approve), the mount restore that reads them in one `GET
 * /projects/:id`, and the re-read the host's change signal triggers; the second
 * (lines 2142–2184) is the removed-model recovery that announces a saved model
 * the catalog dropped once and swaps to a replacement.
 *
 * The catalog comes from the Svelte binding's `useAIModels` — the same shared,
 * scope-keyed cache React's hook uses. React fetches it from an effect
 * declared just before the settings restore, so the hook is called from the
 * FIRST run of this slice's restore effect: calling it during init would move
 * `GET /ai/models` ahead of the chat history load, which is not React's order.
 * Its stores are read through `fromStore`, so a later scope still renders.
 *
 * @module
 */

import { untrack } from 'svelte'
import { SvelteSet } from 'svelte/reactivity'
import { fromStore, get, writable } from 'svelte/store'

import type { AppModelDefinition, AppModeModelDefaults, EffortLevel } from '@molecule/app-ai-models'
import { resolveAutoCommitSeconds } from '@molecule/app-ide-panel-logic'
import {
  effectiveModeModelId,
  type EffortMode,
  mergeSoundsConfig,
  parseChatProjectSettings,
  resolveRemovedModelFallback,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { useAIModels, type UseAIModelsResult } from '@molecule/app-svelte/ai-models'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, ModelRegion } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/**
 * The list readers see while the catalog loads or after a failed fetch. One
 * module-level array, the way the catalog's own lists are shared: a new `[]`
 * per read would change the identity of an unchanged catalog.
 */
const NO_MODELS: AppModelDefinition[] = []

/** The identifiers other slices and sections read from the `chat:models` slice. */
export interface ChatModelsSlice {
  /** The project's catalog: platform models plus its own custom ones. */
  readonly AVAILABLE_MODELS: AppModelDefinition[]
  /** The server's per-mode default model ids, or undefined while loading. */
  readonly serverModelDefaults: AppModeModelDefaults | undefined
  /** Whether the catalog is still loading. */
  readonly modelsLoading: boolean
  /** The id of the model a free conversation falls back to. */
  readonly FREE_TIER_MODEL: string
  /** Whether the viewer is on the free tier. */
  readonly isFreeTier: boolean
  /** The PERSISTED legacy chat model (never seeded with the catalog default). */
  readonly savedChatModel: string
  /** Sets the persisted legacy chat model. */
  readonly setSavedChatModel: ChatSetState<string>
  /** The plan-mode model override ('' = unset). */
  readonly planModel: string
  /** Sets the plan-mode model override. */
  readonly setPlanModel: ChatSetState<string>
  /** The execute-mode model override ('' = unset). */
  readonly executeModel: string
  /** Sets the execute-mode model override. */
  readonly setExecuteModel: ChatSetState<string>
  /** The commit-message model override ('' = unset). */
  readonly commitModel: string
  /** Sets the commit-message model override. */
  readonly setCommitModel: ChatSetState<string>
  /** The compaction model override ('' = unset). */
  readonly compactModel: string
  /** Sets the compaction model override. */
  readonly setCompactModel: ChatSetState<string>
  /** The legacy effort level used when a mode has no explicit entry. */
  readonly effortLevel: EffortLevel
  /** The per-mode effort levels. */
  readonly effortByMode: Partial<Record<EffortMode, EffortLevel>>
  /** Sets the per-mode effort levels. */
  readonly setEffortByMode: ChatSetState<Partial<Record<EffortMode, EffortLevel>>>
  /** The per-model processing regions. */
  readonly modelRegions: Record<string, ModelRegion>
  /** Sets the per-model processing regions. */
  readonly setModelRegions: ChatSetState<Record<string, ModelRegion>>
  /** The agentic loop cap. */
  readonly currentMaxLoops: number
  /** Sets the agentic loop cap. */
  readonly setCurrentMaxLoops: ChatSetState<number>
  /** Whether the verification auto-fix is enabled. */
  readonly autoFixEnabled: boolean
  /** Sets the auto-fix preference. */
  readonly setAutoFixEnabled: ChatSetState<boolean>
  /** Whether destructive commands skip their confirmation. */
  readonly autoApproveCommandsEnabled: boolean
  /** Sets the auto-approve preference. */
  readonly setAutoApproveCommandsEnabled: ChatSetState<boolean>
  /** The model the default slot resolves to (saved choice, else the free tier). */
  readonly currentModel: string
  /** The model a conversation mode will actually use. */
  readonly effectiveModelForMode: (mode: 'plan' | 'execute') => string

  /** React's mount I/O for the region: none — it declares state and two effects. */
  mount(): void

  /** React's `#effect chat:models:<n>` entry points, at React's positions. */
  readonly effects: { 2: () => void; 3: () => void; 4: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * The catalog's stores as current-value readers, so a getter read during
 * render subscribes to the value it shows.
 */
interface CatalogView {
  /** The scope's models. */
  readonly models: { readonly current: AppModelDefinition[] }
  /** The server's per-mode defaults. */
  readonly defaults: { readonly current: AppModeModelDefaults | undefined }
  /** The model marked free-tier, when the scope has one. */
  readonly freeTierModel: { readonly current: AppModelDefinition | undefined }
  /** Whether the scope's first fetch is in flight. */
  readonly loading: { readonly current: boolean }
}

/**
 * Creates the `chat:models` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The catalog view, every persisted agent setting and effects 2–3.
 */
export function createChatModels(ctx: ChatContext): ChatModelsSlice {
  let catalog = $state.raw<CatalogView | null>(null)
  let savedChatModel = $state('')
  let planModel = $state('')
  let executeModel = $state('')
  let commitModel = $state('')
  let compactModel = $state('')
  let effortLevel = $state<EffortLevel>('')
  let effortByMode = $state.raw<Partial<Record<EffortMode, EffortLevel>>>({})
  let modelRegions = $state.raw<Record<string, ModelRegion>>({})
  let currentMaxLoops = $state(100)
  let autoFixEnabled = $state(true)
  let autoApproveCommandsEnabled = $state(false)
  // The project id the catalog hook follows. React passes its prop straight to
  // `useAIModels`; here the hook is created on the restore effect's first run,
  // and a project change re-points it the way React's effect re-runs.
  const scope = writable<string | undefined>(undefined)
  // The hook instance, created once (a plain holder: nothing renders it).
  let catalogHook: UseAIModelsResult | null = null
  // The removed model id already announced, so a re-render does not fire the
  // card (or patch the project) again — React's `removedModelNotifiedRef`.
  // React tracks the id so a second, different removed model can be announced.
  const removedModelNotifiedRef: { current: string | null } = { current: null }
  // The props this slice's effects depend on, read through derived cells: the
  // props object invalidates as a whole when the host changes any prop, and a
  // derived re-notifies only when ITS value changed — React's per-dependency
  // effects, not one re-run per unrelated prop.
  const liveProjectId = $derived(ctx.props.projectId)
  const liveModelSelectionSignal = $derived(ctx.props.modelSelectionSignal)

  /**
   * The catalog's models for the current scope.
   *
   * @returns The models, or the shared empty list before the catalog resolves.
   */
  const availableModels = (): AppModelDefinition[] => catalog?.models.current ?? NO_MODELS

  /**
   * The server's per-mode default model ids for the current scope.
   *
   * @returns The defaults, or `undefined` while the catalog loads.
   */
  const serverDefaults = (): AppModeModelDefaults | undefined => catalog?.defaults.current

  /**
   * The id of the model a free conversation falls back to.
   *
   * @returns The free-tier model's id, else the first catalog entry's, else `''`.
   */
  const freeTierModelId = (): string =>
    catalog?.freeTierModel.current?.id ?? availableModels()[0]?.id ?? ''

  /** React's `setSavedChatModel`. */
  const setSavedChatModel: ChatSetState<string> = (value) => {
    savedChatModel = resolveState(savedChatModel, value)
  }
  /** React's `setPlanModel`. */
  const setPlanModel: ChatSetState<string> = (value) => {
    planModel = resolveState(planModel, value)
  }
  /** React's `setExecuteModel`. */
  const setExecuteModel: ChatSetState<string> = (value) => {
    executeModel = resolveState(executeModel, value)
  }
  /** React's `setCommitModel`. */
  const setCommitModel: ChatSetState<string> = (value) => {
    commitModel = resolveState(commitModel, value)
  }
  /** React's `setCompactModel`. */
  const setCompactModel: ChatSetState<string> = (value) => {
    compactModel = resolveState(compactModel, value)
  }
  /** React's `setEffortByMode`. */
  const setEffortByMode: ChatSetState<Partial<Record<EffortMode, EffortLevel>>> = (value) => {
    effortByMode = resolveState(effortByMode, value)
  }
  /** React's `setModelRegions`. */
  const setModelRegions: ChatSetState<Record<string, ModelRegion>> = (value) => {
    modelRegions = resolveState(modelRegions, value)
  }
  /** React's `setCurrentMaxLoops`. */
  const setCurrentMaxLoops: ChatSetState<number> = (value) => {
    currentMaxLoops = resolveState(currentMaxLoops, value)
  }
  /** React's `setAutoFixEnabled`. */
  const setAutoFixEnabled: ChatSetState<boolean> = (value) => {
    autoFixEnabled = resolveState(autoFixEnabled, value)
  }
  /** React's `setAutoApproveCommandsEnabled`. */
  const setAutoApproveCommandsEnabled: ChatSetState<boolean> = (value) => {
    autoApproveCommandsEnabled = resolveState(autoApproveCommandsEnabled, value)
  }

  return {
    get AVAILABLE_MODELS(): AppModelDefinition[] {
      return availableModels()
    },
    get serverModelDefaults(): AppModeModelDefaults | undefined {
      return serverDefaults()
    },
    get modelsLoading(): boolean {
      // Before the hook is created the catalog is the one React's first render
      // reads from an empty cache: no models yet, so it is loading.
      return catalog ? catalog.loading.current : true
    },
    get FREE_TIER_MODEL(): string {
      return freeTierModelId()
    },
    get isFreeTier(): boolean {
      return !ctx.props.isPro
    },
    get savedChatModel(): string {
      return savedChatModel
    },
    setSavedChatModel,
    get planModel(): string {
      return planModel
    },
    setPlanModel,
    get executeModel(): string {
      return executeModel
    },
    setExecuteModel,
    get commitModel(): string {
      return commitModel
    },
    setCommitModel,
    get compactModel(): string {
      return compactModel
    },
    setCompactModel,
    get effortLevel(): EffortLevel {
      return effortLevel
    },
    get effortByMode(): Partial<Record<EffortMode, EffortLevel>> {
      return effortByMode
    },
    setEffortByMode,
    get modelRegions(): Record<string, ModelRegion> {
      return modelRegions
    },
    setModelRegions,
    get currentMaxLoops(): number {
      return currentMaxLoops
    },
    setCurrentMaxLoops,
    get autoFixEnabled(): boolean {
      return autoFixEnabled
    },
    setAutoFixEnabled,
    get autoApproveCommandsEnabled(): boolean {
      return autoApproveCommandsEnabled
    },
    setAutoApproveCommandsEnabled,
    get currentModel(): string {
      // Adopt the free-tier model id as soon as the catalog resolves, unless
      // the project settings already populated a saved choice.
      return savedChatModel || freeTierModelId()
    },
    effectiveModelForMode(mode: 'plan' | 'execute'): string {
      // Mirrors the server's selection chain: per-mode setting → saved
      // chatModel → the server-sent per-mode default → the catalog clamp.
      return effectiveModeModelId(
        mode,
        { planModel, executeModel, chatModel: savedChatModel },
        serverDefaults(),
        !ctx.props.isPro,
        availableModels(),
        freeTierModelId(),
      )
    },
    mount(): void {
      // React's region declares state and two effects; there is no mount I/O.
    },
    effects: {
      2: (): void => {
        // React's `useAIModels(projectId)` effect, declared just before the
        // settings restore. It is created by an effect with NO dependencies, so
        // the catalog survives the panel's life: a hook created by a re-running
        // effect would lose its store subscriptions to that effect's teardown.
        $effect(() => {
          if (catalogHook) return
          const projectId = untrack(() => ctx.props.projectId)
          scope.set(projectId)
          catalogHook = useAIModels(scope)
          catalog = {
            models: fromStore(catalogHook.models),
            defaults: fromStore(catalogHook.defaults),
            freeTierModel: fromStore(catalogHook.freeTierModel),
            loading: fromStore(catalogHook.loading),
          }
        })
        $effect(() => {
          const projectId = liveProjectId
          const http = ctx.env.http
          // A project change re-points the catalog the way React's effect
          // re-runs; the GET below then reads the new project's settings.
          if (get(scope) !== projectId) scope.set(projectId)
          http
            .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
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
                effortLevel = parsed.effortLevel
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
                // An explicit saved set wins over the "all initial skills"
                // default.
                ctx.skills.defaultSkillsExplicitRef.current = true
                ctx.skills.setDefaultSkillsExplicit(true)
                ctx.skills.setDefaultSkillPaths(
                  new SvelteSet(
                    savedDefaultSkills.filter((p): p is string => typeof p === 'string'),
                  ),
                )
              }
              if (parsed.maxToolLoops !== undefined) setCurrentMaxLoops(parsed.maxToolLoops)
              if (parsed.autoFix !== undefined) setAutoFixEnabled(parsed.autoFix)
              if (parsed.autoApproveCommands !== undefined) {
                setAutoApproveCommandsEnabled(parsed.autoApproveCommands)
              }
              // Legacy migration only: sounds are per-device (localStorage)
              // now — apply the old project-level value only when this device
              // has no local pref.
              if (
                s?.sounds &&
                typeof s.sounds === 'object' &&
                !ctx.sounds.soundsLocallySetRef.current
              ) {
                ctx.sounds.setSoundsConfig((prev) => mergeSoundsConfig(prev, s.sounds))
              }
              // Restore the persisted auto-commit cadence in the paused state
              // (it re-arms on the next file change). Never for a read-only
              // viewer: /commit is an editor action.
              const savedAutoCommit = resolveAutoCommitSeconds(s?.autoCommitSeconds)
              ctx.autoCommit.autoCommitPersistedRef.current = savedAutoCommit
              if (savedAutoCommit > 0 && ctx.autoCommit.readCanEdit() !== false) {
                ctx.autoCommit.dispatchAutoCommit({ type: 'hydrate', seconds: savedAutoCommit })
              }
              ctx.autoCommit.setAutoCommitLoaded(true)
            })
            .catch((error) => {
              // Settings load failed: leave auto-commit off for this session —
              // we can't know whether the user explicitly disabled it, and
              // committing against an explicit off is worse than skipping the
              // default-on. A later explicit /autocommit still persists.
              logger.warn(
                'chat-panel: project settings load failed; auto-commit left off this session',
                { error },
              )
              ctx.autoCommit.autoCommitPersistedRef.current = 0
              ctx.autoCommit.setAutoCommitLoaded(true)
            })
        })
      },
      3: (): void => {
        $effect(() => {
          const signal = liveModelSelectionSignal
          const projectId = liveProjectId
          const http = ctx.env.http
          if (!signal) return
          // Re-read the persisted agent-behavior settings when the host signals
          // a change: the provider modal's "Use" button, or a resource_change
          // broadcast saying ANOTHER member changed the project — so this
          // browser's pickers and toggles match the change instead of rendering
          // stale values. Deliberately does NOT touch auto-commit or skills.
          http
            .get<{ settings?: Record<string, unknown> }>(`/projects/${projectId}`)
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
              if (parsed.effortLevel !== undefined) effortLevel = parsed.effortLevel
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
      4: (): void => {
        // Removed-model recovery: if the saved chatModel has left the catalog (a
        // provider retired it, or we pruned the entry), notify once and fall
        // back — first to a still-available model of the SAME custom provider,
        // else the free-tier model. An empty catalog notices without a swap.
        $effect(() => {
          const loading = catalog ? catalog.loading.current : true
          const model = savedChatModel || freeTierModelId()
          const models = availableModels()
          const freeTier = freeTierModelId()
          const canEdit = ctx.props.canEdit
          if (loading) return
          if (!model) return
          if (models.some((m) => m.id === model)) return
          const removedId = model
          if (removedModelNotifiedRef.current === removedId) return
          const decision = resolveRemovedModelFallback(removedId, models, freeTier, ctx.env.t)
          removedModelNotifiedRef.current = removedId
          ctx.systemCards.addSystemCard(decision.notice)
          if (!decision.fallback) return
          const fallback = decision.fallback
          setSavedChatModel(fallback)
          // Persisting the swap writes project settings — editor+ server-side,
          // so a viewer's tab keeps the in-memory switch (all this session
          // needs) and skips a PATCH that could only 403.
          if (canEdit !== false) {
            ctx.env.http
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
