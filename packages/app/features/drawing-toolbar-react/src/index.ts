/**
 * Whiteboard / canvas / annotation tool selector.
 *
 * Exports `<DrawingToolbar>` and `DrawingTool` type.
 *
 * @example
 * ```tsx
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
 * @module
 */

export * from './DrawingToolbar.js'
