/**
 * Svelte embed-snippet panel.
 *
 * Exports `<EmbedSnippet>` — a pre-formatted HTML / iframe / React snippet
 * inside a `<pre>` element with a copy-to-clipboard button and optional inline
 * controls (width / height / theme) bound to caller-provided state. Reusable
 * across any embeddable widget — 3d-model-viewer, chat-widget, charts,
 * status-page. It is the Svelte counterpart of `@molecule/app-embed-snippet-react`:
 * the same exports, the same props (React names) and the same DOM for the same
 * input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { EmbedSnippet, type EmbedSnippetValues } from '@molecule/app-embed-snippet-svelte'
 *
 *   let values = $state<EmbedSnippetValues>({ width: 640, height: 480, theme: 'light' })
 * </script>
 *
 * <EmbedSnippet
 *   template={'<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'}
 *   controls={{ width: true, height: true, theme: true }}
 *   {values}
 *   onChange={(next) => (values = next)}
 *   language="iframe"
 * />
 * ```
 *
 * @remarks
 * All UI text resolves through `useTranslation()` from `@molecule/app-svelte`
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
 * placeholders (numbers become `640px`, strings pass through); unknown
 * placeholders are untouched, so the template can mix in your own tokens.
 *
 * Styling routes through ClassMap tokens and requires a bonded ClassMap
 * (e.g. `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './components.js'
export * from './substitute.js'
export * from './types.js'
