/**
 * Types for the Angular code block.
 *
 * @module
 */

/** Props for the {@link CodeBlock} component. */
export interface CodeBlockProps {
  /** Source code to display. */
  code: string
  /** Language tag (`"ts"`, `"bash"`, …). Shown in the header and used as a hint by external highlighters. */
  language?: string
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Show a copy-to-clipboard button. Defaults to true. */
  showCopy?: boolean
  /** Optional custom filename / caption shown left of the language. */
  filename?: string
  /** Extra classes. */
  className?: string
}
