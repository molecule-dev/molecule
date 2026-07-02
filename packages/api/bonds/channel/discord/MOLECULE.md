# @molecule/api-channel-discord

Discord channel bond for molecule.dev.

Implements the {@link ChannelProvider} interface defined by
`@molecule/api-channel`, posting outbound messages via Discord's REST
API and verifying inbound interaction webhooks against the
application's ed25519 public key.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-channel'
import { provider } from '@molecule/api-channel-discord'

setProvider('discord', provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-channel-discord
```

## API

### Interfaces

#### `DiscordConfig`

Configuration for the Discord channel provider.

Discord uses two distinct credentials:

- {@link botToken} — used as the `Authorization: Bot <token>` header for
  REST calls (sending messages, fetching channels, etc.). Required to
  send messages.
- {@link publicKey} — the application's hex-encoded ed25519 public key,
  used to verify the signature on inbound interaction webhook requests.
  Required to verify webhooks.

Either credential may be omitted at construction time and supplied via
environment variables (`CHANNEL_DISCORD_BOT_TOKEN`,
`CHANNEL_DISCORD_PUBLIC_KEY`).

```typescript
interface DiscordConfig {
  /**
   * Bot token for the Discord application. Used as the `Bot <token>`
   * authentication header on REST calls. Defaults to the
   * `CHANNEL_DISCORD_BOT_TOKEN` environment variable.
   */
  botToken?: string

  /**
   * Application public key (hex-encoded ed25519) used to verify inbound
   * interaction webhook signatures. Defaults to the
   * `CHANNEL_DISCORD_PUBLIC_KEY` environment variable.
   */
  publicKey?: string

  /**
   * Optional override for the Discord REST API base URL. Defaults to
   * `https://discord.com/api/v10`. Primarily useful for testing.
   */
  apiBaseUrl?: string

  /**
   * Optional REST client. If provided, the bond delegates message sends to
   * it (e.g. an instance of `discord.js`'s `REST`). When omitted, the bond
   * falls back to a built-in `fetch` implementation. Primarily useful for
   * tests that need to mock the `discord.js` client without having a live
   * dependency.
   */
  rest?: DiscordRestLike

  /**
   * Optional request timeout for built-in REST calls in milliseconds.
   * Defaults to `10000`. Ignored when {@link rest} is supplied.
   */
  timeoutMs?: number
}
```

#### `DiscordRestLike`

Minimal REST-client shape the provider depends on. Compatible with the
`REST` class from `discord.js` (`new REST().setToken(token).post(...)`).

```typescript
interface DiscordRestLike {
  /**
   * Issues a POST request against the Discord REST API at the given route.
   *
   * @param route - REST route relative to the Discord API base (e.g.
   *   `'/channels/123/messages'`).
   * @param options - Request options including a JSON-serialisable body.
   * @returns The parsed JSON response.
   */
  post(route: string, options: { body: unknown }): Promise<unknown>
}
```

#### `ProcessEnv`

Environment variables consumed by the Discord channel provider.

```typescript
interface ProcessEnv {
  /** Bot token used for REST authentication. */
  CHANNEL_DISCORD_BOT_TOKEN: string
  /** Application public key (hex-encoded) used for webhook verification. */
  CHANNEL_DISCORD_PUBLIC_KEY: string
}
```

### Types

#### `DiscordInteractionType`

Discord interaction types relevant to inbound webhook parsing.

Mirrors the subset of Discord's `InteractionType` enum used by this
bond:

- `1` — `PING` (handshake; not converted to an InboundMessage).
- `2` — `APPLICATION_COMMAND` (slash command).
- `3` — `MESSAGE_COMPONENT` (button click, select-menu, etc.).

Any other types (modal submit, autocomplete, …) are passed through as
the original payload and treated as an empty inbound message.

```typescript
type DiscordInteractionType = 1 | 2 | 3 | number
```

### Classes

#### `DiscordChannelProvider`

Concrete Discord implementation of {@link ChannelProvider}.

### Functions

#### `createProvider(config)`

Convenience factory for {@link DiscordChannelProvider}.

```typescript
function createProvider(config?: DiscordConfig): DiscordChannelProvider
```

- `config` — Optional configuration.

**Returns:** A configured Discord channel provider.

### Constants

#### `provider`

Lazily-instantiated, default-configured Discord channel provider.

The proxy defers construction until first use so importing this module
has no side effects (e.g. consuming env vars at import time).

```typescript
const provider: ChannelProvider
```

## Core Interface
Implements `@molecule/api-channel` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-channel` ^1.0.0
- `discord.js` ^14.0.0

### Environment Variables

- `CHANNEL_DISCORD_BOT_TOKEN` *(required)* — Discord bot token
  - Setup: Create an application → Bot → Reset Token, then copy the bot token.
  - Get it here: [https://discord.com/developers/applications](https://discord.com/developers/applications)
- `CHANNEL_DISCORD_PUBLIC_KEY` *(required)* — Discord public key
  - Setup: Your application → General Information → Public Key (verifies interaction signatures).
  - Get it here: [https://discord.com/developers/applications](https://discord.com/developers/applications)
