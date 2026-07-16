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
 * import { DrawingToolbar } from '@molecule/app-drawing-toolbar-react'
 *
 * const [tool, setTool] = useState('select')
 *
 * <DrawingToolbar
 *   tools={[
 *     { id: 'select', label: 'Select', icon: '↖' },
 *     { id: 'pen', label: 'Pen', icon: '✎' },
 *     { id: 'rectangle', label: 'Rectangle', icon: '▭' },
 *   ]}
 *   selectedId={tool}
 *   onSelect={setTool}
 *   orientation="horizontal"
 * />
 * ```
 *
 * @remarks
 * - `tools` is REQUIRED by the type — always pass your own list, with
 *   `label` already translated via your `t()` call (labels feed each
 *   button's `aria-label` and `title` verbatim).
 * - The toolbar's own aria-label resolves through `t('drawingToolbar.label')`
 *   with an English fallback; companion locale bond:
 *   `@molecule/app-locales-drawing-toolbar`.
 * - When a tool has no `icon`, the first character of `label` is shown.
 * - `extras` renders after the tool buttons — drop in color pickers or
 *   stroke-width controls.
 * - Buttons come from `@molecule/app-ui-react`; requires a wired ClassMap
 *   bond and the app I18nProvider (standard molecule app setup).
 *
 * @module
 */

export * from './DrawingToolbar.js'
