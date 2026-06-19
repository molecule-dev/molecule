# @molecule/api-resource-tag

Tag resource for molecule.dev.

Provides CRUD for tags (name, slug, color, description) and a join-table
system for tagging any entity. Includes popular-tag and slug-based lookups.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-tag'

// Wire routes into your Express app via mlcl inject
// Routes: POST/GET/PATCH/DELETE /tags, GET /tags/popular,
//         GET /tags/:slug/resources, POST/DELETE /:resourceType/:resourceId/tags
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-tag
```

## API

### Interfaces

#### `ResourceTag`

A join record linking a tag to any resource.

```typescript
interface ResourceTag {
  /** Unique identifier. */
  id: string
  /** Foreign key to the tag. */
  tagId: string
  /** The type of resource (e.g. 'project', 'product'). */
  resourceType: string
  /** The ID of the tagged resource. */
  resourceId: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}
```

#### `Tag`

A tag record with name, slug, optional color, and optional description.

```typescript
interface Tag {
  /** Unique identifier. */
  id: string
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional hex color for visual display (e.g. '#ff5733'). */
  color: string | null
  /** Optional description of the tag. */
  description: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}
```

### Types

#### `CreateTagInput`

Input for creating a new tag.

```typescript
type CreateTagInput = Pick<Tag, 'name'> & {
  /** Optional hex color. */
  color?: string | null
  /** Optional description. */
  description?: string | null
}
```

#### `UpdateTagInput`

Input for updating an existing tag.

```typescript
type UpdateTagInput = Partial<Pick<Tag, 'name' | 'color' | 'description'>>
```

### Functions

#### `addTag(req, res)`

Adds a tag to a resource. Expects `tagId` in request body.

Requires an authenticated session and rejects an unauthenticated caller (401)
before reading or mutating `resource_tags` — fail-closed defense-in-depth that
does not depend on the `authenticate` route middleware being wired. Attaching a
tag is governed by the owner of the *target* resource, but that ownership lives
in the resource's own package (project/product/…) and is not visible here — this
package has no generic cross-resource ownership check — so the gate enforced in
this handler is "must be authenticated"; per-resource owner authorization is the
responsibility of the resource that mounts this route.

```typescript
function addTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params, `tagId` in body.
- `res` — The response object.

#### `create(req, res)`

Creates a new tag with a unique slug derived from the name.

Admin-only and enforced here (not merely via route middleware): tags are a
shared global taxonomy with no per-row owner, so creating a new taxonomy entry
is the same class of mutation as update/del. A non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before any tag row is inserted —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired. (Attaching an *existing* tag to a resource is a different, owner-
governed operation — see `addTag`/`removeTag`.)

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with `CreateTagInput` body.
- `res` — The response object.

#### `del(req, res)`

Deletes a tag by ID. Cascade-deletes associated resource_tags via DB constraint.

Admin-only and enforced here (not merely via route middleware): tags are a
shared global taxonomy with no per-row owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before anything is read or deleted —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `getBySlug(req, res)`

Gets all resources associated with a tag by slug.
Optionally filters by `resourceType` query parameter.

```typescript
function getBySlug(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `slug` param and optional `resourceType` query.
- `res` — The response object.

#### `isTagAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer tags (update/delete the shared taxonomy). Fail-closed: returns
`false` when there is no authenticated session, and otherwise only `true` when
the session carries an admin claim or a bonded permissions provider grants the
`manage tag` permission.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isTagAdmin(res: MoleculeResponse): Promise<boolean>
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized tag admin.

#### `list(_req, res)`

Lists all tags ordered by name.

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object.
- `res` — The response object.

#### `popular(req, res)`

Returns the most popular tags ordered by usage count.

```typescript
function popular(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object. Optional query param `limit` (default 20, max 100).
- `res` — The response object.

#### `read(req, res)`

Reads a single tag by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `removeTag(req, res)`

Removes a tag from a resource.

Requires an authenticated session and rejects an unauthenticated caller (401)
before mutating `resource_tags` — fail-closed defense-in-depth that does not
depend on the `authenticate` route middleware being wired. Detaching a tag is
governed by the owner of the *target* resource, but that ownership lives in the
resource's own package (project/product/…) and is not visible here — this
package has no generic cross-resource ownership check — so the gate enforced in
this handler is "must be authenticated"; per-resource owner authorization is the
responsibility of the resource that mounts this route.

```typescript
function removeTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType`, `resourceId`, and `tagId` params.
- `res` — The response object.

#### `requireAdmin()`

Route middleware that gates the admin-only tag mutation routes (`update`,
`del`). Calls `next()` only for an authenticated admin; otherwise forwards an
error to the framework error handler — `Unauthorized` when no session is
present, `Forbidden` when the session is authenticated but not an admin.

Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
(unlike the inert global `'authenticate'` string, which is dropped).

```typescript
function requireAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `update(req, res)`

Updates a tag by ID.

Admin-only and enforced here (not merely via route middleware): tags are a
shared global taxonomy with no per-row owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before anything is read or written —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param and `UpdateTagInput` body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has completed.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for tag resource routes.

`requireAdmin` is the admin authorizer middleware referenced by the
`update`/`del` routes. It must live here (as a real handler-map key) so the
mlcl injector's route scanner preserves it — a bare middleware string that
isn't a handler-map key is silently dropped.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly popular: typeof popular; readonly addTag: typeof addTag; readonly removeTag: typeof removeTag; readonly getBySlug: typeof getBySlug; readonly requireAdmin: MoleculeRequestHandler; }
```

#### `routes`

Route array for tag CRUD plus resource-tagging and popular/slug lookups.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/tags"; readonly handler: "create"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/tags"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/tags/popular"; readonly handler: "popular"; }, { readonly method: "get"; readonly path: "/tags/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/tags/:id"; readonly handler: "update"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "delete"; readonly path: "/tags/:id"; readonly handler: "del"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/tags/:slug/resources"; readonly handler: "getBySlug"; }, { readonly method: "post"; readonly path: "/:resourceType/:resourceId/tags"; readonly handler: "addTag"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/:resourceType/:resourceId/tags/:tagId"; readonly handler: "removeTag"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `TAG_ADMIN_PERMISSION`

Session-claim permission string (`'tag:manage'`) that, when present in a
session's `permissions` array, grants tag administration without a bonded
permissions provider.

```typescript
const TAG_ADMIN_PERMISSION: "tag:manage"
```

#### `TAG_PERMISSION_ACTION`

Permission action checked against `@molecule/api-permissions` for tag
administration.

```typescript
const TAG_PERMISSION_ACTION: "manage"
```

#### `TAG_PERMISSION_RESOURCE`

Permission resource checked against `@molecule/api-permissions` for tag
administration.

```typescript
const TAG_PERMISSION_RESOURCE: "tag"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-tag` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-resource` ^1.0.0
