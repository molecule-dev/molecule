# @molecule/api-channel-messenger

Facebook Messenger channel provider for molecule.dev.

Implements the framework-agnostic {@link ChannelProvider} interface
over the Messenger Send API and webhook envelope. Bond under the
named-multi-provider `'channel'` category at app startup:

## Quick Start

```typescript
import { setProvider } from '@molecule/api-channel'
import { provider } from '@molecule/api-channel-messenger'

setProvider('messenger', provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-channel-messenger
```

## API

### Interfaces

#### `MessengerActor`

Subset of the Messenger `Sender`/`Recipient` shape used during inbound
normalization.

```typescript
interface MessengerActor {
  /** Page-scoped user identifier. */
  id: string
}
```

#### `MessengerConfig`

Configuration for the Messenger channel provider.

The page access token authorizes Send API calls; the app secret signs
inbound webhooks via `X-Hub-Signature-256`. Both are deliberately
accepted only via this config (or the `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN`
/ `CHANNEL_MESSENGER_APP_SECRET` env vars) and are NEVER included in
error messages, log lines, or normalized payloads.

```typescript
interface MessengerConfig {
  /**
   * Page access token (`EAA…`). Required for outbound `sendMessage`.
   * Defaults to the `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN` env var.
   *
   * Treat as a secret — providers redact this value in any user-facing
   * output.
   */
  pageAccessToken?: string

  /**
   * Facebook app secret used to verify `X-Hub-Signature-256` on inbound
   * webhook requests. Defaults to the `CHANNEL_MESSENGER_APP_SECRET` env
   * var.
   *
   * If unset, {@link MessengerChannelProvider.verifyWebhookSignature}
   * returns `false`.
   */
  appSecret?: string

  /**
   * Graph API base URL. Override only for tests or alternative regional
   * endpoints. Defaults to `https://graph.facebook.com`.
   */
  apiBaseUrl?: string

  /**
   * Graph API version to target. Defaults to `'v22.0'`.
   */
  apiVersion?: string

  /**
   * Per-request timeout in milliseconds. Defaults to 10000.
   */
  timeoutMs?: number

  /**
   * Optional default `messaging_type` applied to outbound sends. Defaults
   * to `'RESPONSE'` (replies to user-initiated conversations within the
   * 24-hour window). Override to `'UPDATE'` or `'MESSAGE_TAG'` when
   * sending unsolicited messages — note the Messenger Platform policy
   * restrictions.
   */
  defaultMessagingType?: MessengerMessagingType
}
```

#### `MessengerInboundAttachment`

Subset of an inbound Messenger `attachment` object.

```typescript
interface MessengerInboundAttachment {
  /** Attachment kind (`'image'`, `'video'`, `'audio'`, `'file'`, …). */
  type?: string
  /** Optional payload object — typically `{ url }`. */
  payload?: { url?: string; sticker_id?: number }
}
```

#### `MessengerInboundDelivery`

Subset of an inbound Messenger `delivery` object.

```typescript
interface MessengerInboundDelivery {
  /** Mids of the messages confirmed delivered. */
  mids?: string[]
  /** Watermark — all messages sent before this timestamp are delivered. */
  watermark?: number
}
```

#### `MessengerInboundMessage`

Subset of an inbound Messenger `message` object.

```typescript
interface MessengerInboundMessage {
  /** Provider-assigned message identifier (mid). */
  mid?: string
  /** Plain-text body. */
  text?: string
  /** Quick-reply payload, when the user clicked a quick reply. */
  quick_reply?: { payload?: string }
  /** Attachments (images, files, …) included with the message. */
  attachments?: MessengerInboundAttachment[]
  /** Whether the message was an echo of one this app sent. */
  is_echo?: boolean
}
```

#### `MessengerInboundPostback`

Subset of an inbound Messenger `postback` object — the payload returned
when a user taps a button on a `button_template` or persistent menu.

```typescript
interface MessengerInboundPostback {
  /** Opaque payload originally set on the button. */
  payload?: string
  /** Visible title shown on the button when it was tapped. */
  title?: string
}
```

#### `MessengerInboundRead`

Subset of an inbound Messenger `read` object.

```typescript
interface MessengerInboundRead {
  /** Watermark — all messages sent before this timestamp are read. */
  watermark?: number
}
```

#### `MessengerMessagingEntry`

A single `messaging` entry inside an inbound webhook envelope.

```typescript
interface MessengerMessagingEntry {
  /** Sender of the inbound event. */
  sender?: MessengerActor
  /** Recipient (typically the page receiving the event). */
  recipient?: MessengerActor
  /** Unix timestamp in milliseconds. */
  timestamp?: number
  /** Inbound user message. */
  message?: MessengerInboundMessage
  /** Inbound button-tap postback. */
  postback?: MessengerInboundPostback
  /** Delivery confirmation. */
  delivery?: MessengerInboundDelivery
  /** Read receipt. */
  read?: MessengerInboundRead
}
```

#### `MessengerSendApiResponse`

Successful Send API response shape used by the provider.

```typescript
interface MessengerSendApiResponse {
  /** Page-scoped recipient identifier (echoed). */
  recipient_id?: string
  /** Messenger-assigned outbound message id. */
  message_id?: string
}
```

#### `MessengerWebhookEntry`

A single `entry` inside an inbound webhook envelope.

```typescript
interface MessengerWebhookEntry {
  /** Page identifier the events belong to. */
  id?: string
  /** Unix timestamp in milliseconds. */
  time?: number
  /** Per-conversation events. Typically a single-element array. */
  messaging?: MessengerMessagingEntry[]
}
```

#### `MessengerWebhookPayload`

Top-level Messenger webhook envelope.

```typescript
interface MessengerWebhookPayload {
  /** Always `'page'` for Messenger Platform webhooks. */
  object?: string
  /** Per-page event groups. */
  entry?: MessengerWebhookEntry[]
}
```

#### `ProcessEnv`

Environment variables consumed by the Messenger channel provider.

```typescript
interface ProcessEnv {
  /** Page access token (`EAA…`). Required for outbound sends. */
  CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN: string

  /** Facebook app secret used to verify inbound webhook signatures. */
  CHANNEL_MESSENGER_APP_SECRET: string
}
```

### Types

#### `MessengerMessagingType`

Messenger `messaging_type` values accepted on the Send API.

```typescript
type MessengerMessagingType = 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG'
```

### Classes

#### `MessengerChannelProvider`

Concrete Messenger Platform implementation of {@link ChannelProvider}.

### Functions

#### `createProvider(config)`

Convenience factory for the named-multi-provider bond pattern.

```typescript
function createProvider(config?: MessengerConfig): MessengerChannelProvider
```

- `config` — Optional Messenger config.

**Returns:** A new {@link MessengerChannelProvider} instance.

### Constants

#### `channelMessengerSecretDefinitions`

Secret definitions required by the Messenger channel bond.

```typescript
const channelMessengerSecretDefinitions: SecretDefinition[]
```

#### `provider`

Lazily-instantiated singleton instance for app-startup wiring. Reads
configuration from environment variables on first use.

```typescript
const provider: ChannelProvider
```

## Core Interface
Implements `@molecule/api-channel` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-channel` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN` *(required)* — Messenger page access token
  - Setup: Create a Meta app with the Messenger product and generate a Page access token for your page.
  - Get it here: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
- `CHANNEL_MESSENGER_APP_SECRET` *(required)* — Meta app secret
  - Setup: Your Meta app → App settings → Basic → App secret.
  - Get it here: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
