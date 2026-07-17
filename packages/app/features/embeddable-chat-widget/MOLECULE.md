# @molecule/app-embeddable-chat-widget

Embeddable AI chat widget — floating launcher + expanding chat panel
for embedding a brand-configured assistant into a page.

Exports:
- `<EmbeddableChatWidget>` — root component (floating launcher + expanded panel).
- `<EmbeddableChatLauncher>` — standalone floating bubble (used internally).
- `<EmbeddableChatPanel>` — standalone expanded panel (used internally).
- `mountEmbeddableChatWidget()` — imperative one-call mount into a host element.
- `sendChatRequest()` — fetch + SSE helper, exported for advanced integrations.
- `readChatStream()` — low-level SSE / chunked-text reader.
- `useSafeTranslation()` — provider-optional translation hook (used internally).
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
npm install @molecule/app-embeddable-chat-widget @molecule/app-i18n @molecule/app-react react react-dom
npm install -D @types/react @types/react-dom
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

#### `MountEmbeddableChatWidgetOptions`

Options for {@link mountEmbeddableChatWidget}.

```typescript
interface MountEmbeddableChatWidgetOptions {
  /** Start with the panel expanded instead of the collapsed launcher. */
  defaultOpen?: boolean
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

#### `WidgetTranslate`

Translation function shape used throughout the widget.

```typescript
type WidgetTranslate = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
) => string
```

### Functions

#### `EmbeddableChatLauncher(props)`

Floating circular launcher rendered in the corner of the host page.
Click expands the chat panel.

Fully self-contained: positioning, sizing, color, and flex centering are
all inline styles, so the launcher renders correctly even when the host
page has NOT loaded the molecule stylesheet / wired a ClassMap bond. Text
is resolved through a provider-optional translation hook that falls back
to English defaults when no `I18nProvider` is present.

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

#### `mountEmbeddableChatWidget(container, config, options)`

Mounts the embeddable chat widget into a host container. Works on a bare
page — no `I18nProvider`, `setClassMap()`, or molecule stylesheet required.

```typescript
function mountEmbeddableChatWidget(container: string | HTMLElement, config: EmbeddableChatWidgetConfig, options?: MountEmbeddableChatWidgetOptions): Root
```

- `container` — The target element, or a CSS selector resolving to one.
- `config` — Widget configuration (`apiBaseUrl`, `brandName`, …).
- `options` — Optional mount options (see {@link MountEmbeddableChatWidgetOptions}).

**Returns:** The React `Root`; call `.unmount()` to tear the widget down.

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

#### `useSafeTranslation()`

Returns a translation function that works with OR without a molecule
`I18nProvider` in context. See the module docs for the two paths.

```typescript
function useSafeTranslation(): { t: WidgetTranslate; }
```

**Returns:** An object with a provider-optional `t()` function.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `react`
- `react-dom`

**True drop-in — no provider wiring required.** The widget renders with
sensible English defaults and fully inlined styling when no molecule
`I18nProvider` or ClassMap bond is present, so it does NOT throw on a bare
third-party page. When it IS mounted inside a molecule app it
automatically picks up the host `I18nProvider` (via context) for
translations + locale changes; no ClassMap is needed either way because
all geometry/colour is inline. Mount it with the bundled helper — no
`I18nProvider`, no `setClassMap()`:

```ts
import { mountEmbeddableChatWidget } from '@molecule/app-embeddable-chat-widget'

mountEmbeddableChatWidget('#molecule-chat-widget', {
  apiBaseUrl: 'https://api.example.com',
  brandName: 'Acme',
})
```

(Raw JSX in a `<script>` tag still won't parse — build your embed with a
bundler, or ship a pre-built bundle that calls `mountEmbeddableChatWidget`.)

**Backend wire contract.** Every send POSTs `${apiBaseUrl}/chat` with
request header `Accept: text/event-stream`, `Content-Type:
application/json`, and JSON body `{ "message": "<latest user text>" }` —
ONLY the newest user turn. No conversation id, history, or auth is sent;
the transcript lives only in widget state, so a stateless backend answers
each turn without context. Correlate sessions server-side (cookies) or
inject headers/ids with `config.fetchImpl`. The response should stream the
assistant reply back; the reader accepts any of:
- SSE: `data: {"type":"content","delta":"…"}` lines, terminated by
  `data: {"type":"done"}` or `data: [DONE]`; `data:
  {"type":"error","message":"…"}` surfaces an error.
- JSON lines with a `content` or `text` field (OpenAI/Anthropic-shaped) —
  the field is appended as a delta.
- Plain chunked text — appended verbatim as deltas.
A non-2xx status (or a `data:` error event) is surfaced to the user as an
error message in the panel.

**Styling.** Panel/launcher geometry and colours are 100% inline
(independent of host CSS) and light-themed (white panel); `config.theme`
customises only the primary accent + its foreground. There is no ClassMap
dependency, so the widget looks identical on and off a molecule host.

## Translations

Translation strings are provided by `@molecule/app-locales-embeddable-chat-widget`.
