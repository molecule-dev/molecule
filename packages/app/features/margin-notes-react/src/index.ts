/**
 * Margin notes: long-form text with notes beside each paragraph — annotated
 * essays, commentary, and posts that show which paragraphs an AI wrote and the
 * prompt behind each.
 *
 * Desktop: a large-type prose column and a narrower notes column to its right;
 * each note lines up with the paragraph (or run of paragraphs) it belongs to
 * and appears once. Hovering or focusing a paragraph emphasises its notes;
 * hovering or focusing a note tints the paragraphs it covers. A paragraph can
 * carry a small mark in its left margin. Note kinds (say, "Summaries" and
 * "Prompts") each get a real switch. Phone: the notes column gives way to a bar
 * fixed to the bottom that shows the notes for the section being read and
 * follows the reader; tapping a paragraph pins its notes, tapping again lets
 * go; the switches live in the bar. A document with no notes renders centred
 * prose at full measure with no notes column.
 *
 * @example
 * ```tsx
 * import { MarginNotes } from '@molecule/app-margin-notes-react'
 *
 * // blocks: your rendered paragraphs, in order; notes: what goes beside them.
 * export function AnnotatedPost() {
 *   return (
 *     <MarginNotes
 *       blocks={[
 *         { id: 'p1', content: <p>Every post carries a map of who wrote what.</p>, noteIds: ['s1'] },
 *         { id: 'p2', content: <p>The map is built from the session export.</p>, noteIds: ['s1', 'q1'], marked: true },
 *       ]}
 *       notes={[
 *         { id: 's1', kind: 'summary', content: <p>How the map is made.</p> },
 *         { id: 'q1', kind: 'prompt', content: <p>“explain the map” — claude-opus-4</p> },
 *       ]}
 *       kinds={[
 *         { id: 'summary', label: 'Summaries', defaultOn: true },
 *         { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
 *       ]}
 *       markLabel="Written with AI"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Defaults are right before JavaScript runs.** Which kinds show comes from
 *   `kinds[].defaultOn` in the FIRST render (a hidden note carries the HTML
 *   `hidden` attribute), and the desktop/phone split is CSS
 *   (`cm.hiddenBelow('md')` / `cm.hiddenFrom('md')`). Prerender the page with
 *   `renderToString` and a kind that defaults off is already absent; do NOT
 *   toggle defaults in a `useEffect` of your own.
 * - **One note, one place.** A note shows beside the FIRST row that refers to
 *   it. Give consecutive paragraphs that share a note the same `noteIds` and
 *   they form one row with the note beside them once. A paragraph whose
 *   `noteIds` differ from its neighbour's starts a new row.
 * - **The mark is drawn on the block**, as an absolutely-placed dot inside the
 *   block's own wrapper (hidden on phones, where there is no margin). At rest a
 *   marked block is typeset exactly like an unmarked one.
 * - **Pass rendered blocks, not markdown.** Split your renderer's output into
 *   top-level blocks (one per paragraph/heading/list) and give each a stable
 *   `id`; the component adds no markup inside them.
 * - **Section notes follow the reader; paragraph notes wait for a tap.** On a
 *   phone the panel shows the kinds with `panel: 'follow'` (the default) for
 *   the section in view. Give a kind that is about ONE paragraph (a prompt, a
 *   citation) `panel: 'tap'`: it shows when that paragraph is tapped and goes
 *   on the second tap.
 * - **Controlled or not.** Pass `shownKinds` + `onShownKindsChange` to own the
 *   switches' state (e.g. to remember it); otherwise the component does.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`; `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; the switches are `Switch`
 *   from `@molecule/app-ui-react` (a peer dependency).
 * - A note id in `noteIds` with no matching entry in `notes` is silently dropped, and a
 *   note's `kind` missing from `kinds` is ALWAYS shown (no switch).
 * - The phone bar reserves space at the end of the text so it never covers the
 *   last paragraph. UI strings come from the companion locale bond
 *   `@molecule/app-locales-margin-notes`; kind labels and `markLabel` are yours
 *   to translate.
 *
 * @module
 */

export * from './MarginNotes.js'
export * from './rows.js'
export * from './types.js'
