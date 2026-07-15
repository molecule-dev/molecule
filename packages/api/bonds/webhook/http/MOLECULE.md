# @molecule/api-webhook-http

HTTP webhook provider for molecule.dev.

Implements the `@molecule/api-webhook` interface using direct HTTP POST
delivery with HMAC signature verification and automatic retries.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-webhook'
import { createProvider } from '@molecule/api-webhook-http'

// Bond at startup
setProvider(createProvider())

// Or with custom configuration
setProvider(createProvider({
  timeout: 10_000,
  retryCount: 5,
  retryDelay: 2000,
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-webhook-http @molecule/api-logger @molecule/api-webhook undici
```

## API

### Interfaces

#### `HttpWebhookConfig`

Configuration for the HTTP webhook provider.

```typescript
interface HttpWebhookConfig {
  /** HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number

  /** Default number of automatic retries on delivery failure. Defaults to 3. */
  retryCount?: number

  /** Delay between retry attempts in milliseconds. Defaults to 1000. */
  retryDelay?: number

  /** HTTP header name used to send the HMAC payload signature. Defaults to `'x-webhook-signature'`. */
  signatureHeader?: string
}
```

### Functions

#### `createProvider(config)`

Creates an HTTP-backed {@link WebhookProvider}.

Webhook registrations and delivery logs are stored in memory.
For persistent storage, use `@molecule/api-webhook-queue` instead.

```typescript
function createProvider(config?: HttpWebhookConfig): WebhookProvider
```

- `config` — HTTP webhook provider configuration.

**Returns:** A fully initialised `WebhookProvider` backed by direct HTTP delivery.

#### `isPrivateAddress(ip)`

True if `ip` (a literal IPv4/IPv6 string) is private/internal/metadata.

```typescript
function isPrivateAddress(ip: string): boolean
```

#### `isPrivateIPv4(ip)`

True for an IPv4 address in any private/loopback/link-local/CGNAT/reserved range.

```typescript
function isPrivateIPv4(ip: string): boolean
```

#### `isPrivateIPv6(ip)`

True for an IPv6 loopback/unspecified/unique-local/link-local (or mapped-private v4).

```typescript
function isPrivateIPv6(ip: string): boolean
```

#### `safeFetch(rawUrl, init)`

SSRF-safe replacement for `fetch` when the URL is (or derives from) untrusted input.
Only http(s) is allowed; the connection is pinned away from private/internal/metadata
addresses (both IP-literal hosts — checked synchronously since they skip DNS — and
hostnames — validated inside the connect lookup). Redirects are not auto-followed so
a 3xx cannot rebind to an internal host.

```typescript
function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response>
```

- `rawUrl` — The (untrusted) URL to fetch.
- `init` — Standard fetch init.

**Returns:** The fetch Response.

## Core Interface
Implements `@molecule/api-webhook` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-webhook` 1.0.0

### Runtime Dependencies

- `@molecule/api-logger`
- `@molecule/api-webhook`
- `undici`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Registering a webhook endpoint through the app's UI/API succeeds, and
  an event the app dispatches actually produces a delivery. The sandbox
  CAPTURES outbound deliveries instead of POSTing — read them with the
  `read_activity` tool (filter type 'webhook'); never mock the dispatch or
  modify production code to expose the payload.
- [ ] The captured delivery carries the signature header (derived from the
  registration's secret) and an event payload free of secrets/unrelated PII.
- [ ] A registration targeting a private/link-local/metadata destination
  (`localhost`, `10.…`, `169.254.169.254`) is REJECTED before any dispatch.
