/**
 * NodeEditorRadioGroup component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorRadioOption } from './types.js'
import { generatedName, MolRadioChecked } from './utilities.js'

/**
 * Whether a value is one of the cases' projected node templates (a
 * `{ $nodes }` value inside a data prop becomes a `TemplateRef`).
 *
 * @param value - The prop value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * NodeEditorRadioGroup component.
 *
 * Radio list with the chatbot-builder's custom radio-dot rendering: each
 * option is a labeled tile around a visually hidden native radio sharing one
 * generated group name, so the set is a real radio group. The host IS the
 * outer `<div>` (`div[mol-node-editor-radio-group]`), matching React's root
 * exactly.
 *
 * Option labels are strings or projected templates.
 */
@Component({
  selector: 'div[mol-node-editor-radio-group]',
  standalone: true,
  imports: [MolRadioChecked, NgTemplateOutlet],
  inputs: ['options', 'value', 'onChange'],
  host: {
    role: 'radiogroup',
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (option of options; track option.value) {<label [attr.data-mol-id]="'node-editor-radio-' + option.value" [class]="optionClasses(option)"><input type="radio" [name]="name" [attr.value]="option.value" [molRadioChecked]="option.value === value" (change)="select(option.value, $event)" [class]="srOnlyClass()" /><span [class]="optionLabelClasses(option)">@if (isTemplate(option.label)) {<ng-container [ngTemplateOutlet]="asTemplate(option.label)"></ng-container>} @else {{{ option.label }}}</span><div aria-hidden="true" [class]="ringClasses(option)">@if (option.value === value) {<div [class]="dotClasses()"></div>}</div></label>}`,
})
export class NodeEditorRadioGroup {
  /** The selectable options. */
  options: NodeEditorRadioOption[] = []
  /** The selected value. */
  value!: string
  /** Called with the option selected by a click, keyboard or assistive technology. */
  onChange?: (next: string) => void

  /**
   * The group's generated name, one per instance (see {@link generatedName}).
   */
  readonly name: string = generatedName()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Reports the selected option, then restores the radio group's live
   * `checked` state to the controlled value — React restores controlled inputs
   * after an event even when the render output is unchanged.
   * @param next - The option that was selected.
   * @param event - The native change event.
   */
  select(next: string, event: Event): void {
    this.onChange?.(next)
    const group = (event.target as HTMLElement).closest('[role="radiogroup"]')
    if (!group) return
    for (const input of Array.from(
      group.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    )) {
      input.checked = input.value === this.value
    }
  }

  /**
   * The hidden radio's class list (React's `cm.srOnly`).
   * @returns The class string.
   */
  srOnlyClass(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The host's class list (React's `cm.grid({ cols: 1, gap: 2 })`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().grid({ cols: 1, gap: 2 })
  }

  /**
   * One option tile's class list.
   * @param option - The option.
   * @returns The class string.
   */
  optionClasses(option: NodeEditorRadioOption): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'between' }),
      cm.sp('p', 3),
      cm.cursorPointer,
      option.value === this.value ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
    )
  }

  /**
   * One option label's class list.
   * @param option - The option.
   * @returns The class string.
   */
  optionLabelClasses(option: NodeEditorRadioOption): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      option.value === this.value
        ? cm.nodeEditorPanelOptionLabelSelected
        : cm.nodeEditorPanelOptionLabel,
    )
  }

  /**
   * One option radio ring's class list.
   * @param option - The option.
   * @returns The class string.
   */
  ringClasses(option: NodeEditorRadioOption): string {
    const cm = this.cm()
    return cm.cn(
      cm.nodeEditorPanelRadioRing,
      option.value === this.value
        ? cm.nodeEditorPanelRadioRingSelected
        : cm.nodeEditorPanelRadioRingIdle,
    )
  }

  /**
   * The selected option's inner dot class list.
   * @returns The class string.
   */
  dotClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.bgPrimary)
  }

  /**
   * Whether a label is a projected template.
   * @param value - The label.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The label as a template (call under {@link NodeEditorRadioGroup.isTemplate}).
   * @param value - The label.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }
}
