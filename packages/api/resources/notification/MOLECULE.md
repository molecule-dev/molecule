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
npm install @molecule/api-resource-notification
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

```typescript
function del(req: Request<{ id: string; }, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with notification id param.
- `res` — Express response.

#### `getPreferencesHandler(req, res)`

Handles GET /notifications/preferences requests.

```typescript
function getPreferencesHandler(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with authenticated user.
- `res` — Express response.

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
function markAllReadHandler(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with authenticated user.
- `res` — Express response.

#### `markReadHandler(req, res)`

Handles POST /notifications/:id/read requests.

```typescript
function markReadHandler(req: Request<{ id: string; }, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
```

- `req` — Express request with notification id param.
- `res` — Express response.

#### `unreadCount(req, res)`

Handles GET /notifications/unread-count requests.

```typescript
function unreadCount(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>): Promise<void>
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
