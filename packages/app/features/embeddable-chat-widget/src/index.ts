/**
 * Embeddable AI chat widget — floating launcher + expanding chat panel
 * for embedding a brand-configured assistant into a page.
 *
 * Exports:
 * - `<EmbeddableChatWidget>` — root component (floating launcher + expanded panel).
 * - `<EmbeddableChatLauncher>` — standalone floating bubble (used internally).
 * - `<EmbeddableChatPanel>` — standalone expanded panel (used internally).
 * - `mountEmbeddableChatWidget()` — imperative one-call mount into a host element.
 * - `sendChatRequest()` — fetch + SSE helper, exported for advanced integrations.
 * - `readChatStream()` — low-level SSE / chunked-text reader.
 * - `useSafeTranslation()` — provider-optional translation hook (used internally).
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
 * **True drop-in — no provider wiring required.** The widget renders with
 * sensible English defaults and fully inlined styling when no molecule
 * `I18nProvider` or ClassMap bond is present, so it does NOT throw on a bare
 * third-party page. When it IS mounted inside a molecule app it
 * automatically picks up the host `I18nProvider` (via context) for
 * translations + locale changes; no ClassMap is needed either way because
 * all geometry/colour is inline. Mount it with the bundled helper — no
 * `I18nProvider`, no `setClassMap()`:
 *
 * ```ts
 * import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
 *
 * mountEmbeddableChatWidget('#molecule-chat-widget', {
 *   apiBaseUrl: 'https://api.example.com',
 *   brandName: 'Acme',
 * })
 * ```
 *
 * (Raw JSX in a `<script>` tag still won't parse — build your embed with a
 * bundler, or ship a pre-built bundle that calls `mountEmbeddableChatWidget`.)
 *
 * **Backend wire contract.** Every send POSTs `${apiBaseUrl}/chat` with
 * request header `Accept: text/event-stream`, `Content-Type:
 * application/json`, and JSON body `{ "message": "<latest user text>" }` —
 * ONLY the newest user turn. No conversation id, history, or auth is sent;
 * the transcript lives only in widget state, so a stateless backend answers
 * each turn without context. Correlate sessions server-side (cookies) or
 * inject headers/ids with `config.fetchImpl`. The response should stream the
 * assistant reply back; the reader accepts any of:
 * - SSE: `data: {"type":"content","delta":"…"}` lines, terminated by
 *   `data: {"type":"done"}` or `data: [DONE]`; `data:
 *   {"type":"error","message":"…"}` surfaces an error.
 * - JSON lines with a `content` or `text` field (OpenAI/Anthropic-shaped) —
 *   the field is appended as a delta.
 * - Plain chunked text — appended verbatim as deltas.
 * A non-2xx status (or a `data:` error event) is surfaced to the user as an
 * error message in the panel.
 *
 * **Styling.** Panel/launcher geometry and colours are 100% inline
 * (independent of host CSS) and light-themed (white panel); `config.theme`
 * customises only the primary accent + its foreground. There is no ClassMap
 * dependency, so the widget looks identical on and off a molecule host.
 *
 * @module
 */

export * from './EmbeddableChatLauncher.js'
export * from './EmbeddableChatPanel.js'
export * from './EmbeddableChatWidget.js'
export * from './mount.js'
export * from './sendChatRequest.js'
export * from './stream.js'
export * from './types.js'
export * from './useSafeTranslation.js'
