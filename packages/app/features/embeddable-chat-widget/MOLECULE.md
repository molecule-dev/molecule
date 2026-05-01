# @molecule/app-embeddable-chat-widget

Embeddable AI chat widget — third-party-site drop-in launcher + expanded panel with streaming responses.

Exports:
- `<EmbeddableChatWidget>` — root component (floating launcher + expanded panel).
- `<EmbeddableChatLauncher>` — standalone floating bubble (used internally).
- `<EmbeddableChatPanel>` — standalone expanded panel (used internally).
- `sendChatRequest()` — fetch + SSE helper, exported for advanced integrations.
- `readChatStream()` — low-level SSE / chunked-text reader.
- Types: `EmbeddableChatWidgetConfig`, `EmbeddableChatWidgetTheme`, `EmbeddableChatWidgetPosition`, `EmbeddableChatMessage`, `EmbeddableChatStreamEvent`.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-embeddable-chat-widget
```

## Quick Start

```tsx
import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'

<EmbeddableChatWidget
  config={{
    apiBaseUrl: 'https://api.example.com',
    brandName: 'Acme',
    position: 'bottom-right',
    theme: { primaryColor: '#7c3aed' },
  }}
/>
```

## Embed Snippet (host page)

```html
<div id="molecule-chat-widget"></div>
<script type="module">
  import { createRoot } from 'react-dom/client'
  import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
  createRoot(document.getElementById('molecule-chat-widget'))
    .render(<EmbeddableChatWidget config={{ apiBaseUrl: '...', brandName: '...' }} />)
</script>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-message-bubble-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-typing-indicator-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Self-contained styling

The widget is designed to be embedded on third-party sites that don't ship molecule's CSS. All geometry, colors, and shadows are inlined so the launcher and panel render correctly regardless of the host stylesheet. Layout primitives still resolve through `getClassMap()` so a host that *does* ship molecule keeps consistent spacing.

### Translations

Use the companion locale bond `@molecule/app-locales-embeddable-chat-widget` for translations in 79 languages.

### Backend contract

The widget POSTs `{ "message": "..." }` to `${apiBaseUrl}/chat` with `Accept: text/event-stream`. The backend must respond with either:

1. **SSE-formatted** chunks of the form:
   ```
   data: {"type":"content","delta":"hello"}\n\n
   data: {"type":"done"}\n\n
   ```
2. **Plain chunked text** — any line that doesn't start with `data:` is appended verbatim as a content delta.

OpenAI- and Anthropic-shaped JSON payloads (`{ content: "..." }` / `{ text: "..." }`) are also recognized and forwarded as content deltas.
