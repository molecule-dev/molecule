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
 * export function InstallSnippet() {
 *   const code = ['npm install @molecule/app-code-block-react', 'npm run dev'].join('\n')
 *   return <CodeBlock code={code} language="bash" filename="terminal" showLineNumbers />
 * }
 * ```
 *
 * @remarks
 * - `code` is rendered as PLAIN TEXT — there is no syntax highlighting and no
 *   HTML parsing, so do not pass pre-highlighted HTML (it will display as
 *   literal tags). To highlight, wrap or replace this component with one that
 *   renders your highlighter's output; `language` is only a header label.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; the copy button is `Button`
 *   from `@molecule/app-ui-react` (a peer dependency).
 * - `showLineNumbers` and `showCopy` both default to `true` — pass `showCopy={false}` to hide
 *   the button. The copy button uses `navigator.clipboard` and does nothing where it is
 *   unavailable (non-HTTPS contexts); the label flips to "Copied!" for 1.5 s.
 * - Copy/Copied labels are translated via the `codeBlock.*` keys (companion bond:
 *   `@molecule/app-locales-code-block`).
 *
 * @module
 */

export * from './CodeBlock.js'
