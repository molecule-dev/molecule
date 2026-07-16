# @molecule/api-channel-whatsapp

WhatsApp channel provider for molecule.dev.

Implements the framework-agnostic {@link ChannelProvider} interface
over the WhatsApp Cloud API
(`https://graph.facebook.com/v22.0/<phone-id>/messages`). Bond under
the named-multi-provider `'channel'` category at app startup:

## Quick Start

```typescript
import { setProvider } from '@molecule/api-channel'
import { provider } from '@molecule/api-channel-whatsapp'

setProvider('whatsapp', provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-channel-whatsapp @molecule/api-channel @molecule/api-secrets
```

## API

### Interfaces

#### `ProcessEnv`

Environment variables consumed by the WhatsApp channel provider.

```typescript
interface ProcessEnv {
  /** Cloud API access token. */
  CHANNEL_WHATSAPP_ACCESS_TOKEN: string

  /** Numeric phone-number id of the WhatsApp business sender. */
  CHANNEL_WHATSAPP_PHONE_NUMBER_ID: string

  /** Meta App secret used to verify `X-Hub-Signature-256`. */
  CHANNEL_WHATSAPP_APP_SECRET: string
}
```

#### `WhatsAppButtonReply`

Subset of the inbound `button` reply object (template button click).

```typescript
interface WhatsAppButtonReply {
  /** Opaque payload originally set on the template button. */
  payload?: string

  /** Visible label of the button that was clicked. */
  text?: string
}
```

#### `WhatsAppConfig`

Configuration for the WhatsApp channel provider.

The access token is the credential that authorizes Cloud API calls —
it is deliberately accepted only via this config (or the
`CHANNEL_WHATSAPP_ACCESS_TOKEN` env var) and is NEVER included in
error messages, log lines, or normalized payloads.

```typescript
interface WhatsAppConfig {
  /**
   * WhatsApp Cloud API access token (typically a long-lived `EAA…`
   * system-user token). Defaults to the
   * `CHANNEL_WHATSAPP_ACCESS_TOKEN` env var.
   *
   * Treat as a secret — providers redact this value in any user-facing
   * output.
   */
  accessToken?: string

  /**
   * The numeric phone-number id assigned to the business in the Meta
   * developer dashboard (NOT the E.164 phone number). Used to build the
   * Cloud API endpoint. Defaults to the
   * `CHANNEL_WHATSAPP_PHONE_NUMBER_ID` env var.
   */
  phoneNumberId?: string

  /**
   * Meta App secret used to verify inbound `X-Hub-Signature-256`
   * webhook signatures. Defaults to the `CHANNEL_WHATSAPP_APP_SECRET`
   * env var.
   *
   * If unset, {@link WhatsAppChannelProvider.verifyWebhookSignature}
   * returns `false`.
   */
  appSecret?: string

  /**
   * Cloud API base URL. Override only for tests / staging endpoints.
   * Defaults to `https://graph.facebook.com`.
   */
  apiBaseUrl?: string

  /**
   * Cloud API version segment (e.g. `'v22.0'`). Defaults to `'v22.0'`.
   */
  apiVersion?: string

  /**
   * Per-request timeout in milliseconds. Defaults to 10000.
   */
  timeoutMs?: number
}
```

#### `WhatsAppContact`

Subset of the WhatsApp inbound `contact` object surfaced via
{@link InboundMessage.payload}.

```typescript
interface WhatsAppContact {
  /** Display name set by the user. */
  profile?: { name?: string }

  /** Sender's WhatsApp id (typically the E.164 phone number). */
  wa_id: string
}
```

#### `WhatsAppInboundMessage`

Subset of the inbound `messages[]` entry. Only fields the provider
actually inspects are typed; others are passed through opaquely on
{@link InboundMessage.payload}.

```typescript
interface WhatsAppInboundMessage {
  /** WhatsApp message id (`wamid.…`). */
  id: string

  /** Sender's WhatsApp id (E.164 phone number). */
  from: string

  /** Unix timestamp (seconds, as a string) reported by WhatsApp. */
  timestamp?: string

  /**
   * Discriminator: `'text'`, `'image'`, `'audio'`, `'video'`,
   * `'document'`, `'sticker'`, `'location'`, `'button'`,
   * `'interactive'`, `'reaction'`, `'contacts'`, `'unsupported'`, …
   */
  type?: string

  /** Text body for `type === 'text'`. */
  text?: { body?: string }

  /** Inline media payloads. */
  image?: WhatsAppMediaRef
  audio?: WhatsAppMediaRef
  video?: WhatsAppMediaRef
  document?: WhatsAppMediaRef
  sticker?: WhatsAppMediaRef

  /** Geo payload for `type === 'location'`. */
  location?: WhatsAppLocation

  /** Template-button click for `type === 'button'`. */
  button?: WhatsAppButtonReply

  /** Interactive-button / list-reply for `type === 'interactive'`. */
  interactive?: WhatsAppInteractiveReply

  /** Reply context — present when this message replies to another. */
  context?: { id?: string; from?: string }
}
```

#### `WhatsAppInteractiveReply`

Subset of the inbound `interactive` reply object (button-list /
list-reply click on an interactive message).

```typescript
interface WhatsAppInteractiveReply {
  /**
   * Whether this was a `'button_reply'` or `'list_reply'`.
   */
  type?: string

  button_reply?: { id?: string; title?: string }

  list_reply?: { id?: string; title?: string; description?: string }
}
```

#### `WhatsAppLocation`

Subset of the WhatsApp inbound `location` object.

```typescript
interface WhatsAppLocation {
  /** Geographic latitude in decimal degrees. */
  latitude: number

  /** Geographic longitude in decimal degrees. */
  longitude: number

  /** Optional human-readable place name. */
  name?: string

  /** Optional human-readable street address. */
  address?: string
}
```

#### `WhatsAppMediaRef`

Subset of the WhatsApp inbound media descriptor, shared by
`image` / `audio` / `video` / `document` / `sticker` envelopes.

```typescript
interface WhatsAppMediaRef {
  /** Cloud API media id (download via `/v22.0/<id>`). */
  id?: string

  /** Reported MIME type. */
  mime_type?: string

  /** Original filename (documents only). */
  filename?: string

  /** Optional caption (image / video / document). */
  caption?: string
}
```

#### `WhatsAppOutboundExtensions`

Optional WhatsApp-specific extensions carried via
`OutboundMessage.payload`. Not part of the core
{@link OutboundMessage} contract — providers SHOULD ignore unknown
fields.

```typescript
interface WhatsAppOutboundExtensions {
  /**
   * When set, the message is sent as a WhatsApp template instead of a
   * free-form text / interactive message.
   */
  template?: WhatsAppTemplateRef
}
```

#### `WhatsAppSendResponse`

Subset of the WhatsApp Cloud API outbound `messages` response that
the provider inspects to build a {@link SendResult}.

```typescript
interface WhatsAppSendResponse {
  /** Echoed phone-number id of the sending business. */
  messaging_product?: string

  /**
   * Per-recipient envelope. Cloud API always returns at least one
   * entry on success.
   */
  messages?: Array<{
    /** WhatsApp message id (e.g. `'wamid.HBgL…'`). */
    id: string
  }>

  /**
   * Cloud API error object on failure responses. Surfaced into the
   * thrown error message after token redaction.
   */
  error?: {
    message?: string
    type?: string
    code?: number
  }
}
```

#### `WhatsAppTemplateRef`

Identifies a WhatsApp template message to send. Templates are the
only message form allowed outside the 24-hour customer-service
window. The template (and its variables) must be pre-approved in the
Meta WhatsApp Manager.

```typescript
interface WhatsAppTemplateRef {
  /** Approved template name (e.g. `'order_confirmation'`). */
  name: string

  /** Template language code (e.g. `'en_US'`, `'es'`). */
  language: string

  /**
   * Optional positional body parameters substituted into the template
   * `{{1}}`, `{{2}}` placeholders. WhatsApp expects strings.
   */
  bodyParameters?: string[]
}
```

#### `WhatsAppWebhookPayload`

Top-level shape of an inbound WhatsApp Cloud API webhook payload.

```typescript
interface WhatsAppWebhookPayload {
  /** Always `'whatsapp_business_account'` for Cloud API events. */
  object?: string

  /** Top-level entries (one per WABA). */
  entry?: Array<{
    /** WhatsApp Business Account id. */
    id?: string
    /** Per-product changes (`'messages'`, `'message_template_status_update'`, …). */
    changes?: Array<{
      field?: string
      value?: WhatsAppWebhookValue
    }>
  }>
}
```

#### `WhatsAppWebhookValue`

Subset of the `entry[].changes[].value` payload in a Cloud API
webhook event.

```typescript
interface WhatsAppWebhookValue {
  /** Always `'whatsapp'` for Cloud API events. */
  messaging_product?: string

  /** Sender / receiver metadata (display phone, phone-number id). */
  metadata?: { phone_number_id?: string; display_phone_number?: string }

  /** Inbound contacts that triggered this event. */
  contacts?: WhatsAppContact[]

  /** Inbound messages that triggered this event. */
  messages?: WhatsAppInboundMessage[]
}
```

### Classes

#### `WhatsAppChannelProvider`

WhatsApp channel provider — implements the framework-agnostic
{@link ChannelProvider} contract on top of the WhatsApp Cloud API.

### Functions

#### `createProvider(config)`

Convenience factory for the named-multi-provider bond pattern.

```typescript
function createProvider(config?: WhatsAppConfig): WhatsAppChannelProvider
```

- `config` — Optional WhatsApp config.

**Returns:** A new {@link WhatsAppChannelProvider} instance.

### Constants

#### `channelWhatsappSecretDefinitions`

Secret definitions required by the WhatsApp channel bond.

```typescript
const channelWhatsappSecretDefinitions: SecretDefinition[]
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

- `CHANNEL_WHATSAPP_ACCESS_TOKEN` *(required)* — WhatsApp access token
  - Setup: Create a Meta app with the WhatsApp product and generate a permanent access token (System User).
  - Get it here: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
- `CHANNEL_WHATSAPP_PHONE_NUMBER_ID` *(required)* — WhatsApp phone number ID
  - Setup: WhatsApp → API Setup → Phone number ID (not the phone number itself).
  - Get it here: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
- `CHANNEL_WHATSAPP_APP_SECRET` *(required)* — Meta app secret (WhatsApp)
  - Setup: Your Meta app → App settings → Basic → App secret (verifies webhook signatures).
  - Get it here: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)

### Runtime Dependencies

- `@molecule/api-channel`
- `@molecule/api-secrets`

Outbound messages outside the WhatsApp 24-hour customer-service window
MUST be sent as approved templates. The provider exposes
`OutboundMessage.kind = 'rich'` two ways: via interactive button
objects (in-window) or via WhatsApp templates (out-of-window) when
`payload.template` is supplied.

**Webhook subscription needs a GET echo the bond does not provide.** When
registering the webhook URL in the Meta console, Meta sends
`GET ?hub.mode=subscribe&hub.verify_token=<your token>&hub.challenge=<n>`;
your route must validate the verify token and respond `200` with the raw
`hub.challenge`. Only POST deliveries flow through
`verifyWebhookSignature()` / `parseInbound()`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each channel-notifying flow the app defines (a Slack/Discord alert on
  a new order, a status-change message) actually produces a message. The
  sandbox CAPTURES channel messages instead of sending — read them with the
  `read_activity` tool (filter type 'channel'); never mock the flow or
  modify production code to expose the message.
- [ ] The captured message targets the configured channel/provider name and
  carries the app's real content (readable text, no `undefined`
  placeholders, no secrets).
- [ ] A failed send (unbonded or misconfigured provider) is visible in
  logs/UI — never silently swallowed.
