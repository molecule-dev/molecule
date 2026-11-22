/**
 * The model picker's rows and their processing-region dropdown — React's
 * render section “minWidth:0 + ellipsis so a long label yields”: every model
 * row (label, provider, current / Pro / "free in <mode>" pill, description,
 * context and usage details, capability badges), the inline "Older models"
 * disclosure, and each row's fixed-position region menu.
 *
 * React's list `<div>` (the scrolling container) IS this component's host, so the
 * rows and the disclosure are its direct children exactly as React renders
 * them — the picker's own popup keeps the header above and the BYO footer
 * below. The row and its region control are siblings inside a positioning
 * wrapper — the pill is a control and cannot sit inside the row button (axe
 * `nested-interactive`), so it overlays the row's bottom-right from the wrapper
 * instead. Every row's pre-render data (badges, lock reason, rate, region pill)
 * comes from the framework-neutral `modelPickerRowView`; nothing here re-derives
 * it.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, inject } from '@angular/core'

import { type AppModelDefinition, formatTokenCount } from '@molecule/app-ai-models'
import type { InterpolationValues, TranslateFunction, TranslateOptions } from '@molecule/app-i18n'
import {
  MODEL_REGION_FLAGS,
  modelHasPeakPricing,
  modelPeakWindowLabels,
  type ModelPickerRowView,
  modelPickerRowView,
  type ModelProcessingRegion,
  modelRegionLabel,
  modelUsageRate,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { Icon } from '../icon.component.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatPickers, type RegionMenuState } from './chat-pickers.slice.js'
import { ChatRegionFlag } from './chat-region-flag.component.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'

/** One rendered model row: the model, its position, its derived view and the flags its markup needs. */
interface ModelRowItem {
  /** The catalog model the row renders. */
  model: AppModelDefinition
  /** The row's index in the visible list. */
  index: number
  /** The row's pre-rendered data from `modelPickerRowView`. */
  view: ModelPickerRowView
  /** Whether the "older models collapse" disclosure sits above this row. */
  dividerBefore: boolean
  /** Whether this row belongs to the deprecated (collapsed) section. */
  isDeprecatedRow: boolean
  /** Whether the row shows its peak-pricing segment. */
  hasPeak: boolean
}

/** The row wrapper's inline style (React's `position: 'relative'`). */
const ROW_WRAPPER_STYLE = styleText({ position: 'relative' })

/** The label/provider/pill row's inline style. */
const HEADER_ROW_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
})

/** The model label's inline style. */
const LABEL_STYLE = styleText({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

/** The right-aligned "current" pill's inline style. */
const CURRENT_BADGE_STYLE = styleText({
  marginLeft: 'auto',
  fontSize: '10px',
  color: 'var(--mol-color-primary, #6366f1)',
  background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
  border: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
  padding: '1px 7px',
  borderRadius: '999px',
})

/** The Pro / "free in <mode>" lock pill's inline style. */
const LOCK_STYLE = styleText({
  fontSize: '10px',
  marginLeft: 'auto',
  background: 'rgba(128,128,128,0.2)',
  padding: '1px 5px',
  borderRadius: '3px',
})

/** The model description's inline style. */
const DESCRIPTION_STYLE = styleText({ fontSize: '12px', opacity: 0.7 })

/** The model detail line's inline style. */
const DETAIL_STYLE = styleText({ fontSize: '11px', opacity: 0.65 })

/** The capability-badges row's inline style. */
const BADGES_STYLE = styleText({
  display: 'flex',
  gap: '4px',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginTop: '1px',
  width: '100%',
})

/** The region control's absolute-position wrapper style. */
const REGION_CONTROL_STYLE = styleText({ position: 'absolute', right: 12, bottom: 8, zIndex: 1 })

/** The region trigger's label style. */
const REGION_LABEL_STYLE = styleText({ fontSize: '10px', lineHeight: '14px' })

/** The region menu's option rate style. */
const OPTION_RATE_STYLE = styleText({ fontSize: '10px' })

/** The "Older models" disclosure button's inline style. */
const DISCLOSURE_STYLE = styleText({
  padding: '6px 12px',
  border: 'none',
  borderTop: '1px solid rgba(128,128,128,0.12)',
  background: 'rgba(128,128,128,0.04)',
  cursor: 'pointer',
  textAlign: 'left',
})

/** The selected-region tint shared by the menu and an active option. */
const SELECTED_TINT = 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'

/** The scrolling list container's inline style (the rows component's host). */
const LIST_STYLE = styleText({ overflowY: 'auto', flex: 1 })

/**
 * React's model-picker rows section: the list's rows, the "Older models"
 * disclosure and every row's processing-region control and menu.
 */
@Component({
  selector: 'div[mol-chat-model-picker-rows]',
  standalone: true,
  imports: [ChatRegionFlag, Icon, NgTemplateOutlet, Tooltip],
  // prettier-ignore
  host: { '[attr.style]': 'listStyle' },
  // prettier-ignore
  template: `@for (item of rows(); track item.model.id) {@if (item.dividerBefore) {<button type="button" (click)="toggleDeprecated()" [attr.class]="disclosureClass" [attr.style]="disclosureStyle">{{ collapseText() }}</button>}<div [attr.style]="rowWrapperStyle"><button type="button" (click)="onRowClick(item)" (mouseenter)="onRowEnter($event, item)" (mouseleave)="onRowLeave($event, item)" [attr.class]="rowClass" [attr.style]="rowStyle(item)"><div [attr.style]="headerRowStyle"><span [attr.class]="cm.fontWeight('medium')" [attr.style]="labelStyle">{{ item.model.label }}</span><span [attr.style]="providerStyle(item)">{{ item.model.provider }}</span>@if (item.model.id === currentPickerModelId()) {<span [attr.data-mol-id]="'model-current-' + item.model.id" [attr.class]="cm.fontWeight('medium')" [attr.style]="currentBadgeStyle">{{ currentBadgeText() }}</span>}@if (item.view.lockReason === 'paid') {<span [attr.style]="lockStyle">{{ proText() }}</span>}@if (item.view.lockReason === 'mode') {<span [attr.class]="cm.textMuted" [attr.style]="lockStyle">{{ item.view.freeInLabel }}</span>}</div><span [attr.style]="descriptionStyle">{{ item.model.description }}</span><span [attr.style]="detailStyle">{{ contextText(item) }} ctx · {{ outputText(item) }} out · @if (item.view.isCustom) {<span [attr.title]="yourKeyHint()">{{ yourKeyText() }}</span>} @else {<span [attr.style]="priceStyle(item)" [attr.title]="usageRateHint()">{{ usageRateValue(item) }}</span>}@if (item.hasPeak) { · <span [attr.style]="peakStyle(item)" [attr.title]="peakHint(item)">{{ peakText(item) }}</span>}@if (item.model.knowledgeCutoff) { · {{ item.model.knowledgeCutoff }}}</span>@if (item.view.badges.length > 0) {<span [attr.style]="badgesStyle">@for (badge of item.view.badges; track badge.label) {<span [attr.style]="badgeStyle(badge)">{{ badge.label }}</span>}</span>}</button>@if (item.view.regionPill.show) {<span [attr.style]="regionControlStyle">@if (menuOpen(item.model.id)) {<ng-container *ngTemplateOutlet="regionTrigger; context: { $implicit: item }"></ng-container>} @else {<mol-tooltip placement="top"><ng-container *ngTemplateOutlet="regionTrigger; context: { $implicit: item }"></ng-container><ng-container ngProjectAs="[slot=content]">{{ item.view.regionPill.hint }}</ng-container></mol-tooltip>}@if (menuOpen(item.model.id)) {@if (regionMenu(); as menu) {<span role="menu" [attr.aria-label]="menuLabel()" [attr.class]="menuClass" [attr.style]="menuStyle(menu)">@for (option of item.view.regionPill.options; track option) {<span role="menuitemradio" [attr.aria-checked]="isActiveRegion(item, option)" tabindex="0" [attr.data-mol-id]="'model-region-' + item.model.id + '-' + option" (click)="onOptionClick($event, item, option)" (keydown)="onOptionKeydown($event, item, option)" (mouseenter)="onOptionEnter($event, item, option)" (mouseleave)="onOptionLeave($event, item, option)" [attr.class]="optionClass(item, option)" [attr.style]="optionStyle(item, option)"><span mol-region-flag [code]="regionFlag(option)" [height]="12"></span><span>{{ regionLabel(option) }}</span><span [attr.class]="isActiveRegion(item, option) ? null : cm.textMuted" [attr.style]="optionRateStyle">({{ optionRateText(item, option) }})</span></span>}</span>}}</span>}</div>}@if (!showDeprecated() && deprecatedModels().length > 0) {<button type="button" (click)="expandDeprecated()" [attr.class]="disclosureClass" [attr.style]="disclosureStyle">{{ expandText() }}</button>}<ng-template #regionTrigger let-item><span [attr.role]="interactive(item) ? 'button' : null" [attr.tabindex]="interactive(item) ? 0 : null" [attr.aria-label]="item.view.regionPill.hint" [attr.aria-haspopup]="interactive(item) ? 'menu' : null" [attr.aria-expanded]="interactive(item) ? menuOpen(item.model.id) : null" [attr.data-mol-id]="'model-region-' + item.model.id" (click)="onRegionClick($event, item)" (keydown)="onRegionKeydown($event, item)" (mouseenter)="onRegionEnter($event, item)" (mouseleave)="onRegionLeave($event, item)" [attr.style]="regionTriggerStyle(item)">@if (interactive(item)) {<svg mol-icon [name]="'chevron-down'" [size]="10" aria-hidden="true" [className]="cm.textMuted"></svg>}<span [attr.class]="cm.textMuted" [attr.style]="regionLabelStyle">{{ item.view.regionPill.label }}</span><span mol-region-flag [code]="regionFlag(item.view.regionPill.region)" [height]="14"></span></span></ng-template>`,
})
export class ChatModelPickerRows {
  /** The shared state, read for the env (ClassMap, theme, translator) and props. */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the open picker's state (its scope and highlight). */
  private readonly composer = inject(ChatComposer)

  /** The models slice: the catalog, tier and per-mode server defaults. */
  private readonly models = inject(ChatModels)

  /** The pickers slice: the visible rows, current id, region state and disclosure. */
  private readonly pickers = inject(ChatPickers)

  /** The render-handlers slice: the stable row and region callbacks. */
  private readonly handlers = inject(ChatRenderHandlers)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap

  /** The row button's ClassMap classes. */
  protected readonly rowClass: string

  /** The disclosure button's ClassMap classes. */
  protected readonly disclosureClass: string

  /** The scrolling list container's inline style (React's list `<div>` is this host). */
  protected readonly listStyle: string | null = LIST_STYLE

  /** The row button's inline style token (its provider accent). */
  protected readonly rowWrapperStyle: string | null = ROW_WRAPPER_STYLE

  /** The label/provider/pill row's inline style. */
  protected readonly headerRowStyle: string | null = HEADER_ROW_STYLE

  /** The model label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** The "current" pill's inline style. */
  protected readonly currentBadgeStyle: string | null = CURRENT_BADGE_STYLE

  /** The lock pill's inline style. */
  protected readonly lockStyle: string | null = LOCK_STYLE

  /** The description's inline style. */
  protected readonly descriptionStyle: string | null = DESCRIPTION_STYLE

  /** The detail line's inline style. */
  protected readonly detailStyle: string | null = DETAIL_STYLE

  /** The badges row's inline style. */
  protected readonly badgesStyle: string | null = BADGES_STYLE

  /** The region control's absolute wrapper style. */
  protected readonly regionControlStyle: string | null = REGION_CONTROL_STYLE

  /** The region trigger's label style. */
  protected readonly regionLabelStyle: string | null = REGION_LABEL_STYLE

  /** The region option's rate style. */
  protected readonly optionRateStyle: string | null = OPTION_RATE_STYLE

  /** The disclosure button's inline style. */
  protected readonly disclosureStyle: string | null = DISCLOSURE_STYLE

  /** The menu box's ClassMap classes. */
  protected readonly menuClass: string

  /**
   * The translate function every derivation reads (React's `t`), reading the
   * locale so a locale switch re-renders the rows.
   */
  private readonly translate: TranslateFunction = (key, values, options) => {
    void this.state.env.locale()
    return this.state.env.t(key, values, options)
  }

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    this.cm = this.state.env.cm
    this.rowClass = this.cm.cn(this.cm.w('full'), this.cm.accentCard({ tone: 'custom' }))
    this.disclosureClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted, this.cm.w('full'))
    this.menuClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
  }

  /**
   * The visible rows, each with its pre-rendered view and list-position flags.
   *
   * @returns The rows to render, in the picker's sorted order.
   */
  protected rows(): ModelRowItem[] {
    void this.state.env.locale()
    const models = this.pickers.visibleModels()
    const currentCount = this.pickers.currentModels().length
    const deprecatedCount = this.pickers.deprecatedModels().length
    const mode = this.composer.modelPicker()?.mode
    const isLight = this.state.env.isLight()
    const isFreeTier = this.models.isFreeTier()
    const catalog = this.models.AVAILABLE_MODELS()
    const serverDefaults = this.models.serverModelDefaults()
    const freeTierModel = this.models.FREE_TIER_MODEL()
    return models.map((model, index) => {
      const view = modelPickerRowView({
        model,
        isLight,
        isFreeTier,
        mode,
        models: catalog,
        serverDefaults,
        freeTierModel,
        modelRegion: this.pickers.effectiveModelRegion(model),
        t: this.translate,
      })
      return {
        model,
        index,
        view,
        dividerBefore: index === currentCount && deprecatedCount > 0,
        isDeprecatedRow: index >= currentCount,
        hasPeak: !view.isCustom && modelHasPeakPricing(model, view.modelRegion),
      }
    })
  }

  /**
   * The model the picker marks current (its right-aligned "current" pill).
   *
   * @returns The current model id.
   */
  protected currentPickerModelId(): string {
    return this.pickers.currentPickerModelId()
  }

  /**
   * Whether deprecated models are currently listed.
   *
   * @returns Whether the older-models section is expanded.
   */
  protected showDeprecated(): boolean {
    return this.pickers.showDeprecated()
  }

  /**
   * The deprecated models (their count drives the disclosure labels).
   *
   * @returns The deprecated model list.
   */
  protected deprecatedModels(): AppModelDefinition[] {
    return this.pickers.deprecatedModels()
  }

  /**
   * The open region menu, or `null`.
   *
   * @returns The region menu state.
   */
  protected regionMenu(): RegionMenuState | null {
    return this.pickers.regionMenu()
  }

  /**
   * Whether a model's region menu is open.
   *
   * @param modelId - The model's id.
   * @returns Whether its menu is open.
   */
  protected menuOpen(modelId: string): boolean {
    return this.pickers.regionMenu()?.modelId === modelId
  }

  /**
   * Whether a row is the picker's keyboard highlight.
   *
   * @param item - The row.
   * @returns Whether the row is selected.
   */
  private isSelected(item: ModelRowItem): boolean {
    return this.composer.modelPicker()?.selectedIdx === item.index
  }

  /**
   * The row button's inline style.
   *
   * @param item - The row.
   * @returns The `style` attribute text.
   */
  protected rowStyle(item: ModelRowItem): string | null {
    return styleText({
      '--mol-accent': item.view.accent,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '2px',
      padding: '8px 12px 8px 30px',
      border: 'none',
      borderTop: '1px solid rgba(128,128,128,0.12)',
      cursor: item.view.locked ? 'default' : 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      opacity: item.view.locked ? 0.45 : item.isDeprecatedRow ? 0.7 : 1,
      background:
        this.isSelected(item) && !item.view.locked ? 'rgba(128,128,128,0.1)' : 'transparent',
    })
  }

  /**
   * The provider label's inline style (the row's accent colour).
   *
   * @param item - The row.
   * @returns The `style` attribute text.
   */
  protected providerStyle(item: ModelRowItem): string | null {
    return styleText({ fontSize: '10px', color: item.view.accent, opacity: 0.85, flexShrink: 0 })
  }

  /**
   * One capability badge's inline style.
   *
   * @param badge - The badge (its colours and label).
   * @returns The `style` attribute text.
   */
  protected badgeStyle(badge: ModelPickerRowView['badges'][number]): string | null {
    return styleText({
      fontSize: '10px',
      color: badge.fg,
      background: badge.bg,
      padding: '1px 5px',
      borderRadius: '3px',
    })
  }

  /**
   * The usage-rate figure's inline style.
   *
   * @param item - The row.
   * @returns The `style` attribute text.
   */
  protected priceStyle(item: ModelRowItem): string | null {
    return styleText({ color: item.view.priceColor })
  }

  /**
   * The peak segment's inline style.
   *
   * @param item - The row.
   * @returns The `style` attribute text.
   */
  protected peakStyle(item: ModelRowItem): string | null {
    return styleText({
      color: item.view.peakNow > 1 ? item.view.priceColor : undefined,
      opacity: item.view.peakNow > 1 ? 1 : 0.8,
    })
  }

  /**
   * The region trigger's inline style.
   *
   * @param item - The row.
   * @returns The `style` attribute text.
   */
  protected regionTriggerStyle(item: ModelRowItem): string | null {
    const interactive = this.interactive(item)
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '1px 4px',
      borderRadius: 4,
      background: this.menuOpen(item.model.id) ? 'rgba(128,128,128,0.25)' : 'transparent',
      cursor: interactive ? 'pointer' : 'default',
    })
  }

  /**
   * The region menu box's inline style (anchored at the trigger's viewport
   * coordinates).
   *
   * @param menu - The open menu's state.
   * @returns The `style` attribute text.
   */
  protected menuStyle(menu: RegionMenuState): string | null {
    return styleText({
      position: 'fixed',
      top: menu.top,
      right: menu.right,
      borderRadius: 6,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 130,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 112,
      padding: 2,
    })
  }

  /**
   * A region option's inline style.
   *
   * @param item - The row.
   * @param region - The option's region.
   * @returns The `style` attribute text.
   */
  protected optionStyle(item: ModelRowItem, region: ModelProcessingRegion): string | null {
    const active = this.isActiveRegion(item, region)
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderRadius: 4,
      cursor: active ? 'default' : 'pointer',
      fontSize: '11px',
      whiteSpace: 'nowrap',
      background: active ? SELECTED_TINT : 'transparent',
      color: active ? 'var(--mol-color-primary, #6366f1)' : 'inherit',
    })
  }

  /**
   * A region option's ClassMap classes (the active row is medium-weighted).
   *
   * @param item - The row.
   * @param region - The option's region.
   * @returns The class attribute text, or `null` when active.
   */
  protected optionClass(item: ModelRowItem, region: ModelProcessingRegion): string | null {
    return this.isActiveRegion(item, region) ? this.cm.fontWeight('medium') : null
  }

  /**
   * Whether a region is the row's current region.
   *
   * @param item - The row.
   * @param region - The option's region.
   * @returns Whether the option is the row's active region.
   */
  protected isActiveRegion(item: ModelRowItem, region: ModelProcessingRegion): boolean {
    return region === item.view.regionPill.region
  }

  /**
   * Whether the row's region is user-changeable.
   *
   * @param item - The row.
   * @returns Whether the region can be changed.
   */
  protected interactive(item: ModelRowItem): boolean {
    return item.view.regionPill.interactive
  }

  /**
   * The flag code for a region (`US`, `CN`, or the raw code).
   *
   * @param region - The region code.
   * @returns The flag's country code.
   */
  protected regionFlag(region: ModelProcessingRegion): string {
    return MODEL_REGION_FLAGS[region] ?? region
  }

  /**
   * A region's localized name.
   *
   * @param region - The region code.
   * @returns The translated region name.
   */
  protected regionLabel(region: ModelProcessingRegion): string {
    return modelRegionLabel(this.translate, region)
  }

  /**
   * The context-window size text.
   *
   * @param item - The row.
   * @returns The formatted token count.
   */
  protected contextText(item: ModelRowItem): string {
    return formatTokenCount(item.model.contextWindow)
  }

  /**
   * The max-output size text.
   *
   * @param item - The row.
   * @returns The formatted token count.
   */
  protected outputText(item: ModelRowItem): string {
    return formatTokenCount(item.model.maxOutputTokens)
  }

  /**
   * The usage-rate figure text ("×N usage" / "your key" is a separate span).
   *
   * @param item - The row.
   * @returns The translated usage-rate text.
   */
  protected usageRateValue(item: ModelRowItem): string {
    return this.tr(
      'ide.chat.models.usageRateValue',
      { rate: item.view.usageRate },
      { defaultValue: '×{{rate}} usage' },
    )
  }

  /**
   * A region option's rate text ("×N").
   *
   * @param item - The row.
   * @param region - The option's region.
   * @returns The translated multiplier text.
   */
  protected optionRateText(item: ModelRowItem, region: ModelProcessingRegion): string {
    const rate = modelUsageRate(item.model, this.models.AVAILABLE_MODELS(), region)
    return this.tr('ide.chat.models.usageRateMultiplier', { rate }, { defaultValue: '×{{rate}}' })
  }

  /**
   * The peak segment's text (in-window or upcoming).
   *
   * @param item - The row.
   * @returns The translated peak text.
   */
  protected peakText(item: ModelRowItem): string {
    const multiplier = item.model.peakPricing?.multiplier ?? 2
    if (item.view.peakNow > 1) {
      return this.tr(
        'ide.chat.models.peakNow',
        { multiplier },
        { defaultValue: 'peak ×{{multiplier}} now' },
      )
    }
    return this.tr(
      'ide.chat.models.peakLater',
      { multiplier },
      { defaultValue: '×{{multiplier}} at peak hours' },
    )
  }

  /**
   * The peak segment's tooltip: the multiplier and the local peak windows.
   *
   * @param item - The row.
   * @returns The translated hint.
   */
  protected peakHint(item: ModelRowItem): string {
    return this.tr(
      'ide.chat.models.peakHint',
      {
        multiplier: item.model.peakPricing?.multiplier ?? 2,
        windows: modelPeakWindowLabels(item.model).join(', '),
      },
      {
        defaultValue:
          'This model costs ×{{multiplier}} between {{windows}}. It is the normal rate the rest of the day.',
      },
    )
  }

  /**
   * The usage-rate tooltip (plan-priced models).
   *
   * @returns The translated hint.
   */
  protected usageRateHint(): string {
    return this.tr('ide.chat.models.usageRateHint', undefined, {
      defaultValue:
        'How fast this model uses your AI allowance, relative to the most economical model',
    })
  }

  /**
   * The BYO usage-rate tooltip.
   *
   * @returns The translated hint.
   */
  protected yourKeyHint(): string {
    return this.tr('ide.chat.models.usageRateYourKeyHint', undefined, {
      defaultValue: 'Billed to your own provider key, not your plan.',
    })
  }

  /**
   * The BYO usage-rate label.
   *
   * @returns The translated label.
   */
  protected yourKeyText(): string {
    return this.tr('ide.chat.models.usageRateYourKey', undefined, { defaultValue: 'your key' })
  }

  /**
   * The "current" pill's label.
   *
   * @returns The translated label.
   */
  protected currentBadgeText(): string {
    return this.tr('ide.chat.currentBadge', undefined, { defaultValue: 'current' })
  }

  /**
   * The paid lock pill's label.
   *
   * @returns The translated label.
   */
  protected proText(): string {
    return this.tr('ide.chat.proRequired', undefined, { defaultValue: 'Pro' })
  }

  /**
   * The region menu's aria label.
   *
   * @returns The translated label.
   */
  protected menuLabel(): string {
    return this.tr('ide.chat.model.regionMenuLabel', undefined, {
      defaultValue: 'Processing region',
    })
  }

  /**
   * The "Older models collapse" disclosure's label.
   *
   * @returns The translated label.
   */
  protected collapseText(): string {
    return this.tr(
      'ide.chat.olderModelsCollapse',
      { count: this.deprecatedModels().length },
      { defaultValue: 'Older models ⌃ ({{count}})' },
    )
  }

  /**
   * The "Older models expand" disclosure's label.
   *
   * @returns The translated label.
   */
  protected expandText(): string {
    return this.tr(
      'ide.chat.olderModelsExpand',
      { count: this.deprecatedModels().length },
      { defaultValue: 'Older models ⌄ ({{count}})' },
    )
  }

  /** Toggles the older-models section (the divider disclosure). */
  protected toggleDeprecated(): void {
    this.pickers.setShowDeprecated((shown) => !shown)
  }

  /** Expands the older-models section (the trailing disclosure). */
  protected expandDeprecated(): void {
    this.pickers.setShowDeprecated(true)
  }

  /**
   * Selects or reports a row, exactly as React's row click does.
   *
   * @param item - The clicked row.
   */
  protected onRowClick(item: ModelRowItem): void {
    if (item.view.lockReason === 'paid') {
      this.composer.setModelPicker(null)
      this.handlers.stableSetInputValue('')
      this.handlers.stableAddSystemCard(
        this.tr(
          'ide.chat.modelUpgradeRequired',
          { model: item.model.label },
          {
            defaultValue: '{{model}} is available on Pro. Upgrade to access all models.',
          },
        ),
        // Host owns the upgrade/sign-in button(s) (its routes/copy).
        { action: this.state.props().buildUpgradeCta?.({}) ?? undefined },
      )
    } else if (item.view.lockReason === 'mode') {
      this.composer.setModelPicker(null)
      this.handlers.stableSetInputValue('')
      this.handlers.stableAddSystemCard(this.modeOnlyText(item.view.usableMode))
    } else {
      void this.handlers.stableSelectModel(
        item.model.id,
        item.model.label,
        this.composer.modelPicker()?.mode,
      )
    }
  }

  /**
   * The one-liner a mode-locked row announces (never the paid-upgrade pitch).
   *
   * @param usableMode - The mode the free tier uses the model in.
   * @returns The translated one-liner.
   */
  private modeOnlyText(usableMode: ModelRowItem['view']['usableMode']): string {
    if (usableMode === 'plan') {
      return this.tr('ide.chat.modeOnlyPlan', undefined, {
        defaultValue: 'On the free plan, this model is used in plan mode.',
      })
    }
    if (usableMode === 'execute') {
      return this.tr('ide.chat.modeOnlyExecute', undefined, {
        defaultValue: 'On the free plan, this model is used in execute mode.',
      })
    }
    return this.tr('ide.chat.modeOnlyCommit', undefined, {
      defaultValue: 'On the free plan, this model is used for commit messages and compaction.',
    })
  }

  /**
   * The row hover affordance (React's `onMouseEnter` style write).
   *
   * @param event - The mouse event (its currentTarget is the row button).
   * @param item - The row.
   */
  protected onRowEnter(event: Event, item: ModelRowItem): void {
    if (!item.view.locked) {
      ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
    }
  }

  /**
   * The row hover exit (React's `onMouseLeave` style write).
   *
   * @param event - The mouse event (its currentTarget is the row button).
   * @param item - The row.
   */
  protected onRowLeave(event: Event, item: ModelRowItem): void {
    ;(event.currentTarget as HTMLElement).style.background =
      this.isSelected(item) && !item.view.locked ? 'rgba(128,128,128,0.1)' : 'transparent'
  }

  /**
   * Toggles a row's region menu (or does nothing when the region is fixed).
   *
   * @param event - The click event.
   * @param item - The row.
   */
  protected onRegionClick(event: Event, item: ModelRowItem): void {
    event.stopPropagation()
    if (!this.interactive(item)) return
    this.pickers.toggleRegionMenu(item.model.id, event.currentTarget as HTMLElement)
  }

  /**
   * The region trigger's keyboard behaviour (Enter/Space toggle, Escape closes).
   *
   * @param event - The keydown event.
   * @param item - The row.
   */
  protected onRegionKeydown(event: KeyboardEvent, item: ModelRowItem): void {
    if (!this.interactive(item)) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation()
      event.preventDefault()
      this.pickers.toggleRegionMenu(item.model.id, event.currentTarget as HTMLElement)
    } else if (event.key === 'Escape' && this.menuOpen(item.model.id)) {
      event.stopPropagation()
      this.pickers.setRegionMenu(null)
    }
  }

  /**
   * The region trigger hover tint.
   *
   * @param event - The mouse event.
   * @param item - The row.
   */
  protected onRegionEnter(event: Event, item: ModelRowItem): void {
    if (this.interactive(item)) {
      ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.25)'
    }
  }

  /**
   * Restores the region trigger's render-time tint on leave.
   *
   * @param event - The mouse event.
   * @param item - The row.
   */
  protected onRegionLeave(event: Event, item: ModelRowItem): void {
    ;(event.currentTarget as HTMLElement).style.background = this.menuOpen(item.model.id)
      ? 'rgba(128,128,128,0.25)'
      : 'transparent'
  }

  /**
   * Chooses a region from the open menu.
   *
   * @param event - The click event.
   * @param item - The row.
   * @param region - The chosen option's region.
   */
  protected onOptionClick(event: Event, item: ModelRowItem, region: ModelProcessingRegion): void {
    event.stopPropagation()
    this.pickers.setRegionMenu(null)
    if (!this.isActiveRegion(item, region)) {
      void this.handlers.stableSetModelRegion(item.model.id, region)
    }
  }

  /**
   * Chooses a region from the keyboard (Enter/Space).
   *
   * @param event - The keydown event.
   * @param item - The row.
   * @param region - The chosen option's region.
   */
  protected onOptionKeydown(
    event: KeyboardEvent,
    item: ModelRowItem,
    region: ModelProcessingRegion,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.stopPropagation()
    event.preventDefault()
    this.pickers.setRegionMenu(null)
    if (!this.isActiveRegion(item, region)) {
      void this.handlers.stableSetModelRegion(item.model.id, region)
    }
  }

  /**
   * The option hover tint (inactive options only).
   *
   * @param event - The mouse event.
   * @param item - The row.
   * @param region - The option's region.
   */
  protected onOptionEnter(event: Event, item: ModelRowItem, region: ModelProcessingRegion): void {
    if (!this.isActiveRegion(item, region)) {
      ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
    }
  }

  /**
   * Restores the option's render-time background on leave.
   *
   * @param event - The mouse event.
   * @param item - The row.
   * @param region - The option's region.
   */
  protected onOptionLeave(event: Event, item: ModelRowItem, region: ModelProcessingRegion): void {
    ;(event.currentTarget as HTMLElement).style.background = this.isActiveRegion(item, region)
      ? SELECTED_TINT
      : 'transparent'
  }

  /**
   * Translates a key, reading the locale so a switch re-renders the rows.
   *
   * @param key - The translation key.
   * @param values - Interpolation values.
   * @param options - Translation options (its `defaultValue` fallback).
   * @returns The translated text.
   */
  private tr(key: string, values?: InterpolationValues, options?: TranslateOptions): string {
    return this.translate(key, values, options)
  }
}
