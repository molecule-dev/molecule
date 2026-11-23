/**
 * React's section “Effort picker popup” (ChatPanel.tsx lines 7111–7311): the
 * `/effort` level picker above the composer.
 *
 * A header row carries the “Reasoning effort” label, a mode dropdown that
 * re-scopes the open picker in place (each option names the model its mode runs,
 * because the listed levels are that model's own) and the ✕ close button. The
 * scrollable body lists the scoped model's native levels — or, for a
 * fixed-reasoning model, one line saying there is nothing to set. The host IS
 * React's popup `<div>`; while the picker is closed React renders nothing, so
 * the host is out of the DOM then (`useHostPresence`).
 *
 * A controlled `<select>` cannot hold a selection before its `<option>` children
 * exist, so {@link EffortSelectValue} applies the wanted value after each view
 * check (React writes the live property in the commit, no attribute).
 *
 * @module
 */

import { type AfterViewChecked, Component, Directive, ElementRef, inject } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
import { defaultEffortForModel, type EffortMode } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatModelActions } from './chat-model-actions.slice.js'
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

/** A header label's inline style. */
const LABEL_STYLE = styleText({ flexShrink: 0 })

/** The mode group's inline style. */
const MODE_GROUP_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flex: '1 1 190px',
  minWidth: 0,
})

/** The mode select's inline style. */
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

/** The scrollable body's inline style. */
const LIST_STYLE = styleText({ overflowY: 'auto', flex: 1 })

/** The fixed-reasoning line's inline style. */
const EMPTY_STYLE = styleText({ padding: 12 })

/** The "Default" marker's inline style. */
const DEFAULT_STYLE = styleText({ fontSize: '10px' })

/** The "current" pill's inline style. */
const CURRENT_STYLE = styleText({
  marginLeft: 'auto',
  fontSize: '10px',
  color: 'var(--mol-color-primary, #6366f1)',
  background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
  border: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
  padding: '1px 7px',
  borderRadius: '999px',
})

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's `updateOptions` — leaves the select alone when nothing matches.
 */
@Directive({
  selector: 'select[mol-effort-select-value]',
  standalone: true,
  inputs: ['wanted'],
})
class EffortSelectValue implements AfterViewChecked {
  /** The wanted value (an option of the select, or nothing that matches). */
  wanted = ''

  /** The select host. */
  private readonly host: ElementRef<HTMLSelectElement> = inject(ElementRef)

  /** Applies the wanted selection once the options exist. */
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
 * React's “Effort picker popup” section: the `/effort` level picker, or nothing
 * while it is closed.
 */
@Component({
  selector: 'div[mol-chat-effort-picker]',
  standalone: true,
  imports: [EffortSelectValue],
  host: {
    '[attr.class]': 'rootClass',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (picker(); as p) {<div [attr.class]="headerClass" [attr.style]="headerStyle"><span [attr.style]="labelStyle">{{ effortLabel() }}</span><div [attr.style]="modeGroupStyle"><span [attr.style]="labelStyle">{{ modeLabel() }}</span><select mol-effort-select-value [wanted]="p.mode" data-mol-id="chat-effort-mode-select" [attr.aria-label]="modeLabel()" (change)="onModeChange($event)" [attr.class]="selectClass" [attr.style]="selectStyle">@for (o of modeOptions(); track o.value) {<option [value]="o.value">{{ o.label }}</option>}</select></div><button type="button" data-mol-id="chat-effort-picker-close" (click)="close()" [attr.style]="closeStyle()">✕</button></div><div [attr.style]="listStyle">@if (options().length === 0) {<div [attr.class]="emptyClass" [attr.style]="emptyStyle">{{ emptyText(p) }}</div>} @else {@for (option of visible(); track option.value; let idx = $index) {<button type="button" [attr.data-mol-id]="'chat-effort-level-' + option.value" (click)="choose(option)" (mouseenter)="rowEnter($event)" (mouseleave)="rowLeave($event, idx, p.selectedIdx)" [attr.class]="rowClass" [attr.style]="rowStyle(idx, p.selectedIdx)"><span [attr.class]="levelClass">{{ option.value }}</span>@if (defaultForModel() === option.value) {<span [attr.class]="defaultClass" [attr.style]="defaultStyle">{{ defaultText() }}</span>}@if (current() === option.value) {<span [attr.data-mol-id]="'effort-current-' + option.value" [attr.class]="levelClass" [attr.style]="currentStyle">{{ currentText() }}</span>}</button>}}</div>}`,
})
export class ChatEffortPicker {
  /** The shared state, read for the env (the ClassMap, translator and viewport). */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the open picker's state. */
  private readonly composer = inject(ChatComposer)

  /** The pickers slice: the scoped model, its options and the current level. */
  private readonly pickers = inject(ChatPickers)

  /** The model-actions slice: the level writer the rows call. */
  private readonly modelActions = inject(ChatModelActions)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The popup's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The header row's ClassMap classes. */
  protected readonly headerClass: string

  /** The mode select's ClassMap classes. */
  protected readonly selectClass: string

  /** The fixed-reasoning line's ClassMap classes. */
  protected readonly emptyClass: string

  /** A level row's ClassMap classes. */
  protected readonly rowClass: string

  /** A level label's ClassMap classes. */
  protected readonly levelClass: string

  /** The "Default" marker's ClassMap classes. */
  protected readonly defaultClass: string

  /** The header row's inline style. */
  protected readonly headerStyle: string | null = HEADER_STYLE

  /** A header label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** The mode group's inline style. */
  protected readonly modeGroupStyle: string | null = MODE_GROUP_STYLE

  /** The mode select's inline style. */
  protected readonly selectStyle: string | null = SELECT_STYLE

  /** The scrollable body's inline style. */
  protected readonly listStyle: string | null = LIST_STYLE

  /** The fixed-reasoning line's inline style. */
  protected readonly emptyStyle: string | null = EMPTY_STYLE

  /** The "Default" marker's inline style. */
  protected readonly defaultStyle: string | null = DEFAULT_STYLE

  /** The "current" pill's inline style. */
  protected readonly currentStyle: string | null = CURRENT_STYLE

  /** Resolves the ClassMap and the static classes once, and keeps the host in the page only while open. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
    this.headerClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.selectClass = this.cm.cn(
      this.cm.surfaceSecondary,
      this.cm.borderAll,
      this.cm.textSize('xs'),
    )
    this.emptyClass = this.cm.cn(this.cm.textSize('sm'), this.cm.textMuted)
    this.rowClass = this.cm.w('full')
    this.levelClass = this.cm.fontWeight('medium')
    this.defaultClass = this.cm.textMuted
    useHostPresence(() => this.open())
  }

  /**
   * The open effort picker's state, or `null` when it is closed.
   *
   * @returns React's `effortPicker`.
   */
  protected picker(): ReturnType<ChatComposer['effortPicker']> {
    return this.composer.effortPicker()
  }

  /**
   * Whether React renders the popup.
   *
   * @returns Whether the picker is open.
   */
  protected open(): boolean {
    return this.composer.effortPicker() !== null
  }

  /**
   * React's popup inline style, capped by the one popup height.
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 0,
      borderRadius: '6px 6px 0 0',
      zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: this.state.env.popupMaxHeight(),
    })
  }

  /**
   * The ✕ button's inline style, including the coarse-pointer touch floor.
   *
   * @returns The `style` attribute text.
   */
  protected closeStyle(): string | null {
    return styleText({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      fontSize: '14px',
      lineHeight: 1,
      opacity: 0.6,
      ...(this.state.env.isCoarse()
        ? {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            minHeight: 36,
          }
        : {}),
    })
  }

  /**
   * A level row's inline style.
   *
   * @param idx - The row's index in the visible list.
   * @param selectedIdx - The picker's highlighted row.
   * @returns The `style` attribute text.
   */
  protected rowStyle(idx: number, selectedIdx: number): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      width: '100%',
      minHeight: '40px',
      padding: '8px 12px',
      border: 'none',
      borderTop: idx === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)',
      cursor: 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      background: idx === selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
    })
  }

  /**
   * The effort picker's mode options.
   *
   * @returns The mode select's rows.
   */
  protected modeOptions(): ReturnType<ChatPickers['effortPickerModeOptions']> {
    return this.pickers.effortPickerModeOptions()
  }

  /**
   * The picker's option rows (the scoped model's own levels).
   *
   * @returns The option rows.
   */
  protected options(): ReturnType<ChatPickers['effortPickerOptions']> {
    return this.pickers.effortPickerOptions()
  }

  /**
   * The option rows the typed `/effort` text leaves visible.
   *
   * @returns The visible option rows.
   */
  protected visible(): ReturnType<ChatPickers['effortPickerVisible']> {
    return this.pickers.effortPickerVisible()
  }

  /**
   * The level the picker marks current.
   *
   * @returns The current level.
   */
  protected current(): ReturnType<ChatPickers['effortPickerCurrent']> {
    return this.pickers.effortPickerCurrent()
  }

  /**
   * The scoped model's default level.
   *
   * @returns The model's default level, or `null` when it has none.
   */
  protected defaultForModel(): ReturnType<typeof defaultEffortForModel> {
    return defaultEffortForModel(this.pickers.effortPickerModel())
  }

  /**
   * The header label (“Reasoning effort”), translated.
   *
   * @returns The label text.
   */
  protected effortLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.settings.effort.label', undefined, {
      defaultValue: 'Reasoning effort',
    })
  }

  /**
   * The mode label (“Mode”), translated.
   *
   * @returns The label text.
   */
  protected modeLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })
  }

  /**
   * The "Default" marker, translated.
   *
   * @returns The marker text.
   */
  protected defaultText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' })
  }

  /**
   * The "current" pill, translated.
   *
   * @returns The pill text.
   */
  protected currentText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })
  }

  /**
   * The fixed-reasoning line's text.
   *
   * @param picker - The open picker (its mode names the scope).
   * @returns The translated line.
   */
  protected emptyText(picker: { mode: EffortMode }): string {
    void this.state.env.locale()
    return this.state.env.t(
      'ide.chat.effort.fixedForModel',
      { mode: picker.mode, model: this.pickers.effortPickerModel()?.label ?? '?' },
      { defaultValue: 'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.' },
    )
  }

  /** Re-scopes the open picker in place, resetting the highlighted row. */
  protected onModeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as EffortMode
    this.composer.setEffortPicker((p) => (p ? { ...p, mode: value, selectedIdx: -1 } : p))
  }

  /** Applies the clicked level and closes the picker. */
  protected choose(option: { value: string }): void {
    const picker = this.composer.effortPicker()
    if (!picker) return
    void this.modelActions.applyEffortLevel(
      picker.mode,
      option.value,
      this.pickers.effortPickerModel(),
    )
  }

  /** Closes the picker without persisting. */
  protected close(): void {
    this.composer.setEffortPicker(null)
  }

  /** Tints a hovered row (React writes the element's background directly). */
  protected rowEnter(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'rgba(128,128,128,0.15)'
  }

  /**
   * Restores a row's background to its selected/plain state on leave.
   *
   * @param event - The mouse-leave event.
   * @param idx - The row's index in the visible list.
   * @param selectedIdx - The picker's highlighted row.
   */
  protected rowLeave(event: Event, idx: number, selectedIdx: number): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = idx === selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
  }
}
