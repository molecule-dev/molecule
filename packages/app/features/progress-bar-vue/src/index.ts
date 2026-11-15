/**
 * Vue labeled progress bar and progress-card wrapper.
 *
 * Exports:
 * - `<ProgressBar>` — standalone bar with optional label + value display.
 * - `<ProgressCard>` — `<Card>`-wrapped progress display (title, icon,
 *   description, bar, optional extras slot).
 *
 * The Vue counterpart of `@molecule/app-progress-bar-react`: the same props
 * (React names), the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ProgressBar, ProgressCard } from '@molecule/app-progress-bar-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () => [
 *       h(ProgressBar, { value: 65, label: 'Upload progress', valueLabel: '65%', color: 'primary' }),
 *       h(ProgressCard, {
 *         title: 'Storage used',
 *         description: '8.5 GB of 10 GB',
 *         value: 85,
 *         valueLabel: '85%',
 *         color: 'warning',
 *       }),
 *     ]
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * All text (`label`, `valueLabel`, `title`, `description`) is pass-through —
 * supply already-translated strings; the package renders no text of its own.
 * Requires a wired ClassMap bond: the track/fill styles come from the
 * `progress*` ClassMap tokens, so colors follow the active theme. Node-valued
 * props arrive as a prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './ProgressBar.js'
export * from './ProgressCard.js'
export * from './types.js'
