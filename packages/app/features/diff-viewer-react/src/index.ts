/**
 * Text/code diff viewer.
 *
 * Exports `<DiffViewer>` (unified or split mode).
 *
 * @example
 * ```tsx
 * import { DiffViewer } from '@molecule/app-diff-viewer-react'
 *
 * <DiffViewer
 *   before="const x = 1\nconsole.log(x)"
 *   after="const x = 2\nconsole.log(x)"
 *   filename="src/config.ts"
 *   mode="unified"
 *   showLineNumbers={true}
 * />
 * ```
 *
 * @module
 */

export * from './DiffViewer.js'
