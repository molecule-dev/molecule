/**
 * Embeddable AI chat widget — floating launcher + expanding chat panel
 * for embedding a brand-configured assistant into a page.
 *
 * Exports:
 * - `<EmbeddableChatWidget>` — root component (floating launcher + expanded panel).
 * - `<EmbeddableChatLauncher>` — standalone floating bubble (used internally).
 * - `<EmbeddableChatPanel>` — standalone expanded panel (used internally).
 * - `sendChatRequest()` — fetch + SSE helper, exported for advanced integrations.
 * - `readChatStream()` — low-level SSE / chunked-text reader.
 * - Types: `EmbeddableChatWidgetConfig`, `EmbeddableChatWidgetTheme`,
 *   `EmbeddableChatWidgetPosition`, `EmbeddableChatMessage`,
 *   `EmbeddableChatStreamEvent`.
 *
 * @example
 * ```tsx
 * import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
 *
 * <EmbeddableChatWidget
 *   config={{
 *     apiBaseUrl: 'https://api.example.com',
 *     brandName: 'Acme',
 *     position: 'bottom-right',
 *     theme: { primaryColor: '#7c3aed' },
 *   }}
 * />
 * ```
 *
 * @remarks
 * **Prerequisites (the widget throws without them).** The components call
 * `useTranslation()` and `getClassMap()`, so the render tree MUST have the
 * molecule `I18nProvider` above it and a ClassMap bond wired via
 * `setClassMap()` before first render. Inside a molecule-scaffolded app
 * both are already set up. On a NON-molecule host page you must perform
 * that wiring in your embed bundle before mounting — there is currently no
 * self-mounting standalone build; render through your own bundler (raw JSX
 * in a browser `script` tag will not parse), for example:
 *
 * ```tsx
 * import { createRoot } from 'react-dom/client'
 * import { createSimpleI18nProvider } from '@molecule/app-i18n'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
 *
 * setClassMap(classMap)
 * createRoot(document.getElementById('molecule-chat-widget')!).render(
 *   <I18nProvider provider={createSimpleI18nProvider()}>
 *     <EmbeddableChatWidget
 *       config={{ apiBaseUrl: 'https://api.example.com', brandName: 'Acme' }}
 *     />
 *   </I18nProvider>,
 * )
 * ```
 *
 * **Backend wire contract.** Every send POSTs
 * `${apiBaseUrl}/chat` with JSON body `{ "message": "<latest user text>" }`
 * and `Accept: text/event-stream`. No conversation id, history, or auth is
 * sent — the transcript lives only in widget state, so a stateless backend
 * answers each turn without context. Correlate sessions server-side
 * (cookies) or inject headers/ids with `config.fetchImpl`. Responses may be
 * SSE (`data: {"type":"content","delta":"…"}` … `data: [DONE]`),
 * OpenAI/Anthropic-shaped JSON lines with a `content`/`text` field, or
 * plain chunked text — all are appended as deltas.
 *
 * **Styling.** Panel/launcher geometry and colors are inlined (independent
 * of host CSS) and light-themed (white panel); `config.theme` customizes
 * only the primary accent + its foreground. Layout primitives still
 * resolve through the wired ClassMap.
 *
 * @module
 */

export * from './EmbeddableChatLauncher.js'
export * from './EmbeddableChatPanel.js'
export * from './EmbeddableChatWidget.js'
export * from './sendChatRequest.js'
export * from './stream.js'
export * from './types.js'
