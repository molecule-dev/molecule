/**
 * Embeddable AI chat widget — third-party-site drop-in launcher + panel.
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
 * The widget is designed to be embedded on third-party sites that don't
 * ship molecule's CSS. All geometry, colors, and shadows are inlined so
 * the launcher and panel render correctly regardless of the host
 * stylesheet. Layout primitives still resolve through `getClassMap()` so
 * a host that *does* ship molecule keeps consistent spacing.
 *
 * Embed snippet for a host page that already has a React root:
 *
 * ```html
 * <div id="molecule-chat-widget"></div>
 * <script type="module">
 *   import { createRoot } from 'react-dom/client'
 *   import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
 *   createRoot(document.getElementById('molecule-chat-widget'))
 *     .render(<EmbeddableChatWidget config={...} />)
 * </script>
 * ```
 *
 * @module
 */

export * from './EmbeddableChatLauncher.js'
export * from './EmbeddableChatPanel.js'
export * from './EmbeddableChatWidget.js'
export * from './sendChatRequest.js'
export * from './stream.js'
export * from './types.js'
