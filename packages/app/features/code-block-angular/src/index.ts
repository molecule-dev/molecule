/**
 * Angular code block display — the counterpart of
 * `@molecule/app-code-block-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * Exports `<CodeBlock>` — read-only code panel with optional filename +
 * language header, line numbers, and copy-to-clipboard button.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { CodeBlock } from '@molecule/app-code-block-angular'
 *
 * @Component({
 *   selector: 'app-demo',
 *   standalone: true,
 *   imports: [CodeBlock],
 *   template: `
 *     <div
 *       mol-code-block
 *       [code]="code"
 *       language="ts"
 *       filename="greet.ts"
 *       [showLineNumbers]="true"
 *     ></div>
 *   `,
 * })
 * export class Demo {
 *   readonly code = 'const greet = (name: string) => `Hello, ${name}!`'
 * }
 * ```
 *
 * @remarks
 * `code` is rendered as PLAIN TEXT — Angular interpolation escapes it, so do
 * not pass pre-highlighted HTML (it will display as literal tags). To
 * highlight, wrap or replace this component with one that renders your
 * highlighter's output; `language` is only a header label. The copy button
 * copies through `@molecule/app-clipboard` (`copyTextWithFallback` — the
 * bonded clipboard provider first, then a legacy copy fallback — which
 * resolves `false` instead of throwing), so it works on insecure (non-HTTPS)
 * contexts too; the copied feedback shows only when the copy succeeded.
 * Copy/Copied labels are translated via the `codeBlock.*` keys
 * (companion bond: `@molecule/app-locales-code-block`), read through the
 * binding's reactive `useTranslation()` so a locale switch re-renders them.
 *
 * @module
 */

export * from './code-block.component.js'
export * from './types.js'
