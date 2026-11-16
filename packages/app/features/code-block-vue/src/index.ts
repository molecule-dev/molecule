/**
 * Vue code block display — the counterpart of `@molecule/app-code-block-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * Exports `<CodeBlock>` — read-only code panel with optional filename +
 * language header, line numbers, and copy-to-clipboard button.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { CodeBlock } from '@molecule/app-code-block-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(CodeBlock, {
 *         code: 'const greet = (name: string) => `Hello, ${name}!`',
 *         language: 'ts',
 *         filename: 'greet.ts',
 *         showLineNumbers: true,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
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

export * from './CodeBlock.js'
export * from './types.js'
