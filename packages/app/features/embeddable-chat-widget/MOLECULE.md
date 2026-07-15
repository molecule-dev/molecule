# @molecule/app-embeddable-chat-widget

Embeddable AI chat widget — third-party-site drop-in launcher + panel.

Exports:
- `<EmbeddableChatWidget>` — root component (floating launcher + expanded panel).
- `<EmbeddableChatLauncher>` — standalone floating bubble (used internally).
- `<EmbeddableChatPanel>` — standalone expanded panel (used internally).
- `sendChatRequest()` — fetch + SSE helper, exported for advanced integrations.
- `readChatStream()` — low-level SSE / chunked-text reader.
- Types: `EmbeddableChatWidgetConfig`, `EmbeddableChatWidgetTheme`,
  `EmbeddableChatWidgetPosition`, `EmbeddableChatMessage`,
  `EmbeddableChatStreamEvent`.

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

## Type
`feature`

## Installation
```bash
npm install @molecule/app-embeddable-chat-widget @molecule/app-i18n @molecule/app-message-bubble-react @molecule/app-react @molecule/app-typing-indicator-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `EmbeddableChatMessage`

A single message stored in the widget's local state.

```typescript
interface EmbeddableChatMessage {
  /** Stable id (uuid-ish) used as the React key. */
  id: string
  /** Author role — drives alignment + accent. */
  role: 'user' | 'assistant'
  /** Plain text body. Streaming assistant messages append to this. */
  body: string
  /** Unix-ms timestamp the message started. */
  timestamp: number
}
```

#### `EmbeddableChatWidgetConfig`

Configuration object passed into `<EmbeddableChatWidget>`. The object is
intentionally flat so a host site can populate it from a single
`data-*` attribute on the embed div.

```typescript
interface EmbeddableChatWidgetConfig {
  /** Base URL of the chat backend (no trailing slash). `/chat` is appended. */
  apiBaseUrl: string
  /** Brand name shown in the header. Required. */
  brandName: string
  /** Optional brand logo (URL) shown in the header next to the brand name. */
  brandLogo?: string
  /** Floating-launcher position. Defaults to `bottom-right`. */
  position?: EmbeddableChatWidgetPosition
  /** Visual theme overrides. */
  theme?: EmbeddableChatWidgetTheme
  /** Optional fetch override (test injection / custom auth). Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch
}
```

#### `EmbeddableChatWidgetTheme`

Visual / branding configuration for the widget shell.

```typescript
interface EmbeddableChatWidgetTheme {
  /** Primary accent colour (header, send button, launcher background). */
  primaryColor?: string
  /** Foreground colour to use against `primaryColor`. */
  primaryForegroundColor?: string
}
```

### Types

#### `EmbeddableChatStreamEvent`

Streaming chat event the widget understands. The widget speaks SSE
(`data: {json}\n\n`) but is tolerant of plain chunked text — any
non-JSON payload is appended to the in-flight assistant message verbatim.

```typescript
type EmbeddableChatStreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
```

#### `EmbeddableChatWidgetPosition`

Position of the floating launcher relative to the host viewport.

```typescript
type EmbeddableChatWidgetPosition = 'bottom-right' | 'bottom-left'
```

### Functions

#### `EmbeddableChatLauncher(root0, root0, root0, root0, root0, root0)`

Floating circular launcher rendered in the corner of the host page.
Click expands the chat panel.

Uses inline-style positioning + sizing because the host page might
not load the molecule stylesheet — this component is intentionally
self-sufficient for color and geometry. ClassMap is still used for
layout primitives that don't conflict with host CSS.

```typescript
function EmbeddableChatLauncher({
  visible,
  onOpen,
  position,
  theme,
  className,
}: EmbeddableChatLauncherProps): JSX.Element | null
```

- `root0` — Component props.
- `root0` — .visible Whether to render.
- `root0` — .onOpen Open-panel callback.
- `root0` — .position Floating corner.
- `root0` — .theme Optional theme.
- `root0` — .className Extra classes.

#### `EmbeddableChatPanel(root0, root0, root0, root0, root0)`

Expanded chat panel — header + scrollable message list + composer.

State is local — each open conversation lives in `messages`. The widget
is intentionally storage-agnostic; integrations that want persistence
should wrap this with their own resume logic.

```typescript
function EmbeddableChatPanel({
  visible,
  onClose,
  position,
  config,
}: EmbeddableChatPanelProps): JSX.Element | null
```

- `root0` — Component props.
- `root0` — .visible Render gate.
- `root0` — .onClose Close-panel callback.
- `root0` — .position Floating corner.
- `root0` — .config Widget config.

#### `EmbeddableChatWidget(root0, root0, root0)`

Drop-in floating chat widget for third-party sites. Renders a
collapsed launcher in the configured corner; clicking expands a
360x540px panel with a message list, typing indicator, and input.

The widget is intentionally self-contained — all geometry, colors,
and shadows are inlined so the host site does not need to ship the
molecule stylesheet. Pair with `@molecule/app-locales-embeddable-chat-widget`
for translations.

```typescript
function EmbeddableChatWidget({
  config,
  defaultOpen = false,
}: EmbeddableChatWidgetProps): JSX.Element
```

- `root0` — Component props.
- `root0` — .config Widget configuration.
- `root0` — .defaultOpen Whether the panel starts expanded.

#### `readChatStream(body, onEvent)`

Reads a fetch Response body and yields normalized stream events. Tolerates
both SSE-formatted chunks (`data: {json}\n\n`) and plain text chunks (any
non-data line is forwarded as a `content` delta).

Stops cleanly on `done` events, AbortError, or stream end.

```typescript
function readChatStream(body: ReadableStream<Uint8Array<ArrayBufferLike>>, onEvent: (event: EmbeddableChatStreamEvent) => void): Promise<void>
```

- `body` — The `ReadableStream` returned by `fetch().body`.
- `onEvent` — Callback invoked once per parsed event.

#### `sendChatRequest(args)`

Sends a chat message and streams the response back. Throws on transport
errors or non-OK HTTP statuses; resolves cleanly on `done` / stream end.

```typescript
function sendChatRequest({
  message,
  config,
  onDelta,
  signal,
}: SendChatRequestArgs): Promise<void>
```

- `args` — Send args (`message`, `config`, `onDelta`, optional `signal`).

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

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-message-bubble-react`
- `@molecule/app-react`
- `@molecule/app-typing-indicator-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

The widget is designed to be embedded on third-party sites that don't
ship molecule's CSS. All geometry, colors, and shadows are inlined so
the launcher and panel render correctly regardless of the host
stylesheet. Layout primitives still resolve through `getClassMap()` so
a host that *does* ship molecule keeps consistent spacing.

Embed snippet for a host page that already has a React root:

```html
<div id="molecule-chat-widget"></div>
<script type="module">
  import { createRoot } from 'react-dom/client'
  import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'
  createRoot(document.getElementById('molecule-chat-widget'))
    .render(<EmbeddableChatWidget config={...} />)
</script>
```

## Translations

Translation strings are provided by `@molecule/app-locales-embeddable-chat-widget`.
