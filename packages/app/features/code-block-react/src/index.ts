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
 * copy button copies through `@molecule/app-clipboard`
 * (`copyTextWithFallback` — the bonded clipboard provider first, then a
 * legacy copy fallback — which resolves `false` instead of throwing), so it
 * works on insecure (non-HTTPS) contexts too; the copied feedback shows only
 * when the copy succeeded. Copy/Copied labels are translated via the
 * `codeBlock.*` keys (companion bond: `@molecule/app-locales-code-block`).
 *
 * @module
 */

export * from './CodeBlock.js'
