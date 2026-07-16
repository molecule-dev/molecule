/**
 * React tag-token input and tag-chip display.
 *
 * Exports:
 * - `<TagChip>` — standalone labeled chip with optional remove button.
 * - `<TagInput>` — controlled tokenizer: Enter, comma, or Tab adds the
 *   draft; blur commits a non-empty draft; Backspace on an empty field
 *   removes the last token.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { TagChip, TagInput } from '@molecule/app-tag-input-react'
 *
 * function TagEditor() {
 *   const [tags, setTags] = useState<string[]>(['react'])
 *   return (
 *     <>
 *       <TagInput value={tags} onChange={setTags} placeholder="Add a tag…" maxTags={10} />
 *       <TagChip onRemove={() => setTags(tags.filter((t) => t !== 'react'))}>react</TagChip>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - Committing happens on Enter/comma/Tab AND on blur — clicking away
 *   with a non-empty draft adds a tag; keep that in mind in forms.
 * - Default `normalize` trims whitespace and rejects empties +
 *   duplicates; pass your own to lowercase, validate, or map values
 *   (return `null` to reject).
 * - When `maxTags` is reached further input is silently discarded (the
 *   draft clears, no error UI).
 * - `<TagChip>` ships no background surface of its own — add one via
 *   `className` if bare text chips are too subtle in your theme.
 *
 * @module
 */

export * from './TagChip.js'
export * from './TagInput.js'
