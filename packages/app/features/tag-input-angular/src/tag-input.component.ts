/**
 * TagInput component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './tag-chip.component.js'
import { useTagInput } from './use-tag-input.js'

/**
 * TagInput component — the Angular counterpart of
 * `@molecule/app-tag-input-react`'s `TagInput`.
 *
 * Tokenized tag-input with chip display: commits the draft on Enter, comma, or
 * Tab AND on blur (clicking away with a non-empty draft adds a tag); Backspace
 * on an empty field removes the last token. Enter never submits an enclosing
 * form. The host IS React's outer `<div>` (`div[mol-tag-input]`).
 *
 * Controlled component — callers own the `value` array. For markup the app has
 * already decided (a design system, a spec's selectors), use `useTagInput`
 * directly: this component is that hook plus default markup.
 */
@Component({
  selector: 'div[mol-tag-input]',
  standalone: true,
  imports: [TagChip],
  inputs: ['value', 'onChange', 'placeholder', 'normalize', 'maxTags', 'className'],
  host: { '[class]': 'classes()' },
  template: `@for (tag of value; track tag + '-' + $index) {
      <span mol-tag-chip [onRemove]="remover($index)">{{ tag }}</span>
    }
    <input
      type="text"
      [value]="input.draft()"
      [attr.value]="input.draft()"
      (input)="handleInput($event)"
      (keydown)="handleKeyDown($event)"
      (focusout)="handleBlur()"
      [attr.placeholder]="placeholderText()"
      [class]="inputClasses()"
    />`,
})
export class TagInput {
  /** Controlled list of tag values. */
  value: string[] = []
  /** Called whenever the tag list changes. */
  onChange?: (next: string[]) => void
  /** Placeholder shown in the text input when no tokens exist yet. */
  placeholder?: string
  /** Validate/transform an input before adding; `null` rejects it. */
  normalize?: (raw: string, current: string[]) => string | null
  /** Max tags allowed. When reached, further input is ignored. */
  maxTags?: number
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The translation service (i18n provider). */
  readonly i18n = useTranslation()

  /** The tag-entry behavior: the same composable an app-owned markup uses. */
  readonly input = useTagInput(() => ({
    value: this.value,
    onChange: (next: string[]) => this.onChange?.(next),
    normalize: this.normalize,
    maxTags: this.maxTags,
  }))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      cm.sp('p', 2),
      this.className,
    )
  }

  /**
   * The text field's class list.
   * @returns The class string.
   */
  inputClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, cm.input())
  }

  /**
   * The placeholder shown in the text field.
   * @returns The caller's placeholder, else the translated default.
   */
  placeholderText(): string {
    return (
      this.placeholder ?? this.i18n.t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' })
    )
  }

  /**
   * The remove control of the tag at an index.
   * @param index - The tag's position.
   * @returns The callback the chip runs.
   */
  remover(index: number): () => void {
    return () => this.input.remove(index)
  }

  /**
   * Forwards a text-field change to the draft.
   * @param event - The DOM input event.
   */
  handleInput(event: Event): void {
    this.input.inputProps().onChange(event)
  }

  /**
   * Commits (or removes) on a key press.
   * @param event - The DOM keyboard event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    this.input.inputProps().onKeyDown(event)
  }

  /** Commits a non-empty draft when the field loses focus. */
  handleBlur(): void {
    this.input.inputProps().onBlur()
  }
}
