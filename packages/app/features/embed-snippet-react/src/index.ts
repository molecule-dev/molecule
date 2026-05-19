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
 * @module
 */

export * from './types.js'
export * from './substitute.js'
export * from './EmbedSnippet.js'
