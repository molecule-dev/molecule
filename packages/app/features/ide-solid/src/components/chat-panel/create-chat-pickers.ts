/**
 * `chat:pickers` — the derived rows every picker renders (commands, models,
 * effort, files) and the processing-region menu (React's `chat:pickers` region,
 * ported by unit U11; its command rows were unit U6's and stay as written).
 *
 * Almost everything here is derived state: the model rows come from the
 * catalog, the typed picker text and the chosen sort; the effort rows come from
 * the mode's model; the `@`-picker's rows come from the file list, the focused
 * file and the open tabs. The region has one effect — the click / capture-scroll
 * / resize listeners that close the open processing-region menu — at React's
 * `#effect chat:pickers:2` position.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

import type { AppModelDefinition, EffortOption } from '@molecule/app-ai-models'
import { partitionByDeprecation } from '@molecule/app-ai-models'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import type {
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

import type { ChatInnerCtx, ModelRegion, SliceEffects } from './context.js'

/** The open processing-region menu and where it anchors. */
export interface RegionMenuState {
  /** The model whose regions the menu lists. */
  modelId: string
  /** The viewport top the menu opens at. */
  top: number
  /** The viewport right offset the menu aligns to. */
  right: number
}

/** What other slices read from `chat:pickers`. */
export interface ChatPickersSlice {
  /** The command menu's filtered rows. */
  filteredCmds: Accessor<CommandDef[]>
  /** The model picker's current models (non-deprecated). */
  currentModels: Accessor<AppModelDefinition[]>
  /** The model picker's deprecated models. */
  deprecatedModels: Accessor<AppModelDefinition[]>
  /** Whether the "Older models" section is expanded. */
  showDeprecated: Accessor<boolean>
  /** Expands or collapses the "Older models" section. */
  setShowDeprecated: Setter<boolean>
  /** The model picker's sort. */
  modelSort: Accessor<{ column: ModelSortColumn; direction: SortDirection }>
  /** Sets the model picker's sort. */
  setModelSort: Setter<{ column: ModelSortColumn; direction: SortDirection }>
  /** The processing region a model actually uses. */
  effectiveModelRegion: (model: AppModelDefinition) => ModelRegion
  /** The open processing-region menu, or null. */
  regionMenu: Accessor<RegionMenuState | null>
  /** Opens or closes the processing-region menu. */
  setRegionMenu: Setter<RegionMenuState | null>
  /** Opens (or toggles closed) a model's region menu anchored to its trigger. */
  toggleRegionMenu: (modelId: string, trigger: HTMLElement) => void
  /** The model rows the picker renders, in the chosen sort. */
  visibleModels: Accessor<AppModelDefinition[]>
  /** Whether the current mode's model offers the fast tier. */
  fastModeAvailable: Accessor<boolean>
  /** The model picker's mode dropdown options. */
  pickerModeOptions: Accessor<{ value: string; label: string }[]>
  /** The row that carries the picker's "current" pill, when there is one. */
  currentPickerModelId: Accessor<string | undefined>
  /** The model whose effort levels the open `/effort` picker lists. */
  effortPickerModel: Accessor<AppModelDefinition | undefined>
  /** Every effort level the picker offers. */
  effortPickerOptions: Accessor<EffortOption[]>
  /** The effort rows the typed query leaves visible. */
  effortPickerVisible: Accessor<EffortOption[]>
  /** The level the picker's "current" pill marks. */
  effortPickerCurrent: Accessor<string | null>
  /** The effort picker's mode dropdown options. */
  effortPickerModeOptions: Accessor<{ value: string; label: string }[]>
  /** The `@`-picker's ranked entries. */
  filteredEntries: Accessor<FileEntry[]>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:pickers`.
 * @param ctx - The inner ctx (the command registry the menu filters, the
 *   composer's open menus, the model settings the rows are derived from, the
 *   `@`-picker's props, and the class-free state the sections render with).
 * @returns The pickers slice.
 */
export function createChatPickers(ctx: ChatInnerCtx): ChatPickersSlice {
  const [showDeprecated, setShowDeprecated] = createSignal(false)
  const [modelSort, setModelSort] = createSignal<{
    column: ModelSortColumn
    direction: SortDirection
  }>({ column: 'name', direction: 'asc' })
  const [regionMenu, setRegionMenu] = createSignal<RegionMenuState | null>(null)

  // The commands the open menu lists, re-derived from the registry, the typed
  // text and the viewer's capabilities (unit U6's rows, kept as written).
  const filteredCmds = createMemo<CommandDef[]>(() =>
    filterCommandMenu(
      ctx.commands.allCommands(),
      ctx.composer.commandMenu(),
      ctx.props.canEdit,
      ctx.env.shareAllowed(),
    ),
  )

  // The model rows the open picker lists, narrowed by its typed query. The
  // catalog is a dependency: when a custom provider is edited (a model renamed
  // or added, a URL changed) the catalog refreshes in place and the picker must
  // re-derive instead of keeping its pre-edit snapshot.
  const filteredModels = createMemo<AppModelDefinition[]>(() => {
    const picker = ctx.composer.modelPicker()
    if (!picker) return []
    return filterModelsByPickerQuery(picker.text, ctx.models.AVAILABLE_MODELS())
  })

  // ── Older models section ──────────────────────────────────────────────────
  // Deprecated entries fold into a collapsed "Older models ⌄" section under the
  // current models. The section auto-expands when the user's currentModel is in
  // it so they can see what's selected — they can still collapse it manually.
  const partition = createMemo(() => partitionByDeprecation(filteredModels()))
  const currentModels = createMemo<AppModelDefinition[]>(() => partition().current)
  const deprecatedModels = createMemo<AppModelDefinition[]>(() => partition().deprecated)
  // Auto-expand when the user's saved model is deprecated, or when a search
  // query matched only deprecated entries. Checked once per list and model, in
  // the state that brings them, so the user can still collapse manually.
  const currentIsDeprecated = createMemo(() =>
    deprecatedModels().some((m) => m.id === ctx.models.currentModel()),
  )
  const onlyDeprecatedMatched = createMemo(
    () => currentModels().length === 0 && deprecatedModels().length > 0,
  )
  const expandCheckKey = createMemo(() =>
    [
      ctx.models.currentModel(),
      String(currentModels().length === 0),
      ...deprecatedModels().map((m) => m.id),
    ].join('|'),
  )
  // React checks this while rendering; here the same check runs as the key
  // (model + list shape) changes, before the rows that read the flag render.
  let expandCheckedFor: string | null = null
  createEffect(
    on(
      expandCheckKey,
      (key) => {
        if (expandCheckedFor === key) return
        expandCheckedFor = key
        if (currentIsDeprecated() || onlyDeprecatedMatched()) setShowDeprecated(true)
      },
      { defer: false },
    ),
  )

  /**
   * The processing region a model actually uses: the per-model choice when it
   * is one of the model's available regions, else the model's default (its
   * first available region). Drives the picker's flag pill AND the `region`
   * sort column.
   * @param model - The model to resolve.
   * @returns The region id the model runs in.
   */
  const effectiveModelRegion = (model: AppModelDefinition): ModelRegion => {
    const available = availableModelRegions(model)
    const chosen = ctx.models.modelRegions()[model.id]
    return chosen && available.includes(chosen) ? chosen : available[0]
  }

  /**
   * Opens (or toggles closed) a model's region menu anchored to `trigger`: the
   * menu renders just below the control, its right edge aligned with the
   * control's, so an open picker's scroll container cannot clip it.
   * @param modelId - The model whose regions the menu lists.
   * @param trigger - The region control the menu anchors to.
   */
  const toggleRegionMenu = (modelId: string, trigger: HTMLElement): void => {
    setRegionMenu((open) => {
      if (open?.modelId === modelId) return null
      const rect = trigger.getBoundingClientRect()
      return { modelId, top: rect.bottom + 2, right: window.innerWidth - rect.right }
    })
  }

  // Closing the model picker closes any open region menu with it. React syncs
  // this while rendering; here the same check follows the picker state.
  let regionMenuPicker = ctx.composer.modelPicker()
  createEffect(() => {
    const picker = ctx.composer.modelPicker()
    if (regionMenuPicker === picker) return
    regionMenuPicker = picker
    if (!picker) setRegionMenu(null)
  })

  const visibleModels = createMemo<AppModelDefinition[]>(() => {
    // Sort WITHIN each partition so the current/deprecated split (and the
    // divider the rows draw between them) is preserved while the chosen sort
    // orders the rows the user actually sees.
    const sortedCurrent = sortModels(
      currentModels(),
      modelSort().column,
      modelSort().direction,
      effectiveModelRegion,
    )
    if (!showDeprecated()) return sortedCurrent
    const sortedDeprecated = sortModels(
      deprecatedModels(),
      modelSort().column,
      modelSort().direction,
      effectiveModelRegion,
    )
    return [...sortedCurrent, ...sortedDeprecated]
  })

  // ── Fast mode (⚡) availability ────────────────────────────────────────────
  // The composer toggle renders only when the model that will serve the CURRENT
  // mode declares fast-tier pricing (`fastPricing`). The server re-checks per
  // iteration, so this is presentation-only gating.
  const fastModeAvailable = createMemo(() =>
    Boolean(
      ctx.models
        .AVAILABLE_MODELS()
        .find((m) => m.id === ctx.models.effectiveModelForMode(ctx.chat.liveModelMode()))
        ?.fastPricing,
    ),
  )

  // ── Model-picker mode dropdown ────────────────────────────────────────────
  // Options for the picker's mode selector; each shows the model currently
  // active for that mode (persisted value, else its fallback labeling) so
  // re-scoping the open picker is informed.
  const pickerModeOptions = createMemo<{ value: string; label: string }[]>(() => {
    const t = ctx.env.t
    const models = ctx.models.AVAILABLE_MODELS()
    const label = (id: string): string => models.find((m) => m.id === id)?.label || id
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
        model: ctx.models.savedChatModel()
          ? label(ctx.models.savedChatModel())
          : t('ide.chat.settings.modelUnset', undefined, { defaultValue: 'Not set' }),
      },
      {
        value: 'plan',
        mode: t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' }),
        model: ctx.models.planModel() ? label(ctx.models.planModel()) : modeDefault('plan'),
      },
      {
        value: 'execute',
        mode: t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
        model: ctx.models.executeModel()
          ? label(ctx.models.executeModel())
          : modeDefault('execute'),
      },
      {
        value: 'commit',
        mode: t('ide.chat.modelMode.commit', undefined, { defaultValue: 'Commit messages' }),
        model: ctx.models.commitModel()
          ? label(ctx.models.commitModel())
          : auxDefault(ctx.models.serverModelDefaults()?.commit),
      },
      {
        value: 'compact',
        mode: t('ide.chat.modelMode.compact', undefined, { defaultValue: 'Compaction' }),
        model: ctx.models.compactModel()
          ? label(ctx.models.compactModel())
          : auxDefault(ctx.models.serverModelDefaults()?.compact),
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
  const currentPickerModelId = createMemo(() =>
    pickerCurrentModelId(
      ctx.composer.modelPicker(),
      ctx.models.effectiveModelForMode,
      {
        planModel: ctx.models.planModel(),
        executeModel: ctx.models.executeModel(),
        commitModel: ctx.models.commitModel(),
        compactModel: ctx.models.compactModel(),
        chatModel: ctx.models.savedChatModel(),
      },
      ctx.models.serverModelDefaults(),
    ),
  )

  // ── Effort picker derived state ───────────────────────────────────────────
  // The model whose levels the open `/effort` picker lists — the model the
  // selected mode will actually run — plus its selectable options and the level
  // the "current" pill marks (the persisted per-mode value resolved per-model,
  // so an unset mode correctly pills the model's own default). Cheap to
  // recompute, mirroring pickerModeOptions above.
  const effortPickerModel = createMemo<AppModelDefinition | undefined>(() => {
    const picker = ctx.composer.effortPicker()
    if (!picker) return undefined
    return ctx.models
      .AVAILABLE_MODELS()
      .find((m) => m.id === ctx.models.effectiveModelForMode(picker.mode))
  })
  const effortPickerOptions = createMemo<EffortOption[]>(() =>
    effortOptionsForModel(effortPickerModel()),
  )
  // Typed filter, mirroring filteredModels: the text after "/effort" (minus a
  // mode flag) narrows the rows, so "/effort xh" + Enter selects xhigh.
  const effortPickerVisible = createMemo<EffortOption[]>(() => {
    const picker = ctx.composer.effortPicker()
    if (!picker) return []
    return effortPickerVisibleOptions(picker.text, effortPickerOptions())
  })
  const effortPickerCurrent = createMemo<string | null>(() => {
    const picker = ctx.composer.effortPicker()
    if (!picker) return null
    return nativeEffortName(
      effortPickerModel(),
      ctx.models.effortByMode()[picker.mode] ?? (ctx.models.effortLevel() || undefined),
    )
  })
  // Mode dropdown rows ("Plan · <model>") — effort exists only for the two
  // conversation modes, each scoped to ITS model's native levels.
  const effortPickerModeOptions = createMemo<{ value: string; label: string }[]>(() => {
    const t = ctx.env.t
    const models = ctx.models.AVAILABLE_MODELS()
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
            models.find((x) => x.id === ctx.models.effectiveModelForMode(m))?.label ??
            ctx.models.effectiveModelForMode(m),
        },
        { defaultValue: '{{mode}} · {{model}}' },
      ),
    }))
  })

  const filteredEntries = createMemo<FileEntry[]>(() => {
    const picker = ctx.popups.filePicker()
    if (!picker) return []
    return rankFileMentionEntries(
      picker.entries,
      picker.query,
      ctx.props.activeFile,
      ctx.props.openTabs,
    )
  })

  return {
    filteredCmds,
    currentModels,
    deprecatedModels,
    showDeprecated,
    setShowDeprecated,
    modelSort,
    setModelSort,
    effectiveModelRegion,
    regionMenu,
    setRegionMenu,
    toggleRegionMenu,
    visibleModels,
    fastModeAvailable,
    pickerModeOptions,
    currentPickerModelId,
    effortPickerModel,
    effortPickerOptions,
    effortPickerVisible,
    effortPickerCurrent,
    effortPickerModeOptions,
    filteredEntries,
    effects: {
      // #effect chat:pickers:2 — any click outside the open region menu closes
      // it (the opening click never self-closes: this listener attaches after
      // that click, and the control/menu handlers stop propagation).
      // Scroll/resize also close it — the menu is fixed-positioned, so its
      // anchor would drift away from it otherwise.
      2: () => {
        createEffect(
          on(regionMenu, (open) => {
            if (!open) return
            const close = (): void => {
              setRegionMenu(null)
            }
            document.addEventListener('click', close)
            document.addEventListener('scroll', close, true)
            window.addEventListener('resize', close)
            onCleanup(() => {
              document.removeEventListener('click', close)
              document.removeEventListener('scroll', close, true)
              window.removeEventListener('resize', close)
            })
          }),
        )
      },
    },
  }
}
