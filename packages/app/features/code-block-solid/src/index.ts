/**
 * Solid code block display — the counterpart of `@molecule/app-code-block-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * Exports `<CodeBlock>` — read-only code panel with optional filename +
 * language header, line numbers, and copy-to-clipboard button.
 *
 * @example
 * ```tsx
 * import { CodeBlock } from '@molecule/app-code-block-solid'
 *
 * const code = 'const greet = (name: string) => `Hello, ${name}!`'
 *
 * export function Demo() {
 *   return (
 *     <CodeBlock code={code} language="ts" filename="greet.ts" showLineNumbers />
 *   )
 * }
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
 * `codeBlock.*` keys (companion bond: `@molecule/app-locales-code-block`),
 * read through the binding's `useTranslation()` so a locale switch
 * re-renders them.
 *
 * @module
 */

export * from './CodeBlock.jsx'
export * from './types.js'
