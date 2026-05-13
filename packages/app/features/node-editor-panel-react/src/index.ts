/**
 * `@molecule/app-node-editor-panel-react` — right-side properties
 * panel for node-based editors (chatbot-builder bot nodes, workflow
 * canvases, design-tool inspector panes).
 *
 * Composable sub-primitives:
 * - `<NodeEditorPanel>` — aside chrome with title row, scroll body, footer.
 * - `<NodeEditorSection>` — labeled section with optional trailing slot.
 * - `<NodeEditorSlider>` — range slider with mono-font value chip.
 * - `<NodeEditorToggle>` — iOS-style switch row with optional icon tile.
 * - `<NodeEditorRadioGroup>` — radio list with custom radio dots.
 *
 * Consumer brings the form state; the package handles structure and
 * styling. Generalised from the ai-chatbot-builder
 * BotEditorNodePropertiesPanel.
 *
 * @example
 * ```tsx
 * import {
 *   NodeEditorPanel,
 *   NodeEditorSection,
 *   NodeEditorSlider,
 *   NodeEditorToggle,
 *   NodeEditorRadioGroup,
 * } from '@molecule/app-node-editor-panel-react'
 *
 * <NodeEditorPanel
 *   title="Node Properties"
 *   footer={<SaveBar onSave={handleSave} saving={saving} error={saveError} />}
 * >
 *   <NodeEditorSection label="Model Engine">
 *     <select value={model} onChange={(e) => setModel(e.target.value)}>…</select>
 *   </NodeEditorSection>
 *   <NodeEditorSlider label="Temperature" value={temperature} onChange={setTemperature} />
 *   <NodeEditorToggle title="Knowledge Base" icon="database" checked={kbEnabled} onChange={setKbEnabled} />
 *   <NodeEditorSection label="Response Format">
 *     <NodeEditorRadioGroup
 *       value={format}
 *       onChange={setFormat}
 *       options={[
 *         { value: 'conversational', label: 'Conversational' },
 *         { value: 'structured', label: 'Structured' },
 *         { value: 'json', label: 'JSON' },
 *       ]}
 *     />
 *   </NodeEditorSection>
 * </NodeEditorPanel>
 * ```
 *
 * @module
 */

export * from './NodeEditorPanel.js'
export * from './NodeEditorRadioGroup.js'
export * from './NodeEditorSection.js'
export * from './NodeEditorSlider.js'
export * from './NodeEditorToggle.js'
