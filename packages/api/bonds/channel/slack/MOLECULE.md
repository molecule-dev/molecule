# @molecule/api-channel-slack

Slack channel bond for molecule.dev.

Implements the {@link ChannelProvider} interface from
`@molecule/api-channel` on top of `@slack/web-api`. Used by apps that
post into Slack channels (notifications, AI bot replies, helpdesk
announcements) and consume inbound Slack events (message events,
`app_mention`, slash commands) via signed webhooks.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-channel'
import { createProvider } from '@molecule/api-channel-slack'

setProvider(
  'slack',
  createProvider({
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  }),
)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-channel-slack @molecule/api-channel @molecule/api-secrets @slack/web-api
```

## API

### Interfaces

#### `ProcessEnv`

Environment variables consumed by the Slack channel provider.

```typescript
interface ProcessEnv {
  /**
   * Bot user OAuth token (xoxb-…). Required for outbound `sendMessage`.
   */
  SLACK_BOT_TOKEN: string

  /**
   * Slack app signing secret. Required for `verifyWebhookSignature`.
   */
  SLACK_SIGNING_SECRET: string
}
```

#### `SlackBlock`

Minimal shape of a Slack Block Kit block as used by this provider.
Slack's full block schema is large; we only constrain the fields we
emit (`section` and `actions`) and treat the rest as opaque pass-through.

```typescript
interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: Array<{
    type: string
    text?: { type: string; text: string }
    value?: string
    action_id?: string
  }>
}
```

#### `SlackChannelConfig`

Configuration for the Slack channel provider.

Tokens default to environment variables when not supplied so deployment
pipelines that already inject `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`
keep working without extra wiring.

```typescript
interface SlackChannelConfig {
  /**
   * Bot user OAuth token used for `chat.postMessage` and other Web API
   * calls. Defaults to `process.env.SLACK_BOT_TOKEN`.
   */
  botToken?: string

  /**
   * Slack app signing secret used to verify the HMAC of inbound webhook
   * requests. Defaults to `process.env.SLACK_SIGNING_SECRET`.
   */
  signingSecret?: string

  /**
   * Maximum allowed clock skew (in seconds) between the request timestamp
   * and the verifier when validating `x-slack-signature`. Defaults to 300
   * seconds (5 minutes), matching Slack's documented replay window.
   */
  signatureToleranceSeconds?: number

  /**
   * Optional pre-built `WebClient`-shaped object. Tests inject a minimal
   * mock here; production code should leave this unset and let the
   * provider construct its own client from {@link botToken}.
   */
  webClient?: SlackWebClientLike
}
```

#### `SlackChatPostMessageArgs`

Subset of `chat.postMessage` arguments consumed by this provider.

```typescript
interface SlackChatPostMessageArgs {
  channel: string
  text?: string
  blocks?: SlackBlock[]
  thread_ts?: string
  attachments?: SlackOutboundAttachment[]
}
```

#### `SlackChatPostMessageResponse`

Subset of `chat.postMessage` response fields consumed by this provider.

```typescript
interface SlackChatPostMessageResponse {
  ok: boolean
  ts?: string
  channel?: string
  error?: string
}
```

#### `SlackOutboundAttachment`

Slack-flavoured outbound attachment (legacy attachments API). Used as a
pass-through for callers that already speak Slack's attachment shape.

```typescript
interface SlackOutboundAttachment {
  fallback?: string
  text?: string
  title?: string
  title_link?: string
  image_url?: string
  thumb_url?: string
  color?: string
}
```

#### `SlackWebClientLike`

The narrow surface of `@slack/web-api`'s `WebClient` that this provider
actually uses. Defining it explicitly keeps tests free of the full SDK
type tree and documents the integration contract.

```typescript
interface SlackWebClientLike {
  chat: {
    postMessage(args: SlackChatPostMessageArgs): Promise<SlackChatPostMessageResponse>
  }
}
```

### Functions

#### `createProvider(config)`

Creates a Slack-backed {@link ChannelProvider}.

Tokens are sourced from the supplied {@link SlackChannelConfig} or, as
a fallback, the documented environment variables. Methods that require
a particular secret throw a generic error if the secret is missing —
the missing token name is surfaced, but never its value.

```typescript
function createProvider(config?: SlackChannelConfig): ChannelProvider
```

- `config` — Provider configuration. All fields are optional; env vars cover the production wiring path.

**Returns:** A `ChannelProvider` ready to be bonded under name `'slack'`.

### Constants

#### `channelSlackSecretDefinitions`

Secret definitions required by the Slack channel bond.

```typescript
const channelSlackSecretDefinitions: SecretDefinition[]
```

#### `provider`

Default Slack channel provider — pre-bound to env vars at import time.

Convenience export for apps that want to `bond('channel', 'slack',
provider)` without explicit configuration. Configuration via env vars
still applies.

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

- `SLACK_BOT_TOKEN` *(required)* — Slack bot token
  - Setup: Create a Slack app, add bot scopes under OAuth & Permissions, install to your workspace, and copy the Bot User OAuth Token.
  - Get it here: [https://api.slack.com/apps](https://api.slack.com/apps)
  - Example: `xoxb-...`
- `SLACK_SIGNING_SECRET` *(required)* — Slack signing secret
  - Setup: Your Slack app → Basic Information → App Credentials → Signing Secret.
  - Get it here: [https://api.slack.com/apps](https://api.slack.com/apps)

### Runtime Dependencies

- `@molecule/api-channel`
- `@molecule/api-secrets`
- `@slack/web-api`

Tokens are deliberately scrubbed from any error this provider raises;
upstream stack traces that contain a token are still possible if a
higher layer re-throws without going through this bond.

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
