/**
 * React's section “Picker header — Mode + Sort controls” (ChatPanel.tsx lines
 * 6288–6476): the `/model` picker's top strip.
 *
 * One flex-wrap row holds two GROWING label+control groups. The Mode select
 * re-scopes the OPEN picker in place (resetting the highlighted row, because the
 * lock rules change with the mode); every option names the model its mode
 * currently resolves to. The Sort group holds a column select and a 24px square
 * direction toggle inside the framework `Tooltip`, whose chevron points the way
 * the rows are ordered. The host IS React's root `<div>` (its classes and inline
 * style), so the port adds no node.
 *
 * A controlled `<select>`'s selection cannot be applied before its `<option>`
 * children exist, so {@link SelectValue} applies the wanted value after each
 * view check — React writes the live property in the commit, no attribute.
 *
 * @module
 */

import { type AfterViewChecked, Component, Directive, ElementRef, inject } from '@angular/core'

import type { ModelMode, ModelSortColumn } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { Icon } from '../icon.component.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatPickers } from './chat-pickers.slice.js'

/** The header row's inline style. */
const HEADER_STYLE = styleText({
  padding: '6px 12px',
  borderBottom: '1px solid rgba(128,128,128,0.12)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
  flexWrap: 'wrap',
})

/** The Mode group's inline style. */
const MODE_GROUP_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flex: '1 1 190px',
  minWidth: 0,
})

/** The Sort group's inline style. */
const SORT_GROUP_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flex: '1 1 150px',
  minWidth: 0,
})

/** A group label's inline style. */
const LABEL_STYLE = styleText({ flexShrink: 0 })

/** A select's inline style (identical for both selects). */
const SELECT_STYLE = styleText({
  borderRadius: 4,
  padding: '2px 18px 2px 6px',
  color: 'inherit',
  cursor: 'pointer',
  height: 24,
  boxSizing: 'border-box',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
})

/** The direction toggle's inline style. */
const DIRECTION_STYLE = styleText({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  padding: 0,
  color: 'inherit',
  cursor: 'pointer',
  height: 24,
  width: 24,
  flexShrink: 0,
  boxSizing: 'border-box',
})

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's `updateOptions` — leaves the select alone when nothing matches.
 */
@Directive({
  selector: 'select[mol-model-picker-select-value]',
  standalone: true,
  inputs: ['wanted'],
})
class SelectValue implements AfterViewChecked {
  /** The wanted value (an option of the select, or nothing that matches). */
  wanted = ''

  /** The select host. */
  private readonly host: ElementRef<HTMLSelectElement> = inject(ElementRef)

  /**
   * Applies the wanted selection once the options exist.
   */
  ngAfterViewChecked(): void {
    for (const option of Array.from(this.host.nativeElement.options)) {
      if (option.value === this.wanted) {
        option.selected = true
        return
      }
    }
  }
}

/**
 * React's “Picker header — Mode + Sort controls” section: the mode and sort
 * controls above the model list.
 */
@Component({
  selector: 'div[mol-chat-model-picker-header]',
  standalone: true,
  imports: [Icon, SelectValue, Tooltip],
  host: {
    '[attr.class]': 'rootClass',
    '[attr.style]': 'headerStyle',
  },
  // prettier-ignore
  template: `<div [attr.style]="modeGroupStyle"><span [attr.style]="labelStyle">{{ modeLabel() }}</span><select mol-model-picker-select-value [wanted]="mode()" data-mol-id="chat-model-mode-select" [attr.aria-label]="modeLabel()" (change)="onModeChange($event)" [attr.class]="selectClass" [attr.style]="selectStyle">@for (o of modeOptions(); track o.value) {<option [value]="o.value">{{ o.label }}</option>}</select></div><div [attr.style]="sortGroupStyle"><span [attr.style]="labelStyle">{{ sortLabel() }}</span><select mol-model-picker-select-value [wanted]="sortColumn()" data-mol-id="model-sort-column" [attr.aria-label]="sortLabel()" (change)="onSortChange($event)" [attr.class]="selectClass" [attr.style]="selectStyle"><option value="name">{{ colName() }}</option><option value="context">{{ colContext() }}</option><option value="cost">{{ colUsageRate() }}</option><option value="cutoff">{{ colCutoff() }}</option><option value="free">{{ colFree() }}</option><option value="region">{{ colRegion() }}</option></select><mol-tooltip placement="top"><button type="button" data-mol-id="model-sort-direction" [attr.aria-label]="sortDirection()" (click)="toggleDirection()" [attr.class]="directionClass" [attr.style]="directionStyle"><svg mol-icon [name]="directionName()" [size]="12" aria-hidden="true" data-mol-id="model-sort-direction-glyph"></svg></button><ng-container ngProjectAs="[slot=content]">{{ sortDirection() }}</ng-container></mol-tooltip></div>`,
})
export class ChatModelPickerHeader {
  /** The shared state, read for the env (the ClassMap and the translator). */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the open picker's scoped mode. */
  private readonly composer = inject(ChatComposer)

  /** The pickers slice: the sort setting and the mode options. */
  private readonly pickers = inject(ChatPickers)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The header row's ClassMap classes. */
  protected readonly rootClass: string

  /** The selects' shared ClassMap classes. */
  protected readonly selectClass: string

  /** The direction toggle's ClassMap classes. */
  protected readonly directionClass: string

  /** The header row's inline style. */
  protected readonly headerStyle: string | null = HEADER_STYLE

  /** The Mode group's inline style. */
  protected readonly modeGroupStyle: string | null = MODE_GROUP_STYLE

  /** The Sort group's inline style. */
  protected readonly sortGroupStyle: string | null = SORT_GROUP_STYLE

  /** A label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** A select's inline style. */
  protected readonly selectStyle: string | null = SELECT_STYLE

  /** The direction toggle's inline style. */
  protected readonly directionStyle: string | null = DIRECTION_STYLE

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.selectClass = this.cm.cn(
      this.cm.surfaceSecondary,
      this.cm.borderAll,
      this.cm.textSize('xs'),
    )
    this.directionClass = this.cm.cn(this.cm.surfaceSecondary, this.cm.borderAll, this.cm.textMuted)
  }

  /**
   * The picker's scoped mode, or the empty "Default" value.
   *
   * @returns The mode select's value.
   */
  protected mode(): string {
    return this.composer.modelPicker()?.mode ?? ''
  }

  /**
   * The mode options, each naming the model it resolves to.
   *
   * @returns The mode select's option rows.
   */
  protected modeOptions(): { value: string; label: string }[] {
    return this.pickers.pickerModeOptions()
  }

  /**
   * The model picker's sort setting's column.
   *
   * @returns The sort column select's value.
   */
  protected sortColumn(): string {
    return this.pickers.modelSort().column
  }

  /**
   * The direction glyph's name.
   *
   * @returns `chevron-up` for ascending, else `chevron-down`.
   */
  protected directionName(): 'chevron-up' | 'chevron-down' {
    return this.pickers.modelSort().direction === 'asc' ? 'chevron-up' : 'chevron-down'
  }

  /** Re-scopes the open picker in place, resetting the highlighted row. */
  protected onModeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value
    this.composer.setModelPicker((m) =>
      m ? { ...m, mode: value === '' ? undefined : (value as ModelMode), selectedIdx: -1 } : m,
    )
  }

  /** Changes the sort column. */
  protected onSortChange(event: Event): void {
    const column = (event.target as HTMLSelectElement).value as ModelSortColumn
    this.pickers.setModelSort((s) => ({ ...s, column }))
  }

  /** Flips the sort direction. */
  protected toggleDirection(): void {
    this.pickers.setModelSort((s) => ({
      ...s,
      direction: s.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  /**
   * The Mode label, translated.
   *
   * @returns The label text.
   */
  protected modeLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })
  }

  /**
   * The Sort label, translated.
   *
   * @returns The label text.
   */
  protected sortLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })
  }

  /**
   * The direction toggle's tooltip and aria label, translated.
   *
   * @returns The label text.
   */
  protected sortDirection(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelSortDirection', undefined, {
      defaultValue: 'Toggle sort direction',
    })
  }

  /**
   * The "Model" sort-column label.
   *
   * @returns The label text.
   */
  protected colName(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colName', undefined, { defaultValue: 'Model' })
  }

  /**
   * The "Context" sort-column label.
   *
   * @returns The label text.
   */
  protected colContext(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' })
  }

  /**
   * The "Usage rate" sort-column label.
   *
   * @returns The label text.
   */
  protected colUsageRate(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colUsageRate', undefined, {
      defaultValue: 'Usage rate',
    })
  }

  /**
   * The "Cutoff" sort-column label.
   *
   * @returns The label text.
   */
  protected colCutoff(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' })
  }

  /**
   * The "Free" sort-column label.
   *
   * @returns The label text.
   */
  protected colFree(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' })
  }

  /**
   * The "Region" sort-column label.
   *
   * @returns The label text.
   */
  protected colRegion(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' })
  }
}
