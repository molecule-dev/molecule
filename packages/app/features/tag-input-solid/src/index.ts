/**
 * Solid tag-token input and tag-chip display.
 *
 * Exports:
 * - `<TagList>` — read-only saved tags on detail/preview screens. Renders every
 *   value in order; optional `itemClassName` and `renderTag` keep app-owned markup.
 * - `<TagChip>` — standalone labeled chip with optional remove button.
 * - `<TagInput>` — controlled tokenizer: Enter, comma, or Tab adds the
 *   draft; blur commits a non-empty draft; Backspace on an empty field
 *   removes the last token. Enter never submits an enclosing form.
 * - `useTagInput()` — the same tag-entry behavior without markup, for an
 *   app whose markup is already decided (a design system, a spec's selectors):
 *   spread `fieldProps()` on a renderer-neutral `TextField` or `inputProps()`
 *   on your own `<input>`, render the tags yourself, and call `remove(i)` from
 *   your own remove control.
 *
 * This is the Solid counterpart of `@molecule/app-tag-input-react`: the same
 * exports, the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal, For } from 'solid-js'
 *
 * import { TagChip, TagInput, TagList, useTagInput } from '@molecule/app-tag-input-solid'
 *
 * function TagEditor() {
 *   const [tags, setTags] = createSignal<string[]>(['solid'])
 *   return (
 *     <>
 *       <TagInput value={tags()} onChange={setTags} maxTags={10} />
 *       <TagChip onRemove={() => setTags(tags().filter((t) => t !== 'solid'))}>solid</TagChip>
 *     </>
 *   )
 * }
 *
 * // Render the saved record's tags on the destination screen as well as in its editor.
 * function RecordLabels(props: { record: { labels: string[] } }) {
 *   return <TagList value={props.record.labels} />
 * }
 *
 * // App-owned markup: the input and the tag list are siblings.
 * function ArticleTags() {
 *   const [tags, setTags] = createSignal<string[]>([])
 *   const { inputProps, remove } = useTagInput(() => ({ value: tags(), onChange: setTags }))
 *   return (
 *     <>
 *       <input {...inputProps()} />
 *       <ul>
 *         <For each={tags()}>
 *           {(tag, i) => (
 *             <li>
 *               <button type="button" onClick={() => remove(i())}>Remove</button> {tag}
 *             </li>
 *           )}
 *         </For>
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
 *   Actions compose within one tick and reconcile to the controlled `value`.
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

export * from './TagChip.jsx'
export * from './TagInput.jsx'
export * from './TagList.jsx'
export * from './types.js'
export * from './useTagInput.js'
