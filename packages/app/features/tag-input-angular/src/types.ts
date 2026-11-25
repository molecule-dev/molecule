/**
 * Types of `@molecule/app-tag-input-angular` — the Angular counterpart of
 * `@molecule/app-tag-input-react`, same props and DOM.
 *
 * @module
 */

import type { Signal, TemplateRef } from '@angular/core'

import type { TextFieldProps } from '@molecule/app-ui'

/** Props for the {@link TagChip} component (React names). */
export interface TagChipProps {
  /** Visible tag text — projected content (an input cannot carry a node). */
  children?: unknown
  /** Optional remove callback — renders an `×` button when provided. */
  onRemove?: (event?: Event) => void
  /**
   * Optional click callback for the chip body. Fired by mouse click and, for
   * keyboard users, by Enter / Space on the focused chip body. When
   * `onRemove` is also set, the body action moves onto a native button
   * around the label text (a chip holding two controls cannot itself be a
   * button), so mouse users click the same label surface as before.
   */
  onClick?: (event?: Event) => void
  /** Extra classes. */
  className?: string
}

/** Props for the {@link TagInput} component (React names). */
export interface TagInputProps {
  /** Controlled list of tag values. */
  value: string[]
  /** Called whenever the tag list changes. */
  onChange: (next: string[]) => void
  /** Placeholder shown in the text input when no tokens exist yet. */
  placeholder?: string
  /**
   * Validate/transform an input before adding. Return `null` to reject.
   * Default trims whitespace and rejects empty + duplicate entries.
   */
  normalize?: (raw: string, current: string[]) => string | null
  /** Max tags allowed. When reached, further input is ignored. */
  maxTags?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Props for the {@link TagList} component (React names). List attributes such
 * as `id`, `aria-label` and `data-mol-id` are written on the host, which is
 * the list itself (`<ul mol-tag-list id="…">`).
 */
export interface TagListProps {
  /** Every saved tag, in display order. Empty arrays render an empty list. */
  value: readonly string[]
  /** Additional classes for the list. */
  className?: string
  /** Additional classes for each list item. */
  itemClassName?: string
  /**
   * Optional tag content; the component still renders every value. A template
   * reference whose context carries the tag as `$implicit`/`a0` and the index
   * as `a1` (React's `renderTag(tag, index)` render prop).
   */
  renderTag?: TemplateRef<{ $implicit: string; a0: string; a1: number }>
}

/** Options for {@link useTagInput}. */
export interface UseTagInputOptions {
  /** Controlled list of tag values. */
  value: string[]
  /** Called whenever the tag list changes. */
  onChange: (next: string[]) => void
  /**
   * Validate/transform an input before adding. Return `null` to reject.
   * Default trims whitespace and rejects empty + duplicate entries.
   */
  normalize?: (raw: string, current: string[]) => string | null
  /** Max tags allowed. When reached, further input is ignored. */
  maxTags?: number
}

/** Props to spread onto the text `<input>` that types new tags. */
export interface TagInputFieldProps {
  /** The draft text. */
  value: string
  /** Updates the draft from a DOM input event. */
  onChange: (e: Event) => void
  /** Enter/comma/Tab commit the draft; Backspace on an empty draft removes the last tag. */
  onKeyDown: (e: KeyboardEvent) => void
  /** Commits a non-empty draft when the field loses focus. */
  onBlur: () => void
}

/** The props to spread onto a renderer-neutral TextField. */
export type TagInputTextFieldProps = Required<
  Pick<TextFieldProps, 'value' | 'onValueChange' | 'onKeyDown' | 'onBlur'>
>

/** What {@link useTagInput} returns. */
export interface UseTagInputResult {
  /** The current draft text. */
  draft: Signal<string>
  /** Replaces the draft text. */
  setDraft: (next: string) => void
  /** Bind onto your own `<input>`: `[value]="inputProps().value" (input)="inputProps().onChange($event)" …`. */
  inputProps: Signal<TagInputFieldProps>
  /**
   * Bind onto a renderer-neutral `TextField`, which reports its text through
   * `onValueChange`: `[value]="fieldProps().value" (valueChange)="fieldProps().onValueChange($event)" …`.
   */
  readonly fieldProps: Signal<TagInputTextFieldProps>
  /** Normalizes and adds a tag without clearing the draft; returns whether it was added. */
  add: (raw: string) => boolean
  /** Removes the tag at `index`. */
  remove: (index: number) => void
}
