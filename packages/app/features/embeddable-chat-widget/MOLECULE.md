# @molecule/app-embeddable-chat-widget

Embeddable AI chat widget — floating launcher + expanding chat panel
for embedding a brand-configured assistant into a page.

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

#### `EmbeddableChatLauncherProps`

```typescript
interface EmbeddableChatLauncherProps {
  /** Whether the launcher should render. Hidden while the panel is expanded. */
  visible: boolean
  /** Click handler — flips the widget into expanded state. */
  onOpen: () => void
  /** Floating position (`bottom-right` | `bottom-left`). */
  position: EmbeddableChatWidgetPosition
  /** Optional theme. */
  theme?: EmbeddableChatWidgetTheme
  /** Extra classes. */
  className?: string
}
```

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

#### `EmbeddableChatPanelProps`

```typescript
interface EmbeddableChatPanelProps {
  /** Whether the panel is expanded (visible) or collapsed (hidden). */
  visible: boolean
  /** Close handler — collapses back to launcher. */
  onClose: () => void
  /** Floating corner. */
  position: EmbeddableChatWidgetPosition
  /** Resolved widget config. */
  config: EmbeddableChatWidgetConfig
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

#### `EmbeddableChatWidgetProps`

```typescript
interface EmbeddableChatWidgetProps {
  /** Widget configuration. */
  config: EmbeddableChatWidgetConfig
  /** Optional initial expanded state (default: collapsed). */
  defaultOpen?: boolean
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

#### `PanelMessageProps`

```typescript
interface PanelMessageProps {
  message: EmbeddableChatMessage
  theme: EmbeddableChatWidgetConfig['theme']
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

#### `EmbeddableChatLauncher(props)`

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

- `props` — Component props (see {@link EmbeddableChatLauncherProps}).

#### `EmbeddableChatPanel(props)`

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

- `props` — Component props (see {@link EmbeddableChatPanelProps}).

#### `EmbeddableChatWidget(props)`

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

- `props` — Component props (see {@link EmbeddableChatWidgetProps}).

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

**Prerequisites (the widget throws without them).** The components call
`useTranslation()` and `getClassMap()`, so the render tree MUST have the
molecule `I18nProvider` above it and a ClassMap bond wired via
`setClassMap()` before first render. Inside a molecule-scaffolded app
both are already set up. On a NON-molecule host page you must perform
that wiring in your embed bundle before mounting — there is currently no
self-mounting standalone build; render through your own bundler (raw JSX
in a browser `script` tag will not parse), for example:

```tsx
import { createRoot } from 'react-dom/client'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { EmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'

setClassMap(classMap)
createRoot(document.getElementById('molecule-chat-widget')!).render(
  <I18nProvider provider={createSimpleI18nProvider()}>
    <EmbeddableChatWidget
      config={{ apiBaseUrl: 'https://api.example.com', brandName: 'Acme' }}
    />
  </I18nProvider>,
)
```

**Backend wire contract.** Every send POSTs
`${apiBaseUrl}/chat` with JSON body `{ "message": "<latest user text>" }`
and `Accept: text/event-stream`. No conversation id, history, or auth is
sent — the transcript lives only in widget state, so a stateless backend
answers each turn without context. Correlate sessions server-side
(cookies) or inject headers/ids with `config.fetchImpl`. Responses may be
SSE (`data: {"type":"content","delta":"…"}` … `data: [DONE]`),
OpenAI/Anthropic-shaped JSON lines with a `content`/`text` field, or
plain chunked text — all are appended as deltas.

**Styling.** Panel/launcher geometry and colors are inlined (independent
of host CSS) and light-themed (white panel); `config.theme` customizes
only the primary accent + its foreground. Layout primitives still
resolve through the wired ClassMap.

## Translations

Translation strings are provided by `@molecule/app-locales-embeddable-chat-widget`.
