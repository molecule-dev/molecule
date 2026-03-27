/**
 * Tree view core interface for molecule.dev.
 *
 * Provides a standardized API for hierarchical tree UI components
 * with support for selection, expansion, drag-and-drop, and checkboxes.
 * Bond a provider (e.g. `@molecule/app-tree-view-default`) to supply
 * the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-tree-view'
 *
 * const tree = requireProvider().createTree({
 *   data: [
 *     { id: 'root', label: 'Root', children: [
 *       { id: 'child', label: 'Child' },
 *     ]},
 *   ],
 *   onSelect: (node) => console.log(node.label),
 * })
 * ```
 */

export * from './provider.js'
export * from './types.js'
