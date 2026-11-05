import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.js'
import { useTagInput } from './useTagInput.js'

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
 * Tokenized tag-input with chip display. Commits the draft on Enter,
 * comma, or Tab AND on blur (clicking away with a non-empty draft adds
 * a tag); Backspace on an empty field removes the last token.
 *
 * Enter never submits an enclosing form: its default action is canceled
 * even when the draft is blank, whitespace-only, rejected, or past
 * `maxTags`. An empty Tab keeps normal browser focus traversal.
 *
 * Controlled component — callers own the `value` array. For markup the
 * app already decided (a design system, a spec's selectors), use
 * {@link useTagInput} directly: this component is that hook plus default markup.
 * @param props - Component props (see {@link TagInputProps}).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  normalize,
  maxTags,
  className,
}: TagInputProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { inputProps, remove } = useTagInput({ value, onChange, normalize, maxTags })

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.sp('p', 2),
        className,
      )}
    >
      {value.map((tag, i) => (
        <TagChip key={`${tag}-${i}`} onRemove={() => remove(i)}>
          {tag}
        </TagChip>
      ))}
      <input
        type="text"
        {...inputProps}
        placeholder={placeholder ?? t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' })}
        className={cm.cn(cm.flex1, cm.input())}
      />
    </div>
  )
}
