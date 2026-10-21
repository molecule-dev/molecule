import type { JSX, KeyboardEvent } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.js'

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

/**
 * Default normalization: trims whitespace, rejects empty strings and duplicates.
 * @param raw
 * @param current
 */
function defaultNormalize(raw: string, current: string[]): string | null {
  const v = raw.trim()
  if (!v) return null
  if (current.includes(v)) return null
  return v
}

/**
 * Tokenized tag-input with chip display. Commits the draft on Enter,
 * comma, or Tab AND on blur (clicking away with a non-empty draft adds
 * a tag); Backspace on an empty field removes the last token.
 *
 * Enter never submits an enclosing form: its default action is canceled
 * even when the draft is blank, whitespace-only, rejected, or past
 * `maxTags`. An empty Tab keeps normal browser focus traversal.
 *
 * Controlled component — callers own the `value` array.
 * @param props - Component props (see {@link TagInputProps}).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  normalize = defaultNormalize,
  maxTags,
  className,
}: TagInputProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  /**
   * Validates and commits the current draft value as a new tag.
   */
  function commit(): void {
    if (maxTags !== undefined && value.length >= maxTags) {
      setDraft('')
      return
    }
    const next = normalize(draft, value)
    if (next !== null) onChange([...value, next])
    setDraft('')
  }

  /**
   * Handles Enter/comma/Tab to commit a tag, and Backspace to remove the last tag.
   *
   * Enter's default is ALWAYS canceled, even when the draft is empty, whitespace,
   * rejected, or past `maxTags`. Otherwise the browser's implicit form submission
   * fires on Enter and submits the enclosing form (e.g. an editor's Publish
   * action) while the user is only trying to leave the tag field.
   * @param e
   */
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    // Enter can confirm an input-method composition before it is a tag delimiter.
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
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

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.sp('p', 2),
        className,
      )}
    >
      {value.map((tag, i) => (
        <TagChip key={`${tag}-${i}`} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          {tag}
        </TagChip>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit()}
        placeholder={placeholder ?? t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' })}
        className={cm.cn(cm.flex1, cm.input())}
      />
    </div>
  )
}
