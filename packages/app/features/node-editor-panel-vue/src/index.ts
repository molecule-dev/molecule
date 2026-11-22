/**
 * `@molecule/app-node-editor-panel-vue` — right-side properties panel for
 * node-based editors (chatbot-builder bot nodes, workflow canvases,
 * design-tool inspector panes). The Vue counterpart of
 * `@molecule/app-node-editor-panel-react`: the same exports, the same props
 * (React names) and the same DOM for the same input.
 *
 * Composable sub-primitives:
 * - `<NodeEditorPanel>` — aside chrome with title row, scroll body, footer.
 * - `<NodeEditorSection>` — labeled section with optional trailing slot.
 * - `<NodeEditorSlider>` — range slider with mono-font value chip.
 * - `<NodeEditorToggle>` — switch row with optional icon tile.
 * - `<NodeEditorRadioGroup>` — radio list with custom radio dots.
 *
 * Consumer brings the form state; the package handles structure and styling.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 *
 * import {
 *   NodeEditorPanel,
 *   NodeEditorRadioGroup,
 *   NodeEditorSection,
 *   NodeEditorSlider,
 *   NodeEditorToggle,
 * } from '@molecule/app-node-editor-panel-vue'
 *
 * const Inspector = defineComponent({
 *   setup() {
 *     const temperature = ref(0.7)
 *     const kbEnabled = ref(false)
 *     const format = ref('conversational')
 *     return () =>
 *       h(
 *         NodeEditorPanel,
 *         { title: 'Node Properties', onClose: () => {} },
 *         {
 *           default: () => [
 *             h(NodeEditorSlider, {
 *               label: 'Temperature',
 *               value: temperature.value,
 *               onChange: (next: number) => (temperature.value = next),
 *             }),
 *             h(NodeEditorToggle, {
 *               title: 'Knowledge Base',
 *               icon: 'database',
 *               checked: kbEnabled.value,
 *               onChange: (next: boolean) => (kbEnabled.value = next),
 *             }),
 *             h(NodeEditorSection, { label: 'Response Format' }, {
 *               default: () =>
 *                 h(NodeEditorRadioGroup, {
 *                   value: format.value,
 *                   onChange: (next: string) => (format.value = next),
 *                   options: [
 *                     { value: 'conversational', label: 'Conversational' },
 *                     { value: 'structured', label: 'Structured' },
 *                   ],
 *                 }),
 *             }),
 *           ],
 *         },
 *       )
 *   },
 * })
 *
 * createApp(Inspector).mount('#app')
 * ```
 *
 * @remarks
 * KNOWN LIMITATION — this package styles itself with the same Tailwind classes
 * and Material-3 color tokens as the React package (`bg-surface-container-low`,
 * `text-on-surface-variant`, `border-outline-variant`, `accent-primary`,
 * `w-80`, …) resolved through the ClassMap bond. Out of the box in a standard
 * molecule app the panel renders UNSTYLED because (a) the app's Tailwind build
 * does not scan this package's dist for class literals, and (b) the M3 color
 * tokens are not defined by standard themes. To adopt it today you must add an
 * `@source "<path-to>/app-node-editor-panel-vue/dist"` line to the app's
 * Tailwind CSS AND define the referenced `surface-container-*` / `on-surface*` /
 * `outline-variant` theme colors.
 *
 * The close button and `NodeEditorToggle.icon` render Material Symbols
 * LIGATURES — without the "Material Symbols Outlined" font loaded and a
 * `material-symbols-outlined` CSS class defined, icon names render as plain
 * text (e.g. the word "close").
 *
 * A wired ClassMap bond is still required for the layout helpers —
 * `getClassMap()` throws before wiring. The close button's default aria-label is
 * the `nodeEditorPanel.close` key, translated by `@molecule/app-locales-node-editor-panel`
 * through the app's i18n provider (English when none is bonded).
 *
 * @module
 */

export * from './NodeEditorPanel.js'
export * from './NodeEditorRadioGroup.js'
export * from './NodeEditorSection.js'
export * from './NodeEditorSlider.js'
export * from './NodeEditorToggle.js'
export * from './types.js'
