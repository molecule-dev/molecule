/**
 * `@molecule/app-node-editor-panel-solid` — right-side properties panel for
 * node-based editors (chatbot-builder bot nodes, workflow canvases,
 * design-tool inspector panes). The Solid counterpart of
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
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import {
 *   NodeEditorPanel,
 *   NodeEditorRadioGroup,
 *   NodeEditorSection,
 *   NodeEditorSlider,
 *   NodeEditorToggle,
 * } from '@molecule/app-node-editor-panel-solid'
 *
 * function Inspector() {
 *   const [temperature, setTemperature] = createSignal(0.7)
 *   const [kbEnabled, setKbEnabled] = createSignal(false)
 *   const [format, setFormat] = createSignal('conversational')
 *   return (
 *     <NodeEditorPanel title="Node Properties" onClose={() => {}}>
 *       <NodeEditorSlider label="Temperature" value={temperature()} onChange={setTemperature} />
 *       <NodeEditorToggle
 *         title="Knowledge Base"
 *         icon="database"
 *         checked={kbEnabled()}
 *         onChange={setKbEnabled}
 *       />
 *       <NodeEditorSection label="Response Format">
 *         <NodeEditorRadioGroup
 *           value={format()}
 *           onChange={setFormat}
 *           options={[
 *             { value: 'conversational', label: 'Conversational' },
 *             { value: 'structured', label: 'Structured' },
 *           ]}
 *         />
 *       </NodeEditorSection>
 *     </NodeEditorPanel>
 *   )
 * }
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
 * `@source "<path-to>/app-node-editor-panel-solid/dist"` line to the app's
 * Tailwind CSS AND define the referenced `surface-container-*` / `on-surface*` /
 * `outline-variant` theme colors.
 *
 * The close button and `NodeEditorToggle.icon` render Material Symbols
 * LIGATURES — without the "Material Symbols Outlined" font loaded and a
 * `material-symbols-outlined` CSS class defined, icon names render as plain
 * text (e.g. the word "close").
 *
 * A wired ClassMap bond is still required for the layout helpers —
 * `getClassMap()` throws before wiring. The close button's default aria-label
 * is English-only; pass `closeAriaLabel` with a translated string in localized
 * apps.
 *
 * @module
 */

export * from './NodeEditorPanel.jsx'
export * from './NodeEditorRadioGroup.jsx'
export * from './NodeEditorSection.jsx'
export * from './NodeEditorSlider.jsx'
export * from './NodeEditorToggle.jsx'
export * from './types.js'
