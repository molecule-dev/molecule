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
 * @remarks
 * `code` is rendered as PLAIN TEXT — there is no syntax highlighting and no
 * HTML parsing, so do not pass pre-highlighted HTML (it will display as
 * literal tags). To highlight, wrap or replace this component with one that
 * renders your highlighter's output; `language` is only a header label. The
 * copy button uses `navigator.clipboard` and silently does nothing on
 * insecure (non-HTTPS) contexts. Copy/Copied labels are translated via the
 * `codeBlock.*` keys (companion bond: `@molecule/app-locales-code-block`).
 *
 * @module
 */

export * from './CodeBlock.js'
