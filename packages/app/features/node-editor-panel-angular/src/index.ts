/**
 * `@molecule/app-node-editor-panel-angular` — right-side properties panel for
 * node-based editors (chatbot-builder bot nodes, workflow canvases,
 * design-tool inspector panes). The Angular counterpart of
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
 * import { Component, signal } from '@angular/core'
 * import {
 *   NodeEditorPanel,
 *   NodeEditorRadioGroup,
 *   NodeEditorSection,
 *   NodeEditorSlider,
 *   NodeEditorToggle,
 * } from '@molecule/app-node-editor-panel-angular'
 *
 * @Component({
 *   selector: 'app-inspector',
 *   standalone: true,
 *   imports: [NodeEditorPanel, NodeEditorSection, NodeEditorSlider, NodeEditorToggle, NodeEditorRadioGroup],
 *   template: `
 *     <aside mol-node-editor-panel [onClose]="close()">
 *       <span slot="title">Node Properties</span>
 *       <div mol-node-editor-slider
 *         [label]="'Temperature'"
 *         [value]="temperature()"
 *         [onChange]="setTemperature"
 *       ></div>
 *       <div mol-node-editor-toggle
 *         [title]="'Knowledge Base'"
 *         icon="database"
 *         [checked]="kbEnabled()"
 *         [onChange]="setKbEnabled"
 *       ></div>
 *       <div mol-node-editor-section [label]="'Response Format'">
 *         <div mol-node-editor-radio-group
 *           [options]="formats"
 *           [value]="format()"
 *           [onChange]="setFormat"
 *         ></div>
 *       </div>
 *     </aside>
 *   `,
 * })
 * export class Inspector {
 *   readonly temperature = signal(0.7)
 *   readonly kbEnabled = signal(false)
 *   readonly format = signal('conversational')
 *   readonly formats = [
 *     { value: 'conversational', label: 'Conversational' },
 *     { value: 'structured', label: 'Structured' },
 *   ]
 *   readonly setTemperature = (next: number): void => this.temperature.set(next)
 *   readonly setKbEnabled = (next: boolean): void => this.kbEnabled.set(next)
 *   readonly setFormat = (next: string): void => this.format.set(next)
 *   readonly close = (): void => {}
 * }
 * ```
 *
 * @remarks
 * Node-valued props are projected content: each component's `[slot=<name>]`
 * selector (`title`, `footer`, `label`, `trailing`, `valueDisplay`, `subtitle`)
 * carries the nodes, and the host's default content is the body. Plain strings
 * may also be passed as inputs.
 *
 * KNOWN LIMITATION — this package styles itself with the same Tailwind classes
 * and Material-3 color tokens as the React package (`bg-surface-container-low`,
 * `text-on-surface-variant`, `border-outline-variant`, `accent-primary`,
 * `w-80`, …) resolved through the ClassMap bond. Out of the box in a standard
 * molecule app the panel renders UNSTYLED because (a) the app's Tailwind build
 * does not scan this package's dist for class literals, and (b) the M3 color
 * tokens are not defined by standard themes. To adopt it today you must add an
 * `@source "<path-to>/app-node-editor-panel-angular/dist"` line to the app's
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

export * from './node-editor-panel.component.js'
export * from './node-editor-radio-group.component.js'
export * from './node-editor-section.component.js'
export * from './node-editor-slider.component.js'
export * from './node-editor-toggle.component.js'
export * from './types.js'
