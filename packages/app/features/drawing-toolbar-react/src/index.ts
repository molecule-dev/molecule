/**
 * Whiteboard / canvas / annotation tool selector.
 *
 * Exports `<DrawingToolbar>` (a `role="toolbar"` row/column of toggle
 * buttons) and the `DrawingTool` type. Selection is controlled: pass
 * `selectedId` + `onSelect`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type DrawingTool, DrawingToolbar } from '@molecule/app-drawing-toolbar-react'
 *
 * // Labels feed aria-label/title verbatim — translate them in a localized app.
 * const TOOLS: DrawingTool[] = [
 *   { id: 'select', label: 'Select', icon: '↖' },
 *   { id: 'pen', label: 'Pen', icon: '✎' },
 *   { id: 'rectangle', label: 'Rectangle', icon: '▭' },
 *   { id: 'eraser', label: 'Eraser', icon: '⌫' },
 * ]
 *
 * export function WhiteboardTools() {
 *   const [tool, setTool] = useState('select')
 *   return (
 *     <div>
 *       <DrawingToolbar tools={TOOLS} selectedId={tool} onSelect={setTool} orientation="horizontal" />
 *       <canvas width={640} height={360} data-tool={tool} style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }} />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is ONLY a selector: it draws nothing and owns no canvas — read the selected id and
 *   implement the tool in your own canvas (e.g. `@molecule/app-whiteboard-canvas-react`).
 * - Selection is CONTROLLED: `selectedId` and `onSelect` are required; store the id from
 *   `onSelect(id)` and pass it back, or the highlight never moves. The selected button gets
 *   `aria-pressed="true"`.
 * - `tools` is REQUIRED by the type — always pass your own list, with `label` already
 *   translated via your `t()` call (labels feed each button's `aria-label` and `title`
 *   verbatim). When a tool has no `icon`, the first character of `label` is shown.
 * - `extras` renders after the tool buttons — drop in color pickers or stroke-width controls.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; buttons are `Button` from
 *   `@molecule/app-ui-react` (a peer dependency).
 * - The toolbar's own aria-label resolves through `t('drawingToolbar.label')` with an English
 *   fallback; companion locale bond: `@molecule/app-locales-drawing-toolbar`.
 *
 * @module
 */

export * from './DrawingToolbar.js'
