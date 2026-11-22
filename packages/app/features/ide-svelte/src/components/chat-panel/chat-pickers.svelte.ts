/**
 * React's `chat:pickers` region of ChatPanel.tsx (lines 4487–4736): the state
 * every composer picker reads — the filtered `/model` catalog and its
 * collapsible "Older models" section, the chosen sort, the per-model
 * processing-region menu, the `/effort` picker's model and level rows, and the
 * `@`-mention entries — plus the one effect that closes the region menu.
 *
 * The region has two render-phase state syncs, both mirrored with
 * `$effect.pre` so the pass that brings their input already carries the synced
 * value: the "Older models" section auto-expands when the user's saved model is
 * deprecated (or when a search matched only deprecated entries), and closing
 * the model picker closes any open region menu with it.
 *
 * `filteredCmds` belongs to the `chat:commands` unit and is kept as it was
 * written there; everything else is this region's.
 *
 * @module
 */

import type { AppModelDefinition, EffortOption } from '@molecule/app-ai-models'
import { partitionByDeprecation } from '@molecule/app-ai-models'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import {
  availableModelRegions,
  effortOptionsForModel,
  effortPickerVisibleOptions,
  type FileEntry,
  filterCommandMenu,
  filterModelsByPickerQuery,
  type ModelPicker,
  type ModelSortColumn,
  nativeEffortName,
  pickerCurrentModelId,
  rankFileMentionEntries,
  type SortDirection,
  sortModels,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, ModelRegion } from './context.svelte.js'

/** The open processing-region menu and where it anchors. */
export interface RegionMenuState {
  /** The model whose regions the menu lists. */
  modelId: string
  /** The viewport top the menu opens at. */
  top: number
  /** The viewport right offset the menu aligns to. */
  right: number
}

/** The identifiers other slices and sections read from the `chat:pickers` slice. */
export interface ChatPickersSlice {
  /** The command menu's filtered rows. */
  readonly filteredCmds: CommandDef[]
  /** The model picker's current models (non-deprecated). */
  readonly currentModels: AppModelDefinition[]
  /** The model picker's deprecated models. */
  readonly deprecatedModels: AppModelDefinition[]
  /** Whether the "Older models" section is expanded. */
  readonly showDeprecated: boolean
  /** Expands or collapses the "Older models" section. */
  readonly setShowDeprecated: ChatSetState<boolean>
  /** The model picker's sort. */
  readonly modelSort: { column: ModelSortColumn; direction: SortDirection }
  /** Sets the model picker's sort. */
  readonly setModelSort: ChatSetState<{
    column: ModelSortColumn
    direction: SortDirection
  }>
  /** The processing region a model actually uses. */
  readonly effectiveModelRegion: (model: AppModelDefinition) => ModelRegion
  /** The open processing-region menu, or null. */
  readonly regionMenu: RegionMenuState | null
  /** Opens or closes the processing-region menu. */
  readonly setRegionMenu: ChatSetState<RegionMenuState | null>
  /** Opens (or toggles closed) a model's region menu anchored to its trigger. */
  readonly toggleRegionMenu: (modelId: string, trigger: HTMLElement) => void
  /** The model rows the picker renders, in the chosen sort. */
  readonly visibleModels: AppModelDefinition[]
  /** Whether the current mode's model offers the fast tier. */
  readonly fastModeAvailable: boolean
  /** The model picker's mode dropdown options. */
  readonly pickerModeOptions: { value: string; label: string }[]
  /** The row that carries the picker's "current" pill, when there is one. */
  readonly currentPickerModelId: string | undefined
  /** The model whose effort levels the open `/effort` picker lists. */
  readonly effortPickerModel: AppModelDefinition | undefined
  /** Every effort level the picker offers. */
  readonly effortPickerOptions: EffortOption[]
  /** The effort rows the typed query leaves visible. */
  readonly effortPickerVisible: EffortOption[]
  /** The level the picker's "current" pill marks. */
  readonly effortPickerCurrent: string | null
  /** The effort picker's mode dropdown options. */
  readonly effortPickerModeOptions: { value: string; label: string }[]
  /** The `@`-picker's ranked entries. */
  readonly filteredEntries: FileEntry[]

  /** React's mount I/O for the region: none — it declares state and derived values. */
  mount(): void

  /** React's `#effect chat:pickers:<n>` entry points, at React's positions. */
  readonly effects: { 2: () => void }
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

/** The shared empty list a closed picker produces, so an unchanged picker keeps its identity. */
const NO_MODELS: AppModelDefinition[] = []

/** The shared empty entry list a closed `@` picker produces. */
const NO_ENTRIES: FileEntry[] = []

/** The shared empty option list a closed `/effort` picker produces. */
const NO_OPTIONS: EffortOption[] = []

/**
 * Creates the `chat:pickers` slice.
 *
 * @param ctx - The shared chat context.
 * @returns Every picker derivation and the region menu's effect.
 */
export function createChatPickers(ctx: ChatContext): ChatPickersSlice {
  // ── The model picker's catalog, filtered by the typed query ────────────────
  // The query is read from the picker state, kept fresh by every keystroke
  // re-setting it; the catalog read is a dependency so a custom provider's
  // in-place refresh reaches the picker.
  const filteredModels = $derived.by((): AppModelDefinition[] => {
    const picker = ctx.composer.modelPicker
    if (!picker) return NO_MODELS
    return filterModelsByPickerQuery(picker.text, ctx.models.AVAILABLE_MODELS)
  })

  const partition = $derived.by(() => partitionByDeprecation(filteredModels))
  const currentModels = $derived(partition.current)
  const deprecatedModels = $derived(partition.deprecated)

  // ── Older models section ───────────────────────────────────────────────────
  // Deprecated entries fold into a collapsed section under the current models;
  // it auto-expands when the user's current model is among them (or a search
  // matched only deprecated entries), and the user can still collapse it.
  let showDeprecated = $state(false)
  let expandCheckedFor = $state<string | null>(null)

  const setShowDeprecated: ChatSetState<boolean> = (value): void => {
    showDeprecated = resolveState(showDeprecated, value)
  }

  // The user-chosen sort, defaulting to alphabetical (the old table's default).
  let modelSort = $state.raw<{ column: ModelSortColumn; direction: SortDirection }>({
    column: 'name',
    direction: 'asc',
  })

  const setModelSort: ChatSetState<{ column: ModelSortColumn; direction: SortDirection }> = (
    value,
  ): void => {
    modelSort = resolveState(modelSort, value)
  }

  const currentIsDeprecated = $derived(
    deprecatedModels.some((model) => model.id === ctx.models.currentModel),
  )
  const onlyDeprecatedMatched = $derived(currentModels.length === 0 && deprecatedModels.length > 0)
  // A key that changes exactly when the lists or the saved model change, so the
  // auto-expand check runs once per list and model (the user can collapse again).
  const expandCheckKey = $derived(
    [
      ctx.models.currentModel,
      String(currentModels.length === 0),
      ...deprecatedModels.map((model) => model.id),
    ].join('|'),
  )

  // React's render-phase sync: when the lists or the saved model change, run the
  // check once and auto-expand if this render's model is deprecated. `$effect.pre`
  // runs before the DOM update, so the pass that brings the list carries it.
  $effect.pre(() => {
    const key = expandCheckKey
    const autoExpand = currentIsDeprecated || onlyDeprecatedMatched
    if (expandCheckedFor === key) return
    expandCheckedFor = key
    if (autoExpand) showDeprecated = true
  })

  // ── Processing-region menu ─────────────────────────────────────────────────
  // Effective processing region for a model: the per-model choice when it is one
  // of the model's available regions, else the model's default (first) region.
  const effectiveModelRegion = (model: AppModelDefinition): ModelRegion => {
    const available = availableModelRegions(model)
    const chosen = ctx.models.modelRegions[model.id]
    return chosen && available.includes(chosen) ? chosen : available[0]
  }

  // The model whose region menu is open (and where it opens), or null.
  let regionMenu = $state.raw<RegionMenuState | null>(null)

  const setRegionMenu: ChatSetState<RegionMenuState | null> = (value): void => {
    regionMenu = resolveState(regionMenu, value)
  }

  /**
   * Opens (or toggles closed) a model's region menu anchored to its trigger.
   *
   * @param modelId - The model whose regions the menu lists.
   * @param trigger - The control the menu anchors below.
   */
  const toggleRegionMenu = (modelId: string, trigger: HTMLElement): void => {
    const open = regionMenu
    if (open?.modelId === modelId) {
      regionMenu = null
      return
    }
    const rect = trigger.getBoundingClientRect()
    regionMenu = { modelId, top: rect.bottom + 2, right: window.innerWidth - rect.right }
  }

  // Closing the model picker closes any open region menu with it: checked each
  // time the picker changes (React's render-phase pattern for state that
  // follows a prop), so the menu never outlives its picker.
  let regionMenuPicker = $state.raw<ModelPicker | null>(ctx.composer.modelPicker)

  $effect.pre(() => {
    const picker = ctx.composer.modelPicker
    if (regionMenuPicker === picker) return
    regionMenuPicker = picker
    if (!picker) regionMenu = null
  })

  const visibleModels = $derived.by((): AppModelDefinition[] => {
    // Sort WITHIN each partition so the current/deprecated split is preserved
    // while the chosen sort orders the rows the user actually sees.
    const sortedCurrent = sortModels(
      currentModels,
      modelSort.column,
      modelSort.direction,
      effectiveModelRegion,
    )
    if (!showDeprecated) return sortedCurrent
    const sortedDeprecated = sortModels(
      deprecatedModels,
      modelSort.column,
      modelSort.direction,
      effectiveModelRegion,
    )
    return [...sortedCurrent, ...sortedDeprecated]
  })

  // ── Fast-mode availability ─────────────────────────────────────────────────
  // Presentation-only gating: the toggle renders only when the model serving the
  // CURRENT mode declares fast-tier pricing (the server re-checks per turn).
  const fastModeAvailable = $derived.by((): boolean => {
    const activeModeModelId = ctx.models.effectiveModelForMode(
      ctx.chat.liveModelMode === 'plan' ? 'plan' : 'execute',
    )
    return Boolean(
      ctx.models.AVAILABLE_MODELS.find((model) => model.id === activeModeModelId)?.fastPricing,
    )
  })

  // ── Model picker mode dropdown ─────────────────────────────────────────────
  // Each option names the model currently active for that mode, so re-scoping
  // the open picker is informed.
  const pickerModeOptions = $derived.by((): { value: string; label: string }[] => {
    const t = ctx.env.t
    const models = ctx.models.AVAILABLE_MODELS
    const label = (id: string): string => models.find((m) => m.id === id)?.label || id
    // Name the model "default" resolves to when the server told us.
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: label(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    // The named default for a mode whose per-mode value is unset.
    const modeDefault = (mode: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: label(ctx.models.effectiveModelForMode(mode)) },
        { defaultValue: 'Default ({{model}})' },
      )
    const rows: { value: string; mode: string; model: string }[] = [
      {
        value: '',
        mode: t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' }),
        model: ctx.models.savedChatModel
          ? label(ctx.models.savedChatModel)
          : t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' }),
      },
      {
        value: 'plan',
        mode: t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' }),
        model: ctx.models.planModel ? label(ctx.models.planModel) : modeDefault('plan'),
      },
      {
        value: 'execute',
        mode: t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
        model: ctx.models.executeModel ? label(ctx.models.executeModel) : modeDefault('execute'),
      },
      {
        value: 'commit',
        mode: t('ide.chat.modelMode.commit', undefined, { defaultValue: 'Commit messages' }),
        model: ctx.models.commitModel
          ? label(ctx.models.commitModel)
          : auxDefault(ctx.models.serverModelDefaults?.commit),
      },
      {
        value: 'compact',
        mode: t('ide.chat.modelMode.compact', undefined, { defaultValue: 'Compaction' }),
        model: ctx.models.compactModel
          ? label(ctx.models.compactModel)
          : auxDefault(ctx.models.serverModelDefaults?.compact),
      },
    ]
    return rows.map((row) => ({
      value: row.value,
      label: t(
        'ide.chat.modelModeOption',
        { mode: row.mode, model: row.model },
        { defaultValue: '{{mode}} · {{model}}' },
      ),
    }))
  })

  // The row that carries the "current" pill — the model the selected picker mode
  // actually uses, with the mode's real fallback chain.
  const currentPickerModelId = $derived(
    pickerCurrentModelId(
      ctx.composer.modelPicker,
      ctx.models.effectiveModelForMode,
      {
        planModel: ctx.models.planModel,
        executeModel: ctx.models.executeModel,
        commitModel: ctx.models.commitModel,
        compactModel: ctx.models.compactModel,
        chatModel: ctx.models.savedChatModel,
      },
      ctx.models.serverModelDefaults,
    ),
  )

  // ── Effort picker derived state ────────────────────────────────────────────
  // The model whose levels the open `/effort` picker lists — the model the
  // selected mode will actually run — plus its options and the level the
  // "current" pill marks (the persisted per-mode value resolved per model).
  const effortPickerModel = $derived.by((): AppModelDefinition | undefined => {
    const picker = ctx.composer.effortPicker
    if (!picker) return undefined
    const modelId = ctx.models.effectiveModelForMode(picker.mode)
    return ctx.models.AVAILABLE_MODELS.find((model) => model.id === modelId)
  })

  const effortPickerOptions = $derived(effortOptionsForModel(effortPickerModel))

  const effortPickerVisible = $derived.by((): EffortOption[] => {
    const picker = ctx.composer.effortPicker
    if (!picker) return NO_OPTIONS
    return effortPickerVisibleOptions(picker.text, effortPickerOptions)
  })

  const effortPickerCurrent = $derived.by((): string | null => {
    const picker = ctx.composer.effortPicker
    if (!picker) return null
    return nativeEffortName(
      effortPickerModel,
      ctx.models.effortByMode[picker.mode] ?? (ctx.models.effortLevel || undefined),
    )
  })

  // Mode dropdown rows — effort exists only for the two conversation modes,
  // each scoped to ITS model's native levels.
  const effortPickerModeOptions = $derived.by((): { value: string; label: string }[] => {
    const t = ctx.env.t
    const models = ctx.models.AVAILABLE_MODELS
    return (['plan', 'execute'] as const).map((mode) => {
      const modelId = ctx.models.effectiveModelForMode(mode)
      return {
        value: mode,
        label: t(
          'ide.chat.modelModeOption',
          {
            mode:
              mode === 'plan'
                ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
                : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
            model: models.find((model) => model.id === modelId)?.label ?? modelId,
          },
          { defaultValue: '{{mode}} · {{model}}' },
        ),
      }
    })
  })

  // ── The `@` file picker's ranked entries ───────────────────────────────────
  const filteredEntries = $derived.by((): FileEntry[] => {
    const picker = ctx.popups.filePicker
    if (!picker) return NO_ENTRIES
    return rankFileMentionEntries(
      picker.entries,
      picker.query,
      ctx.props.activeFile,
      ctx.props.openTabs,
    )
  })

  return {
    get filteredCmds(): CommandDef[] {
      // React's derivation in this region, with React's arguments (unit U6 owns
      // this one): the shared commands plus the host's extras, the open menu
      // (its text or `showAll`), the viewer's write capability and the
      // separately gated `/share`.
      return filterCommandMenu(
        ctx.commands.allCommands,
        ctx.composer.commandMenu,
        ctx.props.canEdit,
        ctx.env.shareAllowed,
      )
    },
    get currentModels(): AppModelDefinition[] {
      return currentModels
    },
    get deprecatedModels(): AppModelDefinition[] {
      return deprecatedModels
    },
    get showDeprecated(): boolean {
      return showDeprecated
    },
    setShowDeprecated,
    get modelSort(): { column: ModelSortColumn; direction: SortDirection } {
      return modelSort
    },
    setModelSort,
    effectiveModelRegion,
    get regionMenu(): RegionMenuState | null {
      return regionMenu
    },
    setRegionMenu,
    toggleRegionMenu,
    get visibleModels(): AppModelDefinition[] {
      return visibleModels
    },
    get fastModeAvailable(): boolean {
      return fastModeAvailable
    },
    get pickerModeOptions(): { value: string; label: string }[] {
      return pickerModeOptions
    },
    get currentPickerModelId(): string | undefined {
      return currentPickerModelId
    },
    get effortPickerModel(): AppModelDefinition | undefined {
      return effortPickerModel
    },
    get effortPickerOptions(): EffortOption[] {
      return effortPickerOptions
    },
    get effortPickerVisible(): EffortOption[] {
      return effortPickerVisible
    },
    get effortPickerCurrent(): string | null {
      return effortPickerCurrent
    },
    get effortPickerModeOptions(): { value: string; label: string }[] {
      return effortPickerModeOptions
    },
    get filteredEntries(): FileEntry[] {
      return filteredEntries
    },
    mount(): void {
      // React's region declares state, derived values and one effect; there is
      // no mount I/O to repeat.
    },
    effects: {
      2: (): void => {
        // Any click outside the open region menu closes it. The opening click
        // never self-closes: this listener attaches AFTER that click (post
        // render), and the control/menu handlers stopPropagation. Scroll/resize
        // also close it — the menu is fixed-positioned, so its anchor would
        // drift away from it otherwise.
        $effect(() => {
          if (!regionMenu) return
          const close = (): void => {
            regionMenu = null
          }
          document.addEventListener('click', close)
          document.addEventListener('scroll', close, true)
          window.addEventListener('resize', close)
          return () => {
            document.removeEventListener('click', close)
            document.removeEventListener('scroll', close, true)
            window.removeEventListener('resize', close)
          }
        })
      },
    },
  }
}
