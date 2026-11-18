/**
 * `@molecule/app-embed-snippet-react` — `<EmbedSnippet>` component.
 *
 * Renders a pre-formatted HTML / iframe / React snippet inside a `<pre>`
 * element with a copy-to-clipboard button and optional inline controls
 * (width / height / theme) bound to caller-provided state. Reusable across
 * any embeddable widget — 3d-model-viewer, chat-widget, charts, status-page.
 *
 * @example
 * ```tsx
 * import { EmbedSnippet } from '@molecule/app-embed-snippet-react'
 *
 * <EmbedSnippet
 *   template={'<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'}
 *   controls={{ width: true, height: true, theme: true }}
 *   values={values}
 *   onChange={setValues}
 *   language="iframe"
 * />
 * ```
 *
 * @remarks
 * All UI text resolves through `useTranslation()` from `@molecule/app-react`
 * with English fallbacks. Companion locale bond:
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
 * placeholders (numbers become `<n>px`); unknown placeholders pass through
 * untouched, so the template can mix in your own tokens.
 *
 * @module
 */

export * from './EmbedSnippet.js'
export * from './substitute.js'
export * from './types.js'
