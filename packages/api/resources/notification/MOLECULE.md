# @molecule/api-resource-notification

Notification resource for molecule.dev.

Provides Express route handlers for in-app notification management
including listing, read status, deletion, and preference management.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-notification'

// Routes are registered automatically by mlcl inject
// Manual usage:
for (const route of routes) {
  app[route.method](route.path, requestHandlerMap[route.handler])
}
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-notification @molecule/api-notification-center
```

## API

### Interfaces

#### `AuthenticatedUser`

Express request with authenticated user context.

```typescript
interface AuthenticatedUser {
  /** The authenticated user's identifier. */
  id: string
}
```

#### `CreateNotification`

Data required to create a new notification.

```typescript
interface CreateNotification {
    /** Notification category. */
    type: string;
    /** Notification headline. */
    title: string;
    /** Notification body text. */
    body: string;
    /** Arbitrary structured data to attach. */
    data?: Record<string, unknown>;
    /** Delivery channels for this notification. Defaults to `['inApp']`. */
    channels?: ('inApp' | 'email' | 'push' | 'sms')[];
}
```

#### `Notification`

An in-app notification.

```typescript
interface Notification {
    /** Provider-assigned notification identifier. */
    id: string;
    /** The user this notification belongs to. */
    userId: string;
    /** Notification category (e.g. 'system', 'message', 'alert'). */
    type: string;
    /** Notification headline. */
    title: string;
    /** Notification body text. */
    body: string;
    /** Whether the notification has been read. */
    read: boolean;
    /** Arbitrary structured data attached to the notification. */
    data?: Record<string, unknown>;
    /** When the notification was created. */
    createdAt: Date;
}
```

#### `NotificationPreferences`

User notification preferences.

```typescript
interface NotificationPreferences {
    /** Whether email notifications are enabled. */
    email: boolean;
    /** Whether push notifications are enabled. */
    push: boolean;
    /** Whether SMS notifications are enabled. */
    sms: boolean;
    /** Per-channel or per-type overrides. */
    channels: Record<string, boolean>;
}
```

#### `NotificationQuery`

Query options for listing notifications.

```typescript
interface NotificationQuery {
    /** Maximum number of results to return. */
    limit?: number;
    /** Number of results to skip. */
    offset?: number;
    /** Filter by read status. */
    read?: boolean;
    /** Filter by notification type. */
    type?: string;
}
```

#### `PaginatedResult`

Paginated result set.

```typescript
interface PaginatedResult<T> {
    /** The result items for this page. */
    items: T[];
    /** Total number of matching items. */
    total: number;
    /** Number of items skipped. */
    offset: number;
    /** Maximum items per page. */
    limit: number;
}
```

### Functions

#### `del(req, res)`

Handles DELETE /notifications/:id requests.

Requires an authenticated session and only deletes the requester's own
notification — a notification belonging to another user (or a non-existent
id) yields a 404, never deleting someone else's row (IDOR).

```typescript
function del(req: Request<{ id: string; }, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with notification id param.
- `res` — Express response.

#### `getPreferencesHandler(req, res)`

Handles GET /notifications/preferences requests.

```typescript
function getPreferencesHandler(_req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with authenticated user.
- `res` — Express response.

#### `getSessionUserId(res)`

Read the authenticated user's id off `res.locals.session` — the molecule JWT
session convention (the same value `getUserId(res)` from the default Express
bonds returns). Returns null when unauthenticated.

The resource reads the session directly rather than importing the framework's
`getUserId`, because `@molecule/api-bonds-default-express` depends on resources
(incl. this one's siblings), so importing it here would invert the dependency
direction. The handlers previously read `req.user.id`, which NOTHING populates
in a molecule app — so every user-scoped notification endpoint 500'd at runtime
("Cannot read properties of undefined (reading 'id')").

```typescript
function getSessionUserId(res: Response<any, Record<string, any>>): string | null
```

- `res` — The Express response carrying `res.locals.session`.

**Returns:** The authenticated user's id, or null if there is no session.

#### `list(req, res)`

Handles GET /notifications requests.

```typescript
function list(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with optional query params: limit, offset, read, type.
- `res` — Express response.

#### `markAllReadHandler(req, res)`

Handles POST /notifications/read-all requests.

```typescript
function markAllReadHandler(_req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with authenticated user.
- `res` — Express response.

#### `markReadHandler(req, res)`

Handles POST /notifications/:id/read requests.

Requires an authenticated session and only affects the requester's own
notification — a notification belonging to another user (or a non-existent
id) yields a 404, never silently mutating someone else's row (IDOR).

```typescript
function markReadHandler(req: Request<{ id: string; }, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with notification id param.
- `res` — Express response.

#### `unreadCount(req, res)`

Handles GET /notifications/unread-count requests.

```typescript
function unreadCount(_req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with authenticated user.
- `res` — Express response.

#### `updatePreferencesHandler(req, res)`

Handles PUT /notifications/preferences requests.

```typescript
function updatePreferencesHandler(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with preferences in body.
- `res` — Express response.

### Constants

#### `requestHandlerMap`

Handler map for notification resource routes.

```typescript
const requestHandlerMap: { readonly list: typeof list; readonly unreadCount: typeof unreadCount; readonly markRead: typeof markReadHandler; readonly markAllRead: typeof markAllReadHandler; readonly del: typeof del; readonly getPreferences: typeof getPreferencesHandler; readonly updatePreferences: typeof updatePreferencesHandler; }
```

#### `routes`

Route definitions for the notification resource.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/notifications"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/notifications/unread-count"; readonly handler: "unreadCount"; }, { readonly method: "get"; readonly path: "/notifications/preferences"; readonly handler: "getPreferences"; }, { readonly method: "post"; readonly path: "/notifications/:id/read"; readonly handler: "markRead"; }, { readonly method: "post"; readonly path: "/notifications/read-all"; readonly handler: "markAllRead"; }, { readonly method: "put"; readonly path: "/notifications/preferences"; readonly handler: "updatePreferences"; }, { readonly method: "delete"; readonly path: "/notifications/:id"; readonly handler: "del"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-notification-center` 1.0.0

### Runtime Dependencies

- `@molecule/api-notification-center`

This package is only the HTTP MANAGEMENT surface (list / unread-count /
mark-read / delete / preferences) over `@molecule/api-notification-center`.
Wire a notification-center provider (e.g.
`@molecule/api-notification-center-database`) BEFORE these handlers run —
without one every call throws "provider not configured". There is NO create
endpoint here: CREATE notifications through notification-center from your
feature code.

Tables: `src/__setup__/notifications.sql` creates BOTH tables the database
provider's contract requires — `notifications` (snake_case `user_id`,
`created_at`, …, plus `channels`, which the provider's `send()` ALWAYS
writes: without that column every create 500s) and `notification_preferences`
(one row per user: `email`/`push`/`sms` booleans + JSON `channels` map;
without it the preferences routes 500). An mlcl-scaffolded API replays
`__setup__/*.sql` automatically on migrate; anywhere else run it once. Do
NOT "normalise" the columns to camelCase — the provider maps rows itself
and a mismatched column 500s every request.

The route table carries no auth middleware — each handler reads the
authenticated user from `res.locals.session` (mount behind your global auth
middleware) and 401s without one. Everything is self-scoped: a user can
only ever see, mark, or delete their OWN notifications.
