/**
 * `chat:pickers` — the model / effort / sounds picker derivations, ported from
 * React's `chat:pickers` region: the visible rows, the sort, the mode options,
 * the region menu, the deprecated-model toggles and the file-mention ranking.
 *
 * Every `useMemo` React recomputes is a `computed` here, so a derivation follows
 * the state it reads. The two bits of state React adjusts WHILE rendering (the
 * "Older models" auto-expand and closing the region menu with its picker) are
 * synced by `flush: 'pre'` watchers, which run before this component
 * re-renders — so the pass that follows already sees the new state, as React's
 * render-time update does. `#effect chat:pickers:2` (the outside-click /
 * scroll / resize listener) is registered at React's effect position.
 *
 * `filteredCmds` is U6's (the command menu's only consumer) and stays as filled;
 * `filteredEntries` ranks the `@` picker's entries from the popups slice's
 * `filePicker` state.
 *
 * @module
 */

import { computed, type ComputedRef, type Ref, ref, watch } from 'vue'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { partitionByDeprecation } from '@molecule/app-ai-models'
import type {
  CommandDef,
  EffortLevel,
  EffortOption,
  FileEntry,
  ModelSortColumn,
  SortDirection,
} from '@molecule/app-ide-panel-logic/panels'
import {
  availableModelRegions,
  effortOptionsForModel,
  effortPickerVisibleOptions,
  filterCommandMenu,
  filterModelsByPickerQuery,
  nativeEffortName,
  pickerCurrentModelId,
  rankFileMentionEntries,
  sortModels,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, SetState } from './context.js'
import type { ModelRegion } from './use-chat-models.js'

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

/** One option row of a picker's header select. */
export interface PickerModeOption {
  /** The select's value. */
  value: string
  /** The row's label. */
  label: string
}

/** The model picker's sort setting. */
export interface ModelSortState {
  /** The column to sort by. */
  column: ModelSortColumn
  /** The direction. */
  direction: SortDirection
}

/** The open billing-region menu, positioned at its trigger. */
export interface RegionMenuState {
  /** The model whose regions the menu lists. */
  modelId: string
  /** The menu's top offset (the trigger's bottom). */
  top: number
  /** The menu's right offset. */
  right: number
}

/** What the `chat:pickers` slice exposes. */
export interface ChatPickersSlice {
  /** The effort options the typed `/effort` text leaves visible. */
  readonly effortPickerVisible: ComputedRef<EffortOption[]>
  /** The models the `/model` picker's query leaves visible. */
  readonly visibleModels: ComputedRef<AppModelDefinition[]>
  /** The `@` picker's ranked entries. */
  readonly filteredEntries: ComputedRef<FileEntry[]>
  /** The commands the command menu's query leaves visible. */
  readonly filteredCmds: ComputedRef<readonly CommandDef[]>
  /** The model whose effort the picker scopes to, or `undefined`. */
  readonly effortPickerModel: ComputedRef<AppModelDefinition | undefined>
  /** The deprecated models (hidden unless the toggle is on). */
  readonly deprecatedModels: ComputedRef<AppModelDefinition[]>
  /** The mode options of the model picker's header. */
  readonly pickerModeOptions: ComputedRef<PickerModeOption[]>
  /** The model picker's sort setting. */
  readonly modelSort: Ref<ModelSortState>
  /** Sets the model picker's sort. */
  readonly setModelSort: SetState<ModelSortState>
  /** The models the current mode offers. */
  readonly currentModels: ComputedRef<AppModelDefinition[]>
  /** The billing region a model resolves to. */
  readonly effectiveModelRegion: (model: AppModelDefinition) => ModelRegion
  /** Whether deprecated models are listed. */
  readonly showDeprecated: Ref<boolean>
  /** Sets the deprecated-model toggle. */
  readonly setShowDeprecated: SetState<boolean>
  /** The model the picker marks current. */
  readonly currentPickerModelId: ComputedRef<string>
  /** The open billing-region menu, or `null`. */
  readonly regionMenu: Ref<RegionMenuState | null>
  /** Sets the region menu. */
  readonly setRegionMenu: SetState<RegionMenuState | null>
  /** Opens / closes the region menu at its trigger. */
  readonly toggleRegionMenu: (modelId: string, trigger: HTMLElement) => void
  /** The effort picker's mode options. */
  readonly effortPickerModeOptions: ComputedRef<PickerModeOption[]>
  /** The effort picker's option rows. */
  readonly effortPickerOptions: ComputedRef<EffortOption[]>
  /** The effort the picker marks current. */
  readonly effortPickerCurrent: ComputedRef<EffortLevel>
  /** Whether the fast-mode row is offered. */
  readonly fastModeAvailable: ComputedRef<boolean>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:pickers:2`. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:pickers` slice.
 *
 * @param ctx - The panel context (`filteredCmds` reads the commands, the open
 *   command menu, the edit right and the share right from it; the model and
 *   effort rows read the catalog, the persisted settings and the open pickers).
 * @returns The pickers slice.
 */
export function createChatPickers(ctx: ChatCtx): ChatPickersSlice {
  const filteredModels = computed<AppModelDefinition[]>(() => {
    const modelPicker = ctx.composer.modelPicker.value
    if (!modelPicker) return []
    return filterModelsByPickerQuery(modelPicker.text, ctx.models.AVAILABLE_MODELS.value)
    // AVAILABLE_MODELS MUST be a dep: when a custom provider is edited (a model
    // renamed/added, a URL changed) the catalog refreshes in place, and without
    // this the picker keeps rendering the pre-edit snapshot — the new model
    // never appears and can't be selected. (The query is read from the
    // composer's live text and stays fresh because each keystroke re-sets the
    // picker.)
  })

  // ── Older models section ────────────────────────────────────────────────────
  // Deprecated entries fold into a collapsed "Older models" section under the
  // current models. The section auto-expands when the user's current model is in
  // it so they can see what's selected — they can still collapse it manually.
  const partitionedModels = computed(() => partitionByDeprecation(filteredModels.value))
  const currentModels = computed<AppModelDefinition[]>(() => partitionedModels.value.current)
  const deprecatedModels = computed<AppModelDefinition[]>(() => partitionedModels.value.deprecated)
  const showDeprecated = ref(false)
  const setShowDeprecated = makeSetter(showDeprecated)
  // User-chosen sort for the `/model` picker (replaces the removed `/models`
  // table). Defaults to alphabetical, matching the old table's default sort.
  const modelSort = ref<ModelSortState>({ column: 'name', direction: 'asc' })
  const setModelSort = makeSetter(modelSort)

  // Auto-expand when the user's saved model is deprecated, or when a search
  // query matched only deprecated entries. Checked once per list and model, in
  // the render that brings them, so the user can still collapse manually.
  //
  // React runs this check while rendering and records the key it ran for; the
  // `flush: 'pre'` watcher runs before this component re-renders, so the pass
  // that brings a new list already carries the expanded state. The key is
  // seeded with the mount-time value, exactly as React's first render hits it.
  const expandCheckKey = computed(() =>
    [
      ctx.models.currentModel.value,
      String(currentModels.value.length === 0),
      ...deprecatedModels.value.map((m) => m.id),
    ].join('|'),
  )
  let expandCheckedFor = expandCheckKey.value
  watch(
    expandCheckKey,
    (key) => {
      if (expandCheckedFor === key) return
      expandCheckedFor = key
      const currentIsDeprecated = deprecatedModels.value.some(
        (m) => m.id === ctx.models.currentModel.value,
      )
      const onlyDeprecatedMatched =
        currentModels.value.length === 0 && deprecatedModels.value.length > 0
      if (currentIsDeprecated || onlyDeprecatedMatched) setShowDeprecated(true)
    },
    { flush: 'pre' },
  )

  // Effective processing region for any model: the per-model choice when it's
  // one of the model's available regions, else the model's default (first
  // available region). Drives the picker's flag pill AND the `region` sort
  // column.
  const effectiveModelRegion = (model: AppModelDefinition): ModelRegion => {
    const available = availableModelRegions(model)
    const chosen = ctx.models.modelRegions.value[model.id]
    return chosen && available.includes(chosen) ? chosen : available[0]
  }

  // Which model's region menu (the region control's dropdown) is open, if any,
  // plus the viewport coords it opens at. The menu renders position:fixed just
  // BELOW the control (top = trigger bottom, right edges aligned) so the
  // picker's scroll container can't clip it and it never collides with the
  // control's tooltip (which sits above and is hidden while the menu is open).
  const regionMenu = ref<RegionMenuState | null>(null)
  const setRegionMenu = makeSetter(regionMenu)

  /**
   * Opens (or toggles closed) a model's region menu anchored to `trigger`.
   *
   * @param modelId - The model whose regions the menu lists.
   * @param trigger - The control the menu anchors to.
   */
  const toggleRegionMenu = (modelId: string, trigger: HTMLElement): void => {
    setRegionMenu((open) => {
      if (open?.modelId === modelId) return null
      const rect = trigger.getBoundingClientRect()
      return { modelId, top: rect.bottom + 2, right: window.innerWidth - rect.right }
    })
  }

  // Closing the model picker closes any open region menu with it: checked each
  // time the picker changes, while rendering (React's pattern for state that
  // follows a prop). The `flush: 'pre'` watcher runs before this component
  // re-renders, so the picker and its menu go away in the same pass.
  let regionMenuPicker = ctx.composer.modelPicker.value
  watch(
    ctx.composer.modelPicker,
    (modelPicker) => {
      if (regionMenuPicker === modelPicker) return
      regionMenuPicker = modelPicker
      if (!modelPicker) setRegionMenu(null)
    },
    { flush: 'pre' },
  )

  const visibleModels = computed<AppModelDefinition[]>(() => {
    // Sort WITHIN each partition so the current/deprecated split (and the
    // `idx >= currentModels.length` divider logic) is preserved while the
    // chosen sort orders the rows the user actually sees.
    const sortedCurrent = sortModels(
      currentModels.value,
      modelSort.value.column,
      modelSort.value.direction,
      effectiveModelRegion,
    )
    if (!showDeprecated.value) return sortedCurrent
    const sortedDeprecated = sortModels(
      deprecatedModels.value,
      modelSort.value.column,
      modelSort.value.direction,
      effectiveModelRegion,
    )
    return [...sortedCurrent, ...sortedDeprecated]
  })

  // ── Fast mode (⚡) availability ──────────────────────────────────────────────
  // The composer toggle renders only when the model that will serve the CURRENT
  // mode declares fast-tier pricing (`fastPricing` — e.g. Claude Opus 5). The
  // server re-checks per iteration, so this is presentation-only gating.
  const fastModeAvailable = computed<boolean>(() => {
    const activeModeModelId = ctx.models.effectiveModelForMode(ctx.chat.liveModelMode.value)
    return Boolean(
      ctx.models.AVAILABLE_MODELS.value.find((m) => m.id === activeModeModelId)?.fastPricing,
    )
  })

  // ── Model-picker mode dropdown ──────────────────────────────────────────────
  // Options for the picker's mode selector; each shows the model currently
  // active for that mode (persisted value, else its fallback labeling) so
  // re-scoping the open picker is informed. Cheap to recompute per render.
  const pickerModeOptions = computed<PickerModeOption[]>(() => {
    const t = ctx.env.t
    const availableModels = ctx.models.AVAILABLE_MODELS.value
    const label = (id: string): string => availableModels.find((m) => m.id === id)?.label || id
    // Name the model "default" resolves to when the server told us
    // ("Default (DeepSeek V4 Flash)") — a bare "Fast default" is not decodable.
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: label(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    // The named-default helper ("Default (<model>)") for a mode whose per-mode
    // value is unset — names what the mode ACTUALLY resolves to (saved default
    // model, else the server's per-mode default), never a vague phrase and
    // never the wrong mode's model.
    const modeDefault = (m: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: label(ctx.models.effectiveModelForMode(m)) },
        { defaultValue: 'Default ({{model}})' },
      )
    const savedChatModel = ctx.models.savedChatModel.value
    const planModel = ctx.models.planModel.value
    const executeModel = ctx.models.executeModel.value
    const commitModel = ctx.models.commitModel.value
    const compactModel = ctx.models.compactModel.value
    const serverModelDefaults = ctx.models.serverModelDefaults.value
    const rows: { value: string; mode: string; model: string }[] = [
      {
        value: '',
        mode: t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' }),
        model: savedChatModel
          ? label(savedChatModel)
          : t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' }),
      },
      {
        value: 'plan',
        mode: t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' }),
        model: planModel ? label(planModel) : modeDefault('plan'),
      },
      {
        value: 'execute',
        mode: t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
        model: executeModel ? label(executeModel) : modeDefault('execute'),
      },
      {
        value: 'commit',
        mode: t('ide.chat.modelMode.commit', undefined, { defaultValue: 'Commit messages' }),
        model: commitModel ? label(commitModel) : auxDefault(serverModelDefaults?.commit),
      },
      {
        value: 'compact',
        mode: t('ide.chat.modelMode.compact', undefined, { defaultValue: 'Compaction' }),
        model: compactModel ? label(compactModel) : auxDefault(serverModelDefaults?.compact),
      },
    ]
    return rows.map((r) => ({
      value: r.value,
      label: t(
        'ide.chat.modelModeOption',
        { mode: r.mode, model: r.model },
        { defaultValue: '{{mode}} · {{model}}' },
      ),
    }))
  })

  // The row that gets the "current" pill — the model the selected picker mode
  // actually uses (its per-mode value with the mode's REAL fallback chain), not
  // unconditionally the legacy chatModel. The generic (no-mode) picker edits
  // the default slot, so its pill is the SAVED default only — a seeded catalog
  // default is not a choice and must not masquerade as one.
  const currentPickerModelId = computed<string>(
    () =>
      pickerCurrentModelId(
        ctx.composer.modelPicker.value,
        ctx.models.effectiveModelForMode,
        {
          planModel: ctx.models.planModel.value,
          executeModel: ctx.models.executeModel.value,
          commitModel: ctx.models.commitModel.value,
          compactModel: ctx.models.compactModel.value,
          chatModel: ctx.models.savedChatModel.value,
        },
        ctx.models.serverModelDefaults.value,
      ) ?? '',
  )

  // ── Effort picker derived state ─────────────────────────────────────────────
  // The model whose levels the open /effort picker lists — the model the
  // selected mode will actually run — plus its selectable options and the level
  // the "current" pill marks (the persisted per-mode value resolved per-model,
  // so an unset mode correctly pills the model's own default). Cheap to
  // recompute per render, mirroring pickerModeOptions above.
  const effortPickerModel = computed<AppModelDefinition | undefined>(() => {
    const effortPicker = ctx.composer.effortPicker.value
    if (!effortPicker) return undefined
    return ctx.models.AVAILABLE_MODELS.value.find(
      (m) => m.id === ctx.models.effectiveModelForMode(effortPicker.mode),
    )
  })
  const effortPickerOptions = computed<EffortOption[]>(() =>
    effortOptionsForModel(effortPickerModel.value),
  )
  // Typed filter, mirroring filteredModels: the text after "/effort" (minus a
  // mode flag) narrows the rows, so "/effort xh" + Enter selects xhigh. Read
  // from the composer's live text — it stays fresh because each keystroke
  // re-sets effortPicker.
  const effortPickerVisible = computed<EffortOption[]>(() => {
    const effortPicker = ctx.composer.effortPicker.value
    return effortPicker
      ? effortPickerVisibleOptions(effortPicker.text, effortPickerOptions.value)
      : []
  })
  const effortPickerCurrent = computed<EffortLevel>(() => {
    const effortPicker = ctx.composer.effortPicker.value
    if (!effortPicker) return ''
    return (
      nativeEffortName(
        effortPickerModel.value,
        ctx.models.effortByMode.value[effortPicker.mode] ??
          (ctx.models.effortLevel.value || undefined),
      ) ?? ''
    )
  })
  // Mode dropdown rows ("Plan · <model>") — effort exists only for the two
  // conversation modes, each scoped to ITS model's native levels.
  const effortPickerModeOptions = computed<PickerModeOption[]>(() => {
    const t = ctx.env.t
    const availableModels = ctx.models.AVAILABLE_MODELS.value
    return (['plan', 'execute'] as const).map((m) => ({
      value: m,
      label: t(
        'ide.chat.modelModeOption',
        {
          mode:
            m === 'plan'
              ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
              : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
          model:
            availableModels.find((x) => x.id === ctx.models.effectiveModelForMode(m))?.label ??
            ctx.models.effectiveModelForMode(m),
        },
        { defaultValue: '{{mode}} · {{model}}' },
      ),
    }))
  })

  const filteredEntries = computed<FileEntry[]>(() => {
    const filePicker = ctx.popups.filePicker.value
    if (!filePicker) return []
    return rankFileMentionEntries(
      filePicker.entries,
      filePicker.query,
      ctx.props.activeFile,
      ctx.props.openTabs,
    )
  })

  return {
    effortPickerVisible,
    visibleModels,
    filteredEntries,
    // React: `filterCommandMenu(allCommands, commandMenu, canEdit, shareAllowed)`.
    filteredCmds: computed(() =>
      filterCommandMenu(
        ctx.commands.allCommands.value,
        ctx.composer.commandMenu.value,
        ctx.props.canEdit,
        ctx.env.shareAllowed.value,
      ),
    ),
    effortPickerModel,
    deprecatedModels,
    pickerModeOptions,
    modelSort,
    setModelSort,
    currentModels,
    effectiveModelRegion,
    showDeprecated,
    setShowDeprecated,
    currentPickerModelId,
    regionMenu,
    setRegionMenu,
    toggleRegionMenu,
    effortPickerModeOptions,
    effortPickerOptions,
    effortPickerCurrent,
    fastModeAvailable,
    effects: {
      2: () => {
        // The open region menu closes on any outside click, any scroll (capture)
        // and any resize — it is fixed-positioned, so its anchor would drift
        // away from it otherwise. React attaches the listeners AFTER the render
        // that opened the menu, so the opening click never self-closes; the
        // watcher's `flush: 'post'` keeps that ordering.
        let detach: (() => void) | null = null
        watch(
          regionMenu,
          (menu) => {
            detach?.()
            detach = null
            if (!menu) return
            const close = (): void => setRegionMenu(null)
            document.addEventListener('click', close)
            document.addEventListener('scroll', close, true)
            window.addEventListener('resize', close)
            detach = () => {
              document.removeEventListener('click', close)
              document.removeEventListener('scroll', close, true)
              window.removeEventListener('resize', close)
            }
          },
          { flush: 'post' },
        )
      },
    },
  }
}
