/**
 * Props and results of the Vue tag-token input — the same props
 * `@molecule/app-tag-input-react` takes (React names), with Vue's reactive
 * primitives where React returns plain values.
 *
 * @module
 */

import type { ComputedRef, HTMLAttributes, Ref, VNodeChild } from 'vue'

import type { TextFieldProps } from '@molecule/app-ui'

/** Props for the {@link TagChip} component. */
export interface TagChipProps {
  /** Visible tag text — the default slot (a `children` prop works too). */
  children?: VNodeChild
  /** Optional remove callback — renders an `×` button when provided. */
  onRemove?: () => void
  /**
   * Optional click callback for the chip body. Fired by mouse click and, for
   * keyboard users, by Enter / Space on the focused chip body. When
   * `onRemove` is also set, the body action moves onto a native button
   * around the label text (a chip holding two controls cannot itself be a
   * button), so mouse users click the same label surface as before.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Props for the {@link TagList} component. List attributes such as `id`,
 * `aria-label` and `data-mol-id` go on the list itself.
 */
export interface TagListProps extends Omit<HTMLAttributes, 'innerHTML' | 'textContent'> {
  /** `data-*` attributes (a `data-mol-id` testing hook among them), put on the list itself. */
  [attribute: `data-${string}`]: string | number | boolean | undefined
  /** Every saved tag, in display order. Empty arrays render an empty list. */
  value: readonly string[]
  /** Additional classes for the list. */
  className?: string
  /** Additional classes for each list item. */
  itemClassName?: string
  /** Optional tag content; the component still renders every value. */
  renderTag?: (tag: string, index: number) => VNodeChild
}

/** Props for the {@link TagInput} component. */
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
  /** Updates the draft from a DOM change event. */
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
  draft: Ref<string>
  /** Replaces the draft text. */
  setDraft: (next: string) => void
  /** Spread onto your own `<input>`: `<input v-bind="inputProps" placeholder="…" />`. */
  inputProps: ComputedRef<TagInputFieldProps>
  /**
   * Spread onto a renderer-neutral `TextField`, which reports its text through
   * `onValueChange`: `<TextField v-bind="fieldProps" placeholder="…" />`.
   */
  readonly fieldProps: ComputedRef<TagInputTextFieldProps>
  /** Normalizes and adds a tag without clearing the draft; returns whether it was added. */
  add: (raw: string) => boolean
  /** Removes the tag at `index`. */
  remove: (index: number) => void
}
