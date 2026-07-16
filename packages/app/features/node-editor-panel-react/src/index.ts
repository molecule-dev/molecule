/**
 * `@molecule/app-node-editor-panel-react` — right-side properties
 * panel for node-based editors (chatbot-builder bot nodes, workflow
 * canvases, design-tool inspector panes).
 *
 * Composable sub-primitives:
 * - `<NodeEditorPanel>` — aside chrome with title row, scroll body, footer.
 * - `<NodeEditorSection>` — labeled section with optional trailing slot.
 * - `<NodeEditorSlider>` — range slider with mono-font value chip.
 * - `<NodeEditorToggle>` — switch row with optional icon tile.
 * - `<NodeEditorRadioGroup>` — radio list with custom radio dots.
 *
 * Consumer brings the form state; the package handles structure and
 * styling.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   NodeEditorPanel,
 *   NodeEditorRadioGroup,
 *   NodeEditorSection,
 *   NodeEditorSlider,
 *   NodeEditorToggle,
 * } from '@molecule/app-node-editor-panel-react'
 *
 * function Inspector() {
 *   const [temperature, setTemperature] = useState(0.7)
 *   const [kbEnabled, setKbEnabled] = useState(false)
 *   const [format, setFormat] = useState('conversational')
 *   return (
 *     <NodeEditorPanel title="Node Properties" onClose={() => {}}>
 *       <NodeEditorSlider label="Temperature" value={temperature} onChange={setTemperature} />
 *       <NodeEditorToggle title="Knowledge Base" icon="database" checked={kbEnabled} onChange={setKbEnabled} />
 *       <NodeEditorSection label="Response Format">
 *         <NodeEditorRadioGroup
 *           value={format}
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
 * KNOWN LIMITATION — this package currently styles itself with raw
 * Tailwind classes and Material-3 color tokens (`bg-surface-container-low`,
 * `text-on-surface-variant`, `border-outline-variant`, `accent-primary`,
 * `w-80`, ...) instead of ClassMap resolvers. Out of the box in a
 * standard molecule app the panel renders UNSTYLED because (a) the app's
 * Tailwind build does not scan this package's dist for class literals,
 * and (b) the M3 color tokens are not defined by standard themes. To
 * adopt it today you must add an `@source "<path-to>/app-node-editor-panel-react/dist"`
 * line to the app's Tailwind CSS AND define the referenced
 * `surface-container-*` / `on-surface*` / `outline-variant` theme colors.
 *
 * The close button and `NodeEditorToggle.icon` render Material Symbols
 * LIGATURES — without the "Material Symbols Outlined" font loaded and a
 * `material-symbols-outlined` CSS class defined, icon names render as
 * plain text (e.g. the word "close").
 *
 * A wired ClassMap bond is still required for the layout helpers —
 * `getClassMap()` throws before wiring. The close button's default
 * aria-label is English-only; pass `closeAriaLabel` with a translated
 * string in localized apps.
 *
 * @module
 */

export * from './NodeEditorPanel.js'
export * from './NodeEditorRadioGroup.js'
export * from './NodeEditorSection.js'
export * from './NodeEditorSlider.js'
export * from './NodeEditorToggle.js'
