/**
 * React tag-token input and tag-chip display.
 *
 * Exports:
 * - `<TagChip>` — standalone labeled chip with optional remove button.
 * - `<TagInput>` — controlled tokenizer: Enter, comma, or Tab adds the
 *   draft; blur commits a non-empty draft; Backspace on an empty field
 *   removes the last token. Enter never submits an enclosing form.
 * - `useTagInput()` — the same tag-entry behavior without markup, for an
 *   app whose markup is already decided (a design system, a spec's selectors):
 *   spread `inputProps` on your own `<input>`, render the tags yourself, and
 *   call `remove(i)` from your own remove control.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { useTranslation } from '@molecule/app-react'
 * import { TagChip, TagInput, useTagInput } from '@molecule/app-tag-input-react'
 *
 * function TagEditor() {
 *   const [tags, setTags] = useState<string[]>(['react'])
 *   return (
 *     <>
 *       <TagInput value={tags} onChange={setTags} maxTags={10} />
 *       <TagChip onRemove={() => setTags(tags.filter((t) => t !== 'react'))}>react</TagChip>
 *     </>
 *   )
 * }
 *
 * // App-owned markup: the input and the tag list are siblings.
 * function ArticleTags({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
 *   const { t } = useTranslation()
 *   const { inputProps, remove } = useTagInput({ value: tags, onChange: setTags })
 *   return (
 *     <>
 *       <input {...inputProps} />
 *       <ul>
 *         {tags.map((tag, i) => (
 *           <li key={tag}>
 *             <button type="button" onClick={() => remove(i)}>
 *               {t('tagChip.remove', {}, { defaultValue: 'Remove' })}
 *             </button> {tag}
 *           </li>
 *         ))}
 *       </ul>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `<TagInput>` and `<TagChip>` need the app's i18n provider and a ClassMap
 *   bond wired (`useTranslation()` / `getClassMap()` throw otherwise).
 *   `useTagInput` itself needs neither; the app owns its markup and text.
 * - `add(raw)` adds an independent value without changing the draft (for
 *   example, a suggestion). A custom draft-commit control should call
 *   `add(draft)` followed by `setDraft('')` to avoid a later blur reusing it.
 *   Actions compose within one React batch and reconcile to the controlled
 *   `value` on the next commit.
 * - Committing happens on Enter/comma/Tab AND on blur — clicking away
 *   with a non-empty draft adds a tag; keep that in mind in forms.
 * - Enter inside the field is always swallowed: a blank, rejected, or
 *   over-`maxTags` draft does nothing and never submits an enclosing
 *   form. An empty Tab keeps normal browser focus traversal.
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
export * from './useTagInput.js'
