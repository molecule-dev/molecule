/**
 * Vue sticky-note style card.
 *
 * Exports `NoteCard` — the Vue counterpart of
 * `@molecule/app-note-card-react`'s `NoteCard`: the same props (React names),
 * the same ClassMap styling, and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { NoteCard } from '@molecule/app-note-card-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const openNote = (): void => {
 *       // navigate to the note…
 *     }
 *     return () =>
 *       h(NoteCard, {
 *         title: 'Meeting notes',
 *         body: 'Follow up with design team on the new dashboard layout.',
 *         color: '#fef9c3',
 *         pinned: true,
 *         modifiedAt: 'Jun 5, 2026',
 *         onClick: openNote,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
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
 * Node-valued props (`title`, `body`, `modifiedAt`, `actions`) arrive as a
 * prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './NoteCard.js'
export * from './types.js'
