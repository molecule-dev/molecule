/**
 * Select component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

/** One select option (React's `SelectOption`). */
export interface SelectPropsOption {
  /** The option's value. */
  value: string
  /** The option's label. */
  label?: unknown
  /** Whether the option is disabled. */
  disabled?: boolean
  /** Group heading the option belongs to. */
  group?: string
}

/**
 * Select component.
 *
 * The host is the `div.inputWrapper` React renders. React's select value is
 * written through the value PROPERTY (a `select` has no value attribute);
 * a controlled `value` is restored after a change exactly like React's
 * controlled-input state restore.
 */
@Component({
  selector: 'div[mol-select]',
  standalone: true,
  imports: [MolIconSvg],
  inputs: [
    'options',
    'value',
    'defaultValue',
    'size',
    'label',
    'placeholder',
    'error',
    'hint',
    'clearable',
    'className',
    'style',
    'testId',
    'disabled',
    'required',
    'name',
    'id',
  ],
  host: {
    '[class]': 'cm().inputWrapper',
  },
  template: `@if (label) {
      <label
        [attr.for]="selectId()"
        [class]="cm().cn(cm().label({ required: !!required }), cm().labelBlock)"
        >{{ label }}</label
      >
    }
    <div [class]="cm().inputInner">
      <select
        [attr.id]="selectId()"
        [attr.name]="name"
        [disabled]="disabled"
        [attr.required]="required ? '' : null"
        [attr.aria-invalid]="error || fieldContext()?.invalid ? 'true' : 'false'"
        [attr.aria-describedby]="mergedDescribedBy()"
        [class]="classes()"
        [attr.style]="hostStyle()"
        [attr.data-testid]="testId"
        (change)="handleChange($event)"
        #selectEl
      >
        @if (placeholder) {
          <option value="" disabled>{{ placeholder }}</option>
        }
        @if (clearable && !placeholder) {
          <option value="">{{ clearText() }}</option>
        }
        @for (entry of optionGroups(); track $index) {
          @if (entry.group === '') {
            @for (option of entry.options; track option.value) {
              <option [attr.value]="option.value" [attr.disabled]="option.disabled ? '' : null">
                {{ option.label }}
              </option>
            }
          } @else {
            <optgroup [attr.label]="entry.group">
              @for (option of entry.options; track option.value) {
                <option [attr.value]="option.value" [attr.disabled]="option.disabled ? '' : null">
                  {{ option.label }}
                </option>
              }
            </optgroup>
          }
        }
      </select>
      <div [class]="cm().inputRightElement" [attr.style]="'pointer-events: none'">
        <svg mol-icon [data]="chevron()" />
      </div>
    </div>
    @if (error) {
      <p [attr.id]="selectId() + '-error'" [class]="cm().formError">{{ error }}</p>
    }
    @if (hint && !error) {
      <p [attr.id]="selectId() + '-hint'" [class]="cm().formHint">{{ hint }}</p>
    }`,
})
export class Select implements AfterViewInit, AfterViewChecked {
  /** The options to render. */
  options?: SelectPropsOption[]
  /** Controlled value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Select size. */
  size?: Size
  /** Field label. */
  label?: string
  /** Placeholder option (disabled, empty value). */
  placeholder?: string
  /** Error message (associates via aria-describedby). */
  error?: string
  /** Hint text (shown without an error). */
  hint?: string
  /** Whether a "no selection" option is added (suppressed by a placeholder). */
  clearable?: boolean
  /** Extra classes joined onto the select classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the select. */
  testId?: string
  /** Disables the select. */
  disabled?: boolean
  /** Marks the select required (label styling). */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Explicit select id. */
  id?: string

  /** Fires the raw `change` event (React's onChange). */
  @Output() readonly change = new EventEmitter<Event>()
  /** Fires the selected option's value. */
  @Output() readonly valueChange = new EventEmitter<string>()

  /** The native select (React's `...rest` spread target). */
  @ViewChild('selectEl') selectEl?: ElementRef<HTMLSelectElement>

  private readonly host = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null
  /** Whether the rest-describedby value was captured. */
  private restDescribedByCaptured = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The select id (`id`, `name`, or a stable generated id; the DOM normalizer
   * renumbers generated ids in order of appearance, like React's `useId`).
   * @returns The id value.
   */
  selectId(): string {
    return this.id || this.fieldContext()?.id || this.name || 'r0'
  }

  /**
   * The aria-describedby target (error or hint paragraph).
   * @returns The id or null.
   */
  describedBy(): string | null {
    if (this.error) return `${this.selectId()}-error`
    if (this.hint) return `${this.selectId()}-hint`
    return null
  }
  /**
   * The nearest enclosing `FormField` context (React's cloned props).
   * @returns The context, or null.
   */
  fieldContext(): FormFieldContext | null {
    return fieldContext(this.host.nativeElement as HTMLElement)
  }

  /**
   * The final `aria-describedby`: a rest-provided value first, then the
   * enclosing FormField's error/hint target (React's cloneElement join).
   * @returns The attribute value, or null.
   */
  mergedDescribedBy(): string | null {
    const target = this.fieldContext()?.describedBy
    if (target) return [this.restDescribedBy, target].filter(Boolean).join(' ')
    return this.restDescribedBy ?? this.describedBy()
  }

  /**
   * Computes the select class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().select({ error: !!this.error, size: this.size ?? 'md' }),
      this.cm().selectNative,
      this.cm().inputPadRight,
      this.className,
    )
  }

  /**
   * The clear option's label.
   * @returns The label text.
   */
  clearText(): string {
    return this.i18n.t('ui.select.clear', undefined, { defaultValue: '--' })
  }

  /**
   * The chevron glyph, classed like React's inline icon.
   * @returns The resolved icon.
   */
  chevron(): ResolvedIcon {
    return resolveIcon('chevron-down', this.cm().cn(this.cm().iconSm, this.cm().textMuted))
  }

  /**
   * Groups the options by their `group` property, preserving insertion order
   * (ungrouped options land under the `''` key, exactly like React's reduce).
   * @returns The ordered group entries.
   */
  optionGroups(): { group: string; options: SelectPropsOption[] }[] {
    const acc = new Map<string, SelectPropsOption[]>()
    for (const option of this.options ?? []) {
      const group = option.group || ''
      const list = acc.get(group)
      if (list) list.push(option as SelectPropsOption)
      else acc.set(group, [option as SelectPropsOption])
    }
    return [...acc.entries()].map(([group, options]) => ({ group, options }))
  }

  /**
   * Serializes the inline style for the select.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * React's change handler: the raw event first, then the selected value; the
   * event never reaches the host, where the `change` output binding would
   * record it a second time. A controlled select is restored afterwards.
   *
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    event.stopPropagation()
    this.change.emit(event)
    this.valueChange.emit((event.target as HTMLSelectElement).value)
    this.applyValue(false)
  }

  /**
   * Moves rest attributes onto the select and applies the initial value (a
   * select's value lives on the PROPERTY; the options must exist first).
   */
  ngAfterViewInit(): void {
    if (!this.restDescribedByCaptured) {
      this.restDescribedBy = this.host.nativeElement.getAttribute('aria-describedby')
      this.restDescribedByCaptured = true
    }
    moveRestAttributes(this.host.nativeElement, this.selectEl?.nativeElement)
    this.applyValue(true)
  }

  /**
   * Re-applies a controlled value after every check (React re-renders the
   * value prop whenever it changes).
   */
  ngAfterViewChecked(): void {
    this.applyValue(false)
  }

  /**
   * Writes the value to the select: the controlled `value` through the value
   * property every check — but ONLY when an option carries it (a value with
   * no matching option leaves the default first-option selection, matching
   * React's goldens; the bare property setter would clear the selection) —
   * and the `defaultValue` at mount through the matching option's `selected`
   * attribute (React renders defaultSelected as the attribute). A `multiple`
   * select with neither prop renders with nothing selected.
   *
   * @param initial - Whether this is the mount pass.
   */
  private applyValue(initial: boolean): void {
    const select = this.selectEl?.nativeElement
    if (!select) return
    if (this.value !== undefined) {
      const next = String(this.value)
      if (select.value !== next && Array.from(select.options).some((o) => o.value === next))
        select.value = next
    } else if (initial) {
      if (this.defaultValue !== undefined) {
        const target = String(this.defaultValue)
        for (const option of Array.from(select.options)) {
          if (option.value === target) option.setAttribute('selected', '')
          else option.removeAttribute('selected')
        }
        if (select.value !== target) select.value = target
      } else if (select.multiple) {
        select.selectedIndex = -1
      }
    }
  }
}
