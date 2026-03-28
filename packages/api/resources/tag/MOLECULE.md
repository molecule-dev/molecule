# @molecule/api-resource-tag

Tag resource for molecule.dev.

Provides CRUD for tags (name, slug, color, description) and a join-table
system for tagging any entity. Includes popular-tag and slug-based lookups.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-tag
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-tag'

// Wire routes into your Express app via mlcl inject
// Routes: POST/GET/PATCH/DELETE /tags, GET /tags/popular,
//         GET /tags/:slug/resources, POST/DELETE /:resourceType/:resourceId/tags
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

```typescript
function addTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params, `tagId` in body.
- `res` — The response object.

#### `create(req, res)`

Creates a new tag with a unique slug derived from the name.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with `CreateTagInput` body.
- `res` — The response object.

#### `del(req, res)`

Deletes a tag by ID. Cascade-deletes associated resource_tags via DB constraint.

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

```typescript
function removeTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType`, `resourceId`, and `tagId` params.
- `res` — The response object.

#### `update(req, res)`

Updates a tag by ID.

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

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly popular: typeof popular; readonly addTag: typeof addTag; readonly removeTag: typeof removeTag; readonly getBySlug: typeof getBySlug; }
```

#### `routes`

Route array for tag CRUD plus resource-tagging and popular/slug lookups.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/tags"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/tags"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/tags/popular"; readonly handler: "popular"; }, { readonly method: "get"; readonly path: "/tags/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/tags/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/tags/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/tags/:slug/resources"; readonly handler: "getBySlug"; }, { readonly method: "post"; readonly path: "/:resourceType/:resourceId/tags"; readonly handler: "addTag"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/:resourceType/:resourceId/tags/:tagId"; readonly handler: "removeTag"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-tag` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
