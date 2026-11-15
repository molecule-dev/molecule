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
 * The card intentionally keeps a paper-sticky-note look in BOTH themes:
 * its text color is fixed near-black, so `color` must be a LIGHT pastel
 * (`#fef9c3`, `#dbeafe`, `#dcfce7`, ...) — a dark `color` value makes
 * the body unreadable. The card does not re-tint with the app theme.
 *
 * `onClick` makes the whole card clickable but renders no button
 * semantics — supply your own focus/keyboard affordance (or wrap the
 * card in a button/link) when click-to-open matters for a11y.
 *
 * Node-valued props (`title`, `body`, `modifiedAt`, `actions`) arrive as a
 * prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './NoteCard.js'
export * from './types.js'
