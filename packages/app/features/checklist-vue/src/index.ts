/**
 * Vue onboarding checklist with checkboxes and overall progress bar.
 *
 * Exports `<Checklist>` and the `ChecklistItem` type. It is the Vue
 * counterpart of `@molecule/app-checklist-react`: the same props (React
 * names), the same DOM for the same input, and the same `onToggle` calls, so
 * an app switches framework by changing only the package name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { Checklist } from '@molecule/app-checklist-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(Checklist, {
 *         title: 'Getting started',
 *         items: [
 *           { id: 'profile', label: 'Complete your profile', completed: true },
 *           { id: 'invite', label: 'Invite a team member', completed: false },
 *           { id: 'project', label: 'Create your first project', completed: false },
 *         ],
 *         onToggle: (id, next) => updateItem(id, next),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * The progress line uses the i18n key `checklist.progress` (`{{done}}`,
 * `{{total}}`), translated by the `@molecule/app-locales-checklist` companion
 * bond. `label`/`description`/`title` are consumer-provided nodes — pass
 * translated strings via `t()`. The component is fully controlled: it never
 * mutates `completed`; persist the toggle in `onToggle(id, next)` and
 * re-render with updated `items`.
 *
 * @module
 */

export * from './Checklist.js'
export * from './types.js'
