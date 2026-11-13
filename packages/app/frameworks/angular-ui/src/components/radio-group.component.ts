/**
 * RadioGroup component (React parity).
 *
 * @module
 */

import { Component, ElementRef, EventEmitter, inject, Output } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/** One radio option. */
export interface RadioOption {
  /** The option's value. */
  value: string
  /** The option's label (text). */
  label?: unknown
  /** Whether this option is disabled. */
  disabled?: boolean
}

/**
 * RadioGroup component.
 *
 * The host is the `role="radiogroup"` div React renders. Selecting an option
 * emits that option's VALUE (not the DOM event) through the `change` output,
 * exactly like React's per-option handler.
 */
@Component({
  selector: 'div[mol-radio-group]',
  standalone: true,
  inputs: [
    'options',
    'value',
    'size',
    'label',
    'name',
    'direction',
    'error',
    'className',
    'style',
    'testId',
    'disabled',
  ],
  host: {
    '[class]': 'className',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.role]': '"radiogroup"',
    '[attr.aria-label]': 'groupLabel()',
    '[attr.aria-invalid]': 'error ? "true" : null',
    '[attr.aria-describedby]': 'error ? errorId() : null',
  },
  template: `@if (label) {
      <div [class]="cm().cn(cm().label({ required: false }), cm().sp('mb', 2))">{{ label }}</div>
    }
    <div [class]="cm().radioGroupLayout(direction ?? 'vertical')">
      @for (option of options ?? []; track option.value) {
        <label
          [class]="
            cm().cn(cm().controlLabel, (disabled || option.disabled) && cm().controlDisabled)
          "
        >
          <input
            type="radio"
            [attr.name]="groupName()"
            [attr.value]="option.value"
            [attr.checked]="value === option.value ? '' : null"
            [disabled]="disabled || option.disabled"
            (change)="select($event)"
            [attr.data-state]="value === option.value ? 'checked' : 'unchecked'"
            [class]="cm().cn(cm().radio({ error: !!error }), cm().cursorPointer)"
          />
          <span [class]="cm().controlText">{{ option.label }}</span>
        </label>
      }
    </div>
    @if (error) {
      <p [attr.id]="errorId()" [class]="cm().cn(cm().formError, cm().sp('mt', 1))">{{ error }}</p>
    }`,
})
export class RadioGroup {
  /** The options to render. */
  options?: RadioOption[]
  /** The selected option value. */
  value?: string
  /** Group size (kept for prop parity). */
  size?: unknown
  /** Group label. */
  label?: string
  /** Native radio group name (defaults to a stable generated name). */
  name?: string
  /** Layout direction. */
  direction?: 'vertical' | 'horizontal'
  /** Error message. */
  error?: string
  /** Extra classes for the group root. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** Disables every option. */
  disabled?: boolean

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The native radio group name.
   * @returns The name value.
   */
  groupName(): string {
    return this.name || 'r0'
  }

  /**
   * The error paragraph id.
   * @returns The id value.
   */
  errorId(): string {
    return `${this.groupName()}-error`
  }

  /**
   * The accessible group label.
   * @returns The label text.
   */
  groupLabel(): string {
    return (
      this.label ?? this.i18n.t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })
    )
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Emits the selected option's value; the change event stops here so the
   * host-level `change` output binding does not record it a second time. Every
   * radio's checked state is then restored to the controlled `value` — checking
   * one radio natively UNCHECKS the previously selected one, so restoring only
   * the clicked input would leave the group with no selection at all.
   *
   * @param event - The native radio change event.
   */
  select(event: Event): void {
    event.stopPropagation()
    this.change.emit((event.target as HTMLInputElement).value)
    // React always controls radios (checked={value === option.value}); restore.
    const radios = (this.host.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]')
    for (const radio of Array.from(radios) as HTMLInputElement[])
      radio.checked = this.value === radio.value
  }

  /** Fires the selected option's value. */
  @Output() readonly change = new EventEmitter<string>()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly host = inject(ElementRef)
}
