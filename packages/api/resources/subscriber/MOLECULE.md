# @molecule/api-resource-subscriber

Subscriber resource for molecule.dev.

Tokenized email/sms/webhook subscriber records with confirm/unsubscribe links.
Designed for status-page-style "subscribe to incident updates" and newsletter
signup flows. A subscriber is created in `pending` status and confirmed via a
one-time token; opt-out is one-click via a separate unsubscribe token. Both
tokens are returned exactly once on creation and are never exposed via the
public listing/read endpoints.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-subscriber'

for (const route of routes) {
  app[route.method](route.path, requestHandlerMap[route.handler])
}
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-subscriber
```

## API

### Interfaces

#### `CreateSubscriberInput`

Input for creating a subscriber.

```typescript
interface CreateSubscriberInput {
  /** Delivery channel. */
  channel: SubscriberChannel
  /** Channel-specific address. */
  address: string
  /** Optional grouping topic. */
  topic?: string | null
  /** Arbitrary subscriber metadata. */
  metadata?: Record<string, unknown> | null
}
```

#### `CreateSubscriberResult`

Result of creating a subscriber. Includes the one-time confirm token so the
caller can build the confirmation link before the token disappears.

```typescript
interface CreateSubscriberResult {
  /** The created subscriber. */
  subscriber: PublicSubscriber
  /** One-time token to confirm the subscription. Returned only on creation. */
  confirmToken: string
  /** Token to unsubscribe. Returned only on creation. */
  unsubscribeToken: string
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The page of results. */
  data: T[]
  /** Total number of matching records. */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}
```

#### `Subscriber`

A subscriber record.

```typescript
interface Subscriber {
  /** Unique subscriber identifier. */
  id: string
  /** Delivery channel (email, sms, or webhook). */
  channel: SubscriberChannel
  /** Channel-specific address: email address, E.164 phone number, or webhook URL. */
  address: string
  /**
   * Optional grouping topic — e.g. `"incident-updates"`, `"weekly-newsletter"`,
   * or `"service:api"`. The same address may subscribe to multiple topics
   * (each as its own record).
   */
  topic: string | null
  /** Lifecycle status. */
  status: SubscriberStatus
  /** Arbitrary subscriber metadata (locale, source page, etc.). */
  metadata: Record<string, unknown> | null
  /** Timestamp the subscription was confirmed (null while pending). */
  confirmedAt: string | null
  /** Timestamp the subscriber unsubscribed (null while still subscribed). */
  unsubscribedAt: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `SubscriberQuery`

Query options for listing subscribers.

```typescript
interface SubscriberQuery {
  /** Filter by channel. */
  channel?: SubscriberChannel
  /** Filter by status. */
  status?: SubscriberStatus
  /** Filter by topic. */
  topic?: string
  /** Page number (1-based). */
  page?: number
  /** Items per page. */
  limit?: number
}
```

#### `SubscriberRow`

Internal database row for a subscriber. Includes private token fields.

```typescript
interface SubscriberRow {
  /** Unique subscriber identifier. */
  id: string
  /** Delivery channel. */
  channel: string
  /** Channel-specific address. */
  address: string
  /** Optional grouping topic. */
  topic: string | null
  /** Lifecycle status. */
  status: string
  /** Confirm token (private — never returned via the public listing endpoint). */
  confirmToken: string
  /** Unsubscribe token (private). */
  unsubscribeToken: string
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Timestamp the subscription was confirmed. */
  confirmedAt: string | null
  /** Timestamp the subscriber unsubscribed. */
  unsubscribedAt: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

### Types

#### `PublicSubscriber`

Public-safe view of a subscriber. Tokens are intentionally omitted — they
are returned exactly once on creation and otherwise never leave the database.

```typescript
type PublicSubscriber = Subscriber
```

#### `SubscriberChannel`

Delivery channels supported for subscribers.

```typescript
type SubscriberChannel = 'email' | 'sms' | 'webhook'
```

#### `SubscriberStatus`

Lifecycle status of a subscriber.

- `pending` — created but not yet confirmed via the confirm token.
- `confirmed` — confirmed and eligible to receive deliveries.
- `unsubscribed` — opted out via the unsubscribe token; preserved for audit
  so the same address cannot silently re-subscribe and re-trigger sends.

```typescript
type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed'
```

### Functions

#### `confirm(req, res)`

Confirms a subscriber by token.

```typescript
function confirm(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `:token` path parameter.
- `res` — Response. On success returns the confirmed subscriber (no token).

#### `del(req, res)`

Hard-deletes a subscriber by id.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `:id` path parameter.
- `res` — Response. Returns 204 on success or 404 if no row matched.

#### `generateToken(byteLength)`

Generates a cryptographically random URL-safe token suitable for a one-time
confirm or unsubscribe link.

```typescript
function generateToken(byteLength?: number): string
```

- `byteLength` — Number of random bytes (default 32 → 43 base64url chars).

**Returns:** A URL-safe random token.

#### `isSubscriberChannel(value)`

Type guard for {@link SubscriberChannel}.

```typescript
function isSubscriberChannel(value: unknown): boolean
```

- `value` — Value to test.

**Returns:** True if the value is a valid channel.

#### `isSubscriberStatus(value)`

Type guard for {@link SubscriberStatus}.

```typescript
function isSubscriberStatus(value: unknown): boolean
```

- `value` — Value to test.

**Returns:** True if the value is a valid status.

#### `isValidAddress(channel, address)`

Validates a channel-specific address (email, E.164 phone, or HTTP(S) URL).

```typescript
function isValidAddress(channel: SubscriberChannel, address: string): boolean
```

- `channel` — The delivery channel.
- `address` — The address to validate.

**Returns:** True if the address is structurally valid for the channel.

#### `list(req, res)`

Lists subscribers with optional filtering and pagination.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with optional `channel`, `status`, `topic`, `page`, and `limit` query params.
- `res` — Response. On success returns a {@link PaginatedResult} of {@link PublicSubscriber}.

#### `parseMetadata(raw)`

Parses a JSON-serialized metadata column.

```typescript
function parseMetadata(raw: string | Record<string, unknown> | null): Record<string, unknown> | null
```

- `raw` — Raw column value (string, object, or null).

**Returns:** Parsed metadata object, or null on missing/invalid input.

#### `read(req, res)`

Reads a single subscriber by id.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `:id` path parameter.
- `res` — Response.

#### `subscribe(req, res)`

Creates a new pending subscriber. Re-issuing a subscription against an
existing `(channel, address, topic)` triple is rejected with 409 — callers
should resend the confirmation link out-of-band rather than mint a new one.

```typescript
function subscribe(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request whose body matches {@link CreateSubscriberInput}.
- `res` — Response. On success returns 201 with `{ subscriber, confirmToken, unsubscribeToken }`.

#### `toPublicSubscriber(row)`

Converts a database row into the public-safe {@link PublicSubscriber} view.
Strips the private confirm/unsubscribe tokens.

```typescript
function toPublicSubscriber(row: SubscriberRow): Subscriber
```

- `row` — Raw database row.

**Returns:** Public subscriber view (no tokens).

#### `unsubscribe(req, res)`

Unsubscribes a subscriber by token.

```typescript
function unsubscribe(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `:token` path parameter.
- `res` — Response. On success returns the unsubscribed subscriber.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for subscriber resource routes.

```typescript
const requestHandlerMap: { readonly subscribe: typeof subscribe; readonly confirm: typeof confirm; readonly unsubscribe: typeof unsubscribe; readonly list: typeof list; readonly read: typeof read; readonly del: typeof del; }
```

#### `routes`

Routes for the subscriber resource. Public endpoints (`subscribe`, `confirm`,
`unsubscribe`) intentionally have no `authenticate` middleware so anonymous
visitors of a status page or newsletter form can use them. Listing and admin
deletion are gated behind `authenticate`.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/subscribers"; readonly handler: "subscribe"; }, { readonly method: "get"; readonly path: "/subscribers/confirm/:token"; readonly handler: "confirm"; }, { readonly method: "post"; readonly path: "/subscribers/unsubscribe/:token"; readonly handler: "unsubscribe"; }, { readonly method: "get"; readonly path: "/subscribers"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/subscribers/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/subscribers/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `SUBSCRIBER_CHANNELS`

All valid subscriber channels.

```typescript
const SUBSCRIBER_CHANNELS: readonly SubscriberChannel[]
```

#### `SUBSCRIBER_STATUSES`

All valid subscriber statuses.

```typescript
const SUBSCRIBER_STATUSES: readonly SubscriberStatus[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
