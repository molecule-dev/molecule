/**
 * Props and results of the Svelte tag-token input — the same props
 * `@molecule/app-tag-input-react` takes (React names), with Svelte's snippets
 * for nodes and its stores for reactive values.
 *
 * @module
 */

import type { Snippet } from 'svelte'
import type { Readable } from 'svelte/store'

/** Props for the {@link TagChip} component. */
export interface TagChipProps {
  /** Visible tag text. */
  children: Snippet
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

/** Props for the {@link TagList} component. */
export interface TagListProps {
  /** Every saved tag, in display order. Empty arrays render an empty list. */
  value: readonly string[]
  /** Additional classes for the list. */
  className?: string
  /** Additional classes for each list item. */
  itemClassName?: string
  /** Optional tag content; the component still renders every value. */
  renderTag?: Snippet<[string, number]>
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
  /** Updates the draft from a DOM input event. */
  onChange: (e: Event) => void
  /** Enter/comma/Tab commit the draft; Backspace on an empty draft removes the last tag. */
  onKeyDown: (e: KeyboardEvent) => void
  /** Commits a non-empty draft when the field loses focus. */
  onBlur: () => void
}

/** What {@link useTagInput} returns. */
export interface UseTagInputResult {
  /** The current draft text. */
  draft: Readable<string>
  /** Replaces the draft text. */
  setDraft: (next: string) => void
  /** Spread onto your own `<input>`: `<input value={$inputProps.value} … />`. */
  inputProps: Readable<TagInputFieldProps>
  /** Normalizes and adds a tag without clearing the draft; returns whether it was added. */
  add: (raw: string) => boolean
  /** Removes the tag at `index`. */
  remove: (index: number) => void
}
