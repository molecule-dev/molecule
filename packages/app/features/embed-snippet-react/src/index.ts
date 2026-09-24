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
 * import { useState } from 'react'
 *
 * import { EmbedSnippet, type EmbedSnippetValues } from '@molecule/app-embed-snippet-react'
 *
 * export function ShareWidgetPanel() {
 *   const widgetUrl = 'https://widgets.example.com/chat/acme'
 *   const [values, setValues] = useState<EmbedSnippetValues>({ width: 400, height: 600, theme: 'light' })
 *   return (
 *     <EmbedSnippet
 *       template={`<iframe src="${widgetUrl}?theme={{theme}}" style="width:{{width}};height:{{height}};border:0"></iframe>`}
 *       controls={{ width: true, height: true, theme: true }}
 *       values={values}
 *       onChange={setValues}
 *       language="iframe"
 *       onCopy={(code) => console.info('embed code copied', code.length)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * It is CONTROLLED: the inputs only call `onChange` — without `values` +
 * `onChange` wired to your own state, typing in the controls changes nothing.
 * The width/height inputs emit STRINGS exactly as typed, so a user typing
 * `640` yields `640` (no `px`); only numbers you pass in yourself get `px`.
 *
 * It must render inside `<I18nProvider>` / `<MoleculeProvider>` (it calls
 * `useTranslation()`, which throws otherwise), and `getClassMap()` throws
 * unless `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * All UI text resolves through `useTranslation()` from `@molecule/app-react`
 * with English fallbacks. Companion locale bond:
 * `@molecule/app-locales-embed-snippet`.
 *
 * Copy-to-clipboard uses `navigator.clipboard`, which browsers only expose
 * in secure contexts (HTTPS or localhost). On insecure origins the Copy
 * button is a silent no-op — no error, no "Copied!" feedback. If your app
 * must support insecure origins, wire `onCopy` and surface your own
 * fallback (e.g. select-the-text instructions).
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
