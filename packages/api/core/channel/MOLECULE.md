# @molecule/api-channel

Provider-agnostic outbound messaging channel interface for molecule.dev.

Defines the {@link ChannelProvider} interface shared by every channel
bond (Slack, Discord, WhatsApp, Telegram, Facebook Messenger, …) and
normalized message types (`OutboundMessage`, `SendResult`,
`InboundMessage`, `ChannelFeatures`).

Channels are a **named-multi-provider** bond category: an app typically
has more than one outbound channel wired up at once, so providers are
registered under distinct names (`'slack'`, `'discord'`, …) using the
named overload of `bond()`. A singleton fallback is supported for apps
that only use one channel.

## Quick Start

```typescript
import { setProvider, requireProviderByName } from '@molecule/api-channel'
import { provider as slack } from '@molecule/api-channel-slack'
import { provider as discord } from '@molecule/api-channel-discord'

// App startup: bond every channel the app uses.
setProvider('slack', slack)
setProvider('discord', discord)

// Anywhere: pick the channel by name.
const ch = requireProviderByName('slack')
await ch.sendMessage('C123', { kind: 'text', text: 'hello' })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-channel
```

## API

### Interfaces

#### `ChannelAttachment`

A single attachment to be sent or received.

Providers MAY ignore unsupported attachment kinds; consumers SHOULD use
{@link ChannelFeatures} to gate which kinds are sent in the first place.

```typescript
interface ChannelAttachment {
  /**
   * Human-readable filename. Used as a fallback display label.
   */
  filename?: string

  /**
   * IETF media type (e.g. `'image/png'`, `'application/pdf'`).
   */
  contentType?: string

  /**
   * Public URL to the asset. Mutually exclusive with {@link data}.
   */
  url?: string

  /**
   * Raw bytes (e.g. PDF rendered server-side). Mutually exclusive with
   * {@link url}.
   */
  data?: Uint8Array

  /**
   * Optional caption / alt text rendered alongside the attachment.
   */
  caption?: string
}
```

#### `ChannelButton`

A single interactive button on a rich message.

```typescript
interface ChannelButton {
  /**
   * Visible label rendered on the button.
   */
  label: string

  /**
   * Opaque value sent back in the inbound payload when the user clicks.
   */
  value: string
}
```

#### `ChannelFeatures`

Capability flags describing which features a given channel provider
supports. Consumers should consult these before constructing an
{@link OutboundMessage} that depends on optional capabilities.

```typescript
interface ChannelFeatures {
  /**
   * Provider supports plain text messages.
   */
  text: boolean

  /**
   * Provider supports rich messages with interactive buttons.
   */
  buttons: boolean

  /**
   * Provider supports media attachments.
   */
  attachments: boolean

  /**
   * Provider supports threaded replies (via
   * {@link OutboundMessage.thread_id}).
   */
  threads: boolean

  /**
   * Provider verifies inbound webhook signatures. If `false`, callers
   * should NOT trust {@link ChannelProvider.verifyWebhookSignature} as
   * sufficient authentication.
   */
  signedWebhooks: boolean
}
```

#### `ChannelProvider`

Outbound messaging channel provider interface.

All channel providers (Slack, Discord, WhatsApp, Telegram, Messenger,
fixtures, etc.) implement this interface. Multiple providers coexist in
the same process by being bonded under distinct names — see
{@link setProvider} in the provider module.

```typescript
interface ChannelProvider {
  /**
   * Stable channel name (e.g. `'slack'`). Conventionally matches the bond
   * name the provider is registered under.
   */
  readonly name: ChannelName

  /**
   * Sends an outbound message to {@link to}.
   *
   * @param to - Provider-specific recipient identifier.
   * @param message - Normalized {@link OutboundMessage}.
   * @returns Result describing the delivered message.
   */
  sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult>

  /**
   * Verifies the signature on an inbound webhook request, given the raw
   * request headers and body bytes. Returns `true` when the signature is
   * valid for this provider's signing scheme.
   *
   * Providers that do not sign webhooks MUST return `false` and MUST set
   * {@link ChannelFeatures.signedWebhooks} to `false`.
   *
   * @param headers - Lowercased request header map.
   * @param body - Raw, unparsed request body.
   * @returns `true` if the signature is valid.
   */
  verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean

  /**
   * Parses a raw inbound webhook payload into a normalized
   * {@link InboundMessage}. Implementations SHOULD throw if the payload
   * is malformed; callers MUST verify the signature first via
   * {@link verifyWebhookSignature}.
   *
   * @param payload - The provider-shaped inbound webhook body.
   * @returns Normalized inbound message.
   */
  parseInbound(payload: unknown): InboundMessage

  /**
   * Returns the capability matrix for this provider.
   *
   * @returns Static {@link ChannelFeatures} describing what the provider
   *   supports.
   */
  listSupportedFeatures(): ChannelFeatures
}
```

#### `InboundMessage`

A single inbound message received via webhook. Providers normalize their
raw payload shape into this canonical form; the original payload is
preserved on {@link payload} for forensic inspection.

```typescript
interface InboundMessage {
  /**
   * Provider-specific sender identifier (user id, phone number, etc.).
   */
  from: ChannelRecipient

  /**
   * Channel name the message was received on (e.g. `'slack'`).
   */
  channel: ChannelName

  /**
   * Plain-text content of the inbound message, if any.
   */
  text?: string

  /**
   * Inbound attachments, normalized into the same shape as outbound
   * attachments.
   */
  attachments?: ChannelAttachment[]

  /**
   * Original provider payload (untouched). Useful for provider-specific
   * fields the normalized shape doesn't capture (e.g. button click values,
   * reactions, edit/delete events).
   */
  payload?: unknown

  /**
   * Optional thread / conversation identifier the message belongs to.
   */
  thread_id?: string

  /**
   * Timestamp the provider reports the message as received.
   */
  receivedAt: Date
}
```

#### `OutboundMessage`

A normalized outbound message ready to be sent through any channel
provider. Providers SHOULD render whichever fields they support and
silently ignore the rest (subject to {@link ChannelFeatures}).

```typescript
interface OutboundMessage {
  /**
   * The flavour of message being sent.
   */
  kind: OutboundMessageKind

  /**
   * Plain-text body. Required for `'text'` and `'rich'` kinds; optional
   * caption for `'media'` kinds.
   */
  text?: string

  /**
   * Optional attachments (images, files, audio, video). Required for
   * `'media'` kind.
   */
  attachments?: ChannelAttachment[]

  /**
   * Optional interactive buttons. Only meaningful for `'rich'` kind.
   */
  buttons?: ChannelButton[]

  /**
   * Optional thread / conversation identifier so the message is posted as
   * a reply rather than a top-level message. Format is provider-specific.
   */
  thread_id?: string
}
```

#### `SendResult`

Result of a successful {@link ChannelProvider.sendMessage} call.

```typescript
interface SendResult {
  /**
   * Provider-assigned identifier for the delivered message. Use this to
   * correlate inbound webhook events back to the originating send.
   */
  messageId: string

  /**
   * Timestamp the provider reports the message as delivered (or accepted
   * for delivery, if the provider does not surface an explicit delivery
   * timestamp).
   */
  deliveredAt: Date
}
```

### Types

#### `ChannelName`

Stable identifier for a channel kind (e.g. `'slack'`, `'discord'`,
`'whatsapp'`, `'telegram'`, `'messenger'`).

Kept as a plain `string` alias rather than a literal union so additional
channels can be added without touching this core package.

```typescript
type ChannelName = string
```

#### `ChannelRecipient`

Provider-specific recipient identifier (channel id, user id, room id,
phone number, page id, etc.). Providers SHOULD document their accepted
formats; consumers MUST treat this opaquely.

```typescript
type ChannelRecipient = string
```

#### `OutboundMessageKind`

The supported flavours of {@link OutboundMessage}.

- `'text'` — plain text message body.
- `'rich'` — text plus structured elements (buttons, etc.) supported by
  the channel.
- `'media'` — primarily an attachment (image, document, audio, video).

```typescript
type OutboundMessageKind = 'text' | 'rich' | 'media'
```

### Functions

#### `getAllProviders()`

Retrieves all named channel providers as a Map keyed by channel name.

```typescript
function getAllProviders(): Map<string, ChannelProvider>
```

**Returns:** Map of channel name → ChannelProvider.

#### `getProvider()`

Retrieves the singleton channel provider, or `null` if none is bonded.

```typescript
function getProvider(): ChannelProvider | null
```

**Returns:** The bonded singleton channel provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named channel provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): ChannelProvider | null
```

- `name` — The channel name (e.g. `'slack'`, `'discord'`).

**Returns:** The named channel provider, or `null`.

#### `hasProvider(name)`

Checks whether a channel provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional channel name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded singleton channel provider, throwing if none is
bonded. Use this when channel functionality is required.

```typescript
function requireProvider(): ChannelProvider
```

**Returns:** The bonded singleton channel provider.

#### `requireProviderByName(name)`

Retrieves a named channel provider, throwing if none is bonded under
that name. Use this when a specific channel is required.

```typescript
function requireProviderByName(name: string): ChannelProvider
```

- `name` — The channel name (e.g. `'slack'`, `'discord'`).

**Returns:** The named channel provider.

#### `setProvider(provider)`

Registers a channel provider in singleton mode.

- **Singleton**: `setProvider(provider)` — bonds a single default
  channel for apps that only use one.

```typescript
function setProvider(provider: ChannelProvider): void
```

- `provider` — The default channel provider for this process.

## Available Providers

| Provider | Package |
|----------|---------|
| Capture | `@molecule/api-channel-capture` |
| Discord | `@molecule/api-channel-discord` |
| Facebook Messenger | `@molecule/api-channel-messenger` |
| Slack | `@molecule/api-channel-slack` |
| Telegram | `@molecule/api-channel-telegram` |
| WhatsApp | `@molecule/api-channel-whatsapp` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
