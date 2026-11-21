/**
 * Svelte sticky-note style card — the Svelte counterpart of
 * `@molecule/app-note-card-react`, with the same props and the same DOM.
 *
 * Exports `NoteCard` — a sticky-note style card with optional color tint,
 * pinned indicator, and bottom-right actions. Use for note-taking apps,
 * digital post-its, dashboard quick-notes.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { NoteCard } from '@molecule/app-note-card-svelte'
 *
 *   declare function openNote(): void
 * </script>
 *
 * <NoteCard
 *   title="Meeting notes"
 *   body="Follow up with design team on the new dashboard layout."
 *   color="#fef9c3"
 *   pinned
 *   modifiedAt="Jun 5, 2026"
 *   onclick={openNote}
 * />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * The card's paper is a theme tone: the documented note tints (yellow
 * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
 * `#fef3c7`) render as the theme's light tint of the matching tone, so the
 * card and its text (the theme's ink) follow the app theme. A `color` with
 * no tone is data: it is applied as given, over the tone's paper.
 *
 * `onClick` makes the whole card clickable through a transparent native
 * button over it — Enter and Space included, natively — named by the title
 * when there is one, else the body; the card's inner controls (the `actions`
 * slot) sit above it and keep their own clicks.
 *
 * Node-valued props (`title`, `body`, `modifiedAt`, `actions`) arrive as
 * snippets; strings render as text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
