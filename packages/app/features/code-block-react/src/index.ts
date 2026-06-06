/**
 * React code block display.
 *
 * Exports `<CodeBlock>` — read-only code panel with optional filename +
 * language header, line numbers, and copy-to-clipboard button.
 *
 * @example
 * ```tsx
 * import { CodeBlock } from '@molecule/app-code-block-react'
 *
 * <CodeBlock
 *   code={`const greet = (name: string) => \`Hello, \${name}!\``}
 *   language="ts"
 *   filename="greet.ts"
 *   showLineNumbers
 * />
 * ```
 *
 * @module
 */

export * from './CodeBlock.js'
