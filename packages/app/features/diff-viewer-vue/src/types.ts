/**
 * Types of `@molecule/app-diff-viewer-vue` — `@molecule/app-diff-viewer-react`'s
 * prop shapes, same names and defaults.
 *
 * @module
 */

/** Props accepted by the {@link DiffViewer} component. */
export interface DiffViewerProps {
  /** Original text. */
  before: string
  /** New text. */
  after: string
  /** Display mode. Defaults to `'unified'`. */
  mode?: 'unified' | 'split'
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Optional filename / context label. */
  filename?: string
  /** Extra classes. */
  className?: string
}
