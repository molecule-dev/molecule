/**
 * Angular embed-snippet panel.
 *
 * Exports `<EmbedSnippet>` — a pre-formatted HTML / iframe / React snippet
 * inside a `<pre>` element with a copy-to-clipboard button and optional inline
 * controls (width / height / theme) bound to caller-provided state. Reusable
 * across any embeddable widget — 3d-model-viewer, chat-widget, charts,
 * status-page. It is the Angular counterpart of `@molecule/app-embed-snippet-react`:
 * the same exports, the same props (React names) and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { EmbedSnippet, type EmbedSnippetValues } from '@molecule/app-embed-snippet-angular'
 *
 * @Component({
 *   selector: 'embed-card',
 *   standalone: true,
 *   imports: [EmbedSnippet],
 *   template: `
 *     <section
 *       mol-embed-snippet
 *       [template]="template"
 *       [controls]="{ width: true, height: true, theme: true }"
 *       [values]="values"
 *       [onChange]="setValues"
 *       [language]="'iframe'"
 *     ></section>
 *   `,
 * })
 * export class EmbedCard {
 *   template =
 *     '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'
 *   values: EmbedSnippetValues = { width: 640, height: 480, theme: 'light' }
 *
 *   setValues = (next: EmbedSnippetValues): void => {
 *     this.values = next
 *   }
 * }
 * ```
 *
 * @remarks
 * Node props are the same as React's; `onChange` and `onCopy` are function
 * inputs (`[onChange]`, `[onCopy]`). All UI text resolves through the binding's
 * reactive `useTranslation()` with English fallbacks. Companion locale bond:
 * `@molecule/app-locales-embed-snippet`.
 *
 * Copy-to-clipboard routes through `copyTextWithFallback()` from
 * `@molecule/app-clipboard` — the bonded clipboard provider (on the web,
 * `@molecule/app-clipboard-web`), then a legacy copy-command fallback when no
 * provider is bonded — so it also works on insecure origins and inside
 * frames where the async Clipboard API is unavailable. The call resolves
 * `false` instead of throwing when nothing was copied; the "Copied!"
 * feedback and `onCopy` fire only on success.
 *
 * Substitution replaces only the `{{width}}`, `{{height}}` and `{{theme}}`
 * placeholders (numbers become `640px`, strings pass through); unknown
 * placeholders are untouched, so the template can mix in your own tokens.
 *
 * Styling routes through ClassMap tokens and requires a bonded ClassMap
 * (e.g. `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './embed-snippet.component.js'
export * from './substitute.js'
export * from './types.js'
