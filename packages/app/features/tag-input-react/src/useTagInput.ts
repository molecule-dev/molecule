import type { ChangeEvent, KeyboardEvent } from 'react'
import { useState } from 'react'

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
  /** Updates the draft. */
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  /** Enter/comma/Tab commit the draft; Backspace on an empty draft removes the last tag. */
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  /** Commits a non-empty draft when the field loses focus. */
  onBlur: () => void
}

/** What {@link useTagInput} returns. */
export interface UseTagInputResult {
  /** The current draft text. */
  draft: string
  /** Replaces the draft text. */
  setDraft: (next: string) => void
  /** Spread onto your own `<input>`: `<input {...inputProps} placeholder="Enter tags" />`. */
  inputProps: TagInputFieldProps
  /** Normalizes and adds a tag; returns whether it was added. */
  add: (raw: string) => boolean
  /** Removes the tag at `index`. */
  remove: (index: number) => void
}

/**
 * Default normalization: trims whitespace, rejects empty strings and duplicates.
 * @param raw - The typed text.
 * @param current - The tags already present.
 * @returns The tag to add, or `null` to reject it.
 */
function defaultNormalize(raw: string, current: string[]): string | null {
  const v = raw.trim()
  if (!v) return null
  if (current.includes(v)) return null
  return v
}

/**
 * Tag-entry behavior without markup, for an app whose markup is already
 * decided (a design system, a spec's selectors). Spread `inputProps` onto
 * your own `<input>` and render the tags however you need, calling
 * `remove(i)` from your own remove control. `<TagInput>` is this hook plus
 * default markup.
 *
 * Enter commits the draft and never submits an enclosing form: its default
 * is canceled even when the draft is blank, rejected, or past `maxTags`.
 * Comma and Tab commit a non-empty draft (an empty Tab keeps normal focus
 * traversal); blur commits a non-empty draft; Backspace on an empty draft
 * removes the last tag.
 *
 * @example
 * ```tsx
 * // The app keeps its own markup: the input and the tag list are siblings,
 * // and each tag's remove control is whatever element the design calls for.
 * const { inputProps, remove } = useTagInput({ value: tags, onChange: setTags })
 * return (
 *   <>
 *     <input {...inputProps} placeholder={placeholder} />
 *     <ul>
 *       {tags.map((tag, i) => (
 *         <li key={tag}>
 *           <i role="button" aria-label={removeLabel} onClick={() => remove(i)} /> {tag}
 *         </li>
 *       ))}
 *     </ul>
 *   </>
 * )
 * ```
 * @param options - The controlled tag list and its rules (see {@link UseTagInputOptions}).
 * @returns The draft, input props and add/remove actions (see {@link UseTagInputResult}).
 */
export function useTagInput({
  value,
  onChange,
  normalize = defaultNormalize,
  maxTags,
}: UseTagInputOptions): UseTagInputResult {
  const [draft, setDraft] = useState('')

  /**
   * Normalizes `raw` and appends it when accepted and under `maxTags`.
   * @param raw - The text to add.
   * @returns Whether a tag was added.
   */
  function add(raw: string): boolean {
    if (maxTags !== undefined && value.length >= maxTags) return false
    const next = normalize(raw, value)
    if (next === null) return false
    onChange([...value, next])
    return true
  }

  /** Commits the draft (accepted or not) and clears it. */
  function commit(): void {
    add(draft)
    setDraft('')
  }

  /**
   * Enter/comma/Tab commit; Backspace on an empty draft removes the last tag.
   * @param e - The key event from the text input.
   */
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    // Enter can confirm an input-method composition before it is a tag delimiter.
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      // Always canceled: the browser's implicit submission would otherwise
      // submit the enclosing form while the user is only adding a tag.
      e.preventDefault()
      if (draft.trim()) commit()
    } else if (e.key === ',' || e.key === 'Tab') {
      if (draft.trim()) {
        e.preventDefault()
        commit()
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return {
    draft,
    setDraft,
    inputProps: {
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onKeyDown,
      onBlur: () => {
        if (draft.trim()) commit()
      },
    },
    add,
    remove: (index) => onChange(value.filter((_, j) => j !== index)),
  }
}
