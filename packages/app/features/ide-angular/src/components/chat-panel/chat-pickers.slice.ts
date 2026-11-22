/**
 * React's `chat:pickers` region of ChatPanel.tsx (lines 4487–4736): the
 * derived state every picker renders from.
 *
 * The model picker's query-narrowed catalog (`filterModelsByPickerQuery`), its
 * current/deprecated partition and auto-expand, its sort and the rows it shows;
 * the billing-region control's menu and position; the header's per-mode rows and
 * the row that carries the "current" pill; fast-mode availability; the effort
 * picker's scoped model, options, typed filter, current level and mode rows; the
 * `@` picker's ranked entries; and (filled by unit U6) the command menu's
 * visible list.
 *
 * React adjusts two of these while rendering — the "Older models" auto-expand
 * and the region menu following a closed picker. There is no view-time state
 * update in Angular, so both run as effects reading the same signals React
 * reads, with the same first-run behaviour. `#effect chat:pickers:2` is React's
 * real effect: the outside-click/scroll/resize listeners that close an open
 * region menu.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, Injectable, Injector, signal } from '@angular/core'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { partitionByDeprecation } from '@molecule/app-ai-models'
import {
  availableModelRegions,
  type CommandDef,
  type EffortLevel,
  type EffortOption,
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

import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ModelRegion } from './chat-models.slice.js'
import { ChatModels } from './chat-models.slice.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatPopups } from './chat-popups.slice.js'

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
  /** The direction to sort in. */
  direction: SortDirection
}

/** The open billing-region menu, anchored at its trigger. */
export interface RegionMenuState {
  /** The model whose menu is open. */
  modelId: string
  /** The trigger's viewport top. */
  top: number
  /** The trigger's viewport right edge. */
  right: number
}

/** The identifiers other slices and sections read from the `chat:pickers` slice. */
export interface ChatPickersSlice {
  /** React's mount I/O for the region: none — it derives state only. */
  mount(): void

  /** React's `#effect chat:pickers:<n>` entry points, at React's positions. */
  readonly effects: { 2: () => void }

  /** The models the current mode offers. */
  readonly currentModels: () => AppModelDefinition[]
  /** The deprecated models (hidden unless the toggle is on). */
  readonly deprecatedModels: () => AppModelDefinition[]
  /** The model whose effort the picker scopes to, or `undefined`. */
  readonly effortPickerModel: () => AppModelDefinition | undefined
  /** The effort picker's option rows. */
  readonly effortPickerOptions: () => EffortOption[]
  /** The effort options the typed `/effort` text leaves visible. */
  readonly effortPickerVisible: () => EffortOption[]
  /** The effort the picker marks current, or `null` when it is closed. */
  readonly effortPickerCurrent: () => EffortLevel | null
  /** The effort picker's mode options. */
  readonly effortPickerModeOptions: () => PickerModeOption[]
  /** Whether the fast-mode row is offered. */
  readonly fastModeAvailable: () => boolean
  /** The commands the command menu's query leaves visible. */
  readonly filteredCmds: () => readonly CommandDef[]
  /** The `@` picker's ranked entries. */
  readonly filteredEntries: () => FileEntry[]
  /** The model picker's sort setting. */
  readonly modelSort: () => ModelSortState
  /** Sets the model picker's sort. */
  readonly setModelSort: ChatSetState<ModelSortState>
  /** The mode options of the model picker's header. */
  readonly pickerModeOptions: () => PickerModeOption[]
  /** The open billing-region menu, or `null`. */
  readonly regionMenu: () => RegionMenuState | null
  /** Sets the region menu. */
  readonly setRegionMenu: ChatSetState<RegionMenuState | null>
  /** Whether deprecated models are listed. */
  readonly showDeprecated: () => boolean
  /** Sets the deprecated-model toggle. */
  readonly setShowDeprecated: ChatSetState<boolean>
  /** The model the picker marks current. */
  readonly currentPickerModelId: () => string
  /** The billing region a model resolves to. */
  readonly effectiveModelRegion: (model: AppModelDefinition) => ModelRegion
  /** Opens / closes the region menu at its trigger. */
  readonly toggleRegionMenu: (modelId: string, trigger: HTMLElement) => void
  /** The models the `/model` picker's query leaves visible. */
  readonly visibleModels: () => AppModelDefinition[]
}

/** React's `chat:pickers` slice: every picker's derived state. */
@Injectable()
export class ChatPickers implements ChatPickersSlice {
  /** The shared state, read for the viewer capability and the props. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effect in. */
  private readonly injector = inject(Injector)

  /** Clears the open region menu's listeners when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The open region menu's listener cleanup, or `null` when none are attached. */
  private regionMenuCleanup: (() => void) | null = null

  /** The expansion key the auto-expand already checked (React's `expandCheckedFor`). */
  private expandCheckedFor: string | null = null

  /** The model picker the region-menu watcher last saw (React's `regionMenuPicker`). */
  private regionMenuPicker: ModelPicker | null = null

  /** Whether the region-menu watcher has taken its first snapshot (React's initial state). */
  private regionMenuPickerSeen = false

  /** The open picker's query-narrowed catalog (React's `filteredModels`). */
  private readonly filteredModels = computed<AppModelDefinition[]>(() => {
    const picker = this.state.slice(ChatComposer).modelPicker()
    if (!picker) return []
    return filterModelsByPickerQuery(picker.text, this.state.slice(ChatModels).AVAILABLE_MODELS())
  })

  /** The catalog split into current and deprecated entries (React's `useMemo`). */
  private readonly partition = computed(() => partitionByDeprecation(this.filteredModels()))

  /** The models the current mode offers. */
  readonly currentModels = computed<AppModelDefinition[]>(() => this.partition().current)

  /** The deprecated models (hidden unless the toggle is on). */
  readonly deprecatedModels = computed<AppModelDefinition[]>(() => this.partition().deprecated)

  /** Whether the saved model is deprecated (drives the auto-expand). */
  private readonly currentIsDeprecated = computed(() =>
    this.deprecatedModels().some(
      (model) => model.id === this.state.slice(ChatModels).currentModel(),
    ),
  )

  /** Whether only deprecated models matched the query (drives the auto-expand). */
  private readonly onlyDeprecatedMatched = computed(
    () => this.currentModels().length === 0 && this.deprecatedModels().length > 0,
  )

  /** The key that, when it changes, re-checks the auto-expand (React's `expandCheckKey`). */
  private readonly expandCheckKey = computed(() =>
    [
      this.state.slice(ChatModels).currentModel(),
      String(this.currentModels().length === 0),
      ...this.deprecatedModels().map((model) => model.id),
    ].join('|'),
  )

  /** The model picker's sort setting (React's `name`/`asc` default). */
  readonly modelSort = signal<ModelSortState>({ column: 'name', direction: 'asc' })

  /** The open billing-region menu, or `null`. */
  readonly regionMenu = signal<RegionMenuState | null>(null)

  /** Whether deprecated models are listed. */
  readonly showDeprecated = signal(false)

  /** The models the `/model` picker's query leaves visible (sorted within each partition). */
  readonly visibleModels = computed<AppModelDefinition[]>(() => {
    const sort = this.modelSort()
    const regionOf = (model: AppModelDefinition): ModelRegion => this.effectiveModelRegion(model)
    const sortedCurrent = sortModels(this.currentModels(), sort.column, sort.direction, regionOf)
    if (!this.showDeprecated()) return sortedCurrent
    const sortedDeprecated = sortModels(
      this.deprecatedModels(),
      sort.column,
      sort.direction,
      regionOf,
    )
    return [...sortedCurrent, ...sortedDeprecated]
  })

  /** Whether the live mode's model declares fast-tier pricing. */
  readonly fastModeAvailable = computed(() => {
    const models = this.state.slice(ChatModels)
    const activeModeModelId = models.effectiveModelForMode(
      this.state.slice(ChatChat).liveModelMode(),
    )
    return Boolean(
      models.AVAILABLE_MODELS().find((model) => model.id === activeModeModelId)?.fastPricing,
    )
  })

  /** The model picker's header mode options, each naming the model its mode runs. */
  readonly pickerModeOptions = computed<PickerModeOption[]>(() => {
    void this.state.env.locale()
    const t = this.state.env.t
    const models = this.state.slice(ChatModels)
    const available = models.AVAILABLE_MODELS()
    const serverDefaults = models.serverModelDefaults()
    const savedChatModel = models.savedChatModel()
    const planModel = models.planModel()
    const executeModel = models.executeModel()
    const commitModel = models.commitModel()
    const compactModel = models.compactModel()
    const effectiveModelForMode = (mode: 'plan' | 'execute'): string =>
      models.effectiveModelForMode(mode)
    const label = (id: string): string => available.find((model) => model.id === id)?.label || id
    const auxDefault = (id: string | undefined): string =>
      id
        ? t(
            'ide.chat.settings.modelDefaultNamed',
            { model: label(id) },
            { defaultValue: 'Default ({{model}})' },
          )
        : t('ide.chat.settings.modelDefaultFast', undefined, { defaultValue: 'Fast default' })
    const modeDefault = (mode: 'plan' | 'execute'): string =>
      t(
        'ide.chat.settings.modelDefaultNamed',
        { model: label(effectiveModelForMode(mode)) },
        { defaultValue: 'Default ({{model}})' },
      )
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
        model: commitModel ? label(commitModel) : auxDefault(serverDefaults?.commit),
      },
      {
        value: 'compact',
        mode: t('ide.chat.modelMode.compact', undefined, { defaultValue: 'Compaction' }),
        model: compactModel ? label(compactModel) : auxDefault(serverDefaults?.compact),
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

  /** The model the picker marks current (its mode's real model, or the saved default). */
  readonly currentPickerModelId = computed<string>(() => {
    const models = this.state.slice(ChatModels)
    return (
      pickerCurrentModelId(
        this.state.slice(ChatComposer).modelPicker(),
        (mode) => models.effectiveModelForMode(mode),
        {
          planModel: models.planModel(),
          executeModel: models.executeModel(),
          commitModel: models.commitModel(),
          compactModel: models.compactModel(),
          chatModel: models.savedChatModel(),
        },
        models.serverModelDefaults(),
      ) ?? ''
    )
  })

  /** The model whose effort the picker scopes to, or `undefined` when it is closed. */
  readonly effortPickerModel = computed<AppModelDefinition | undefined>(() => {
    const picker = this.state.slice(ChatComposer).effortPicker()
    if (!picker) return undefined
    const models = this.state.slice(ChatModels)
    return models
      .AVAILABLE_MODELS()
      .find((model) => model.id === models.effectiveModelForMode(picker.mode))
  })

  /** The effort picker's option rows (the scoped model's own native levels). */
  readonly effortPickerOptions = computed<EffortOption[]>(() =>
    effortOptionsForModel(this.effortPickerModel()),
  )

  /** The effort options the typed `/effort` text leaves visible. */
  readonly effortPickerVisible = computed<EffortOption[]>(() => {
    const picker = this.state.slice(ChatComposer).effortPicker()
    if (!picker) return []
    return effortPickerVisibleOptions(picker.text, this.effortPickerOptions())
  })

  /** The effort the picker marks current, or `null` when it is closed. */
  readonly effortPickerCurrent = computed<EffortLevel | null>(() => {
    const picker = this.state.slice(ChatComposer).effortPicker()
    if (!picker) return null
    const models = this.state.slice(ChatModels)
    return nativeEffortName(
      this.effortPickerModel(),
      models.effortByMode()[picker.mode] ?? (models.effortLevel() || undefined),
    )
  })

  /** The effort picker's mode options ("Plan · <model>"). */
  readonly effortPickerModeOptions = computed<PickerModeOption[]>(() => {
    void this.state.env.locale()
    const t = this.state.env.t
    const models = this.state.slice(ChatModels)
    const available = models.AVAILABLE_MODELS()
    return (['plan', 'execute'] as const).map((mode) => {
      const resolved = models.effectiveModelForMode(mode)
      return {
        value: mode,
        label: t(
          'ide.chat.modelModeOption',
          {
            mode:
              mode === 'plan'
                ? t('ide.chat.settings.modePlan', undefined, { defaultValue: 'Plan' })
                : t('ide.chat.settings.modeExecute', undefined, { defaultValue: 'Execute' }),
            model: available.find((model) => model.id === resolved)?.label ?? resolved,
          },
          { defaultValue: '{{mode}} · {{model}}' },
        ),
      }
    })
  })

  /** The commands the command menu's query leaves visible (the menu's only consumer, U6). */
  readonly filteredCmds = computed<readonly CommandDef[]>(() =>
    filterCommandMenu(
      this.state.slice(ChatCommands).allCommands(),
      this.state.slice(ChatComposer).commandMenu(),
      this.state.props().canEdit,
      this.state.env.shareAllowed(),
    ),
  )

  /** The `@` picker's ranked entries (the file picker's source). */
  readonly filteredEntries = computed<FileEntry[]>(() => {
    const picker = this.state.slice(ChatPopups).filePicker()
    if (!picker) return []
    const props = this.state.props()
    return rankFileMentionEntries(picker.entries, picker.query, props.activeFile, props.openTabs)
  })

  /** React's mount I/O for the region: none — it derives state only. */
  mount(): void {
    // No mount I/O in `chat:pickers`: React derives every value while rendering.
  }

  /**
   * Creates the two render-time state adjustments React performs in this region
   * and clears the region menu's listeners on unmount.
   */
  constructor() {
    // React's "Older models" auto-expand runs while rendering: when the checked
    // key changes, expand the section if the saved model is deprecated or only
    // deprecated models matched. The user can still collapse it afterwards.
    effect(() => {
      const key = this.expandCheckKey()
      if (this.expandCheckedFor === key) return
      this.expandCheckedFor = key
      if (this.currentIsDeprecated() || this.onlyDeprecatedMatched()) {
        this.setShowDeprecated(true)
      }
    })

    // React closes an open region menu when its model picker closes (checked
    // while rendering); the picker's identity is the change signal.
    effect(() => {
      const picker = this.state.slice(ChatComposer).modelPicker()
      if (!this.regionMenuPickerSeen) {
        this.regionMenuPickerSeen = true
        this.regionMenuPicker = picker
        return
      }
      if (this.regionMenuPicker === picker) return
      this.regionMenuPicker = picker
      if (!picker) this.setRegionMenu(null)
    })

    this.destroyRef.onDestroy(() => this.clearRegionMenuListeners())
  }

  /** Sets the model picker's sort (value or updater). */
  readonly setModelSort: ChatSetState<ModelSortState> = (next) => {
    this.modelSort.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the region menu (value or updater). */
  readonly setRegionMenu: ChatSetState<RegionMenuState | null> = (next) => {
    this.regionMenu.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the deprecated-model toggle (value or updater). */
  readonly setShowDeprecated: ChatSetState<boolean> = (next) => {
    this.showDeprecated.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** React's `#effect chat:pickers:2`: close the region menu on an outside click, scroll or resize. */
  readonly effects = {
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Read first so the effect tracks the menu it is watching.
        const menu = this.regionMenu()
        this.clearRegionMenuListeners()
        if (!menu) return
        const close = (): void => this.setRegionMenu(null)
        document.addEventListener('click', close)
        document.addEventListener('scroll', close, true)
        window.addEventListener('resize', close)
        this.regionMenuCleanup = () => {
          document.removeEventListener('click', close)
          document.removeEventListener('scroll', close, true)
          window.removeEventListener('resize', close)
        }
      })
    },
  }

  /**
   * The billing region a model resolves to: its saved choice when that is one of
   * its available regions, else its default (the first available region).
   *
   * @param model - The model to resolve.
   * @returns The region code.
   */
  effectiveModelRegion(model: AppModelDefinition): ModelRegion {
    const available = availableModelRegions(model)
    const chosen = this.state.slice(ChatModels).modelRegions()[model.id]
    return chosen && available.includes(chosen) ? chosen : available[0]
  }

  /**
   * Opens (or toggles closed) a model's region menu anchored below its trigger.
   *
   * @param modelId - The model whose menu to toggle.
   * @param trigger - The control the menu anchors to.
   */
  toggleRegionMenu(modelId: string, trigger: HTMLElement): void {
    this.setRegionMenu((open) => {
      if (open?.modelId === modelId) return null
      const rect = trigger.getBoundingClientRect()
      return { modelId, top: rect.bottom + 2, right: window.innerWidth - rect.right }
    })
  }

  /** Removes the open region menu's listeners, if any are attached. */
  private clearRegionMenuListeners(): void {
    this.regionMenuCleanup?.()
    this.regionMenuCleanup = null
  }
}
