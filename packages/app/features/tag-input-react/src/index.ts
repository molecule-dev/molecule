/**
 * React tag-token input and tag-chip display.
 *
 * Exports:
 * - `<TagChip>` — standalone labeled chip with optional remove button.
 * - `<TagInput>` — controlled tokenizer: Enter/, adds, Backspace on
 *   empty field removes the last token.
 *
 * @example
 * ```tsx
 * import { TagChip, TagInput } from '@molecule/app-tag-input-react'
 *
 * // Controlled tag input
 * <TagInput
 *   value={tags}
 *   onChange={setTags}
 *   placeholder="Add a tag…"
 *   maxTags={10}
 * />
 *
 * // Standalone chip
 * <TagChip onRemove={() => removeTag('react')}>react</TagChip>
 * ```
 *
 * @module
 */

export * from './TagChip.js'
export * from './TagInput.js'
