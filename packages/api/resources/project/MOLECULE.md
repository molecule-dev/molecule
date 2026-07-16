# @molecule/api-resource-project

Owner-scoped project resource for molecule.dev — CRUD handlers, routes, and
an `authUser` object-level authorizer, wired via `routes` +
`requestHandlerMap`.

## Quick Start

```ts
import { routes, requestHandlerMap } from '@molecule/api-resource-project'
// POST|GET /projects · GET|PATCH|DELETE /projects/:id — registered by
// mlcl inject, or manually:
// for (const r of routes) app[r.method](r.path, requestHandlerMap[r.handler])
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-project @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-project @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `BrandingSpec`

Branding applied to a scaffolded project. Derived from user cues gathered
during discovery, or randomized so generated apps are visually distinct.

```typescript
interface BrandingSpec {
  /** Display name (header, auth pages, PWA manifest, OG tags). */
  appName: string
  /** Primary brand color as a hex string (e.g. `#1a8917`). */
  brandColor: string
  /** Short description used in the PWA manifest and meta tags. */
  appDescription: string
  /** About/footer link. */
  websiteUrl?: string
  /** Logo dimensions in pixels. */
  logoSize?: number
  /** Whether the spec came from explicit user cues or was randomized. */
  source: 'user' | 'random'
}
```

#### `Project`

A user project record (name, type, framework, packages, sandbox state, settings).

```typescript
interface Project {
  id: string
  userId: string
  name: string
  slug: string
  projectType: 'api' | 'app' | 'full-stack' | 'status-page'
  framework: string | null
  packages: string[]
  /** Flagship template slug the project was scaffolded from, if any. */
  templateSlug: string | null
  /** Branding chosen for the project during discovery, if any. */
  brandingSpec: BrandingSpec | null
  envVars: Record<string, string>
  sandboxId: string | null
  sandboxStatus: 'creating' | 'queued' | 'running' | 'sleeping' | 'stopped'
  lastActiveAt: string | null
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

### Types

#### `CreateProjectInput`

Create Project Input type.

```typescript
type CreateProjectInput = Pick<Project, 'name' | 'projectType'> & {
  framework?: string
  packages?: string[]
}
```

#### `UpdateProjectInput`

Update Project Input type.

`framework`, `packages`, `projectType`, `templateSlug`, and `brandingSpec`
are writable so the post-discovery selection step can persist the chosen
starting point before the sandbox boots.

```typescript
type UpdateProjectInput = Partial<
  Pick<
    Project,
    | 'name'
    | 'settings'
    | 'envVars'
    | 'sandboxId'
    | 'sandboxStatus'
    | 'framework'
    | 'packages'
    | 'projectType'
    | 'templateSlug'
    | 'brandingSpec'
  >
>
```

### Functions

#### `authUser(req, res, next)`

Object-level authorization middleware for a single project (`:id`).

Fails closed: looks up the project scoped to BOTH the `:id` route param and the
authenticated `session.userId`, so a row is returned only when the caller owns
it. On success the owned row is stashed in `res.locals.project` for the
downstream handler (avoiding a second query); otherwise the request is rejected
with `401` (no session) or `403` (project missing or owned by someone else — the
two are deliberately indistinguishable so existence is not leaked).

This is the shipped default for the read/update/delete routes (see `routes.ts`),
mirroring `@molecule/api-resource-device`'s `authUser`. A consumer with a richer
access model (e.g. owner-or-team) may gate the route with its own middleware
instead and set `res.locals.project` to the pre-authorized row.

```typescript
function authUser(req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction): Promise<void>
```

- `req` — The request object (uses `params.id`).
- `res` — The response object (reads `locals.session`, writes `locals.project`).
- `next` — Passes control to the next handler on success.

#### `create(req, res)`

Creates a new project with a unique slug derived from the project name. Requires `name` and
`projectType` in the request body. Optionally accepts `framework` and `packages`. Appends
a timestamp suffix to the slug if it already exists.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with `CreateProjectInput` body and `userId`.
- `res` — The response object for sending the created project or error.

#### `del(req, res)`

Del.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

#### `list(_req, res)`

Lists the authenticated caller's projects, newest first. Scoped to
`session.userId` so a generated app never returns another tenant's rows —
an unscoped list is a one-request full-tenant data dump. Returns 401 when
there is no authenticated session.

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object.
- `res` — The response object (reads `locals.session`).

#### `read(req, res)`

Reads a single project the caller owns. The `authUser` route middleware
already loads the owner-scoped row into `res.locals.project`; this handler
reuses it when present and otherwise falls back to its own owner-scoped
lookup, so it fails closed even if mounted without that middleware. Returns
401 with no session and 404 when no project owned by the caller matches the
id (existence is not leaked to non-owners).

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object (uses `params.id`).
- `res` — The response object (reads `locals.session`/`locals.project`).

#### `update(req, res)`

Update.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

### Constants

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Map of request handler names to implementations. `authUser` is the
object-level authorization middleware referenced by `routes.ts` for the
`read`/`update`/`del` routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly authUser: typeof authUser; }
```

#### `routes`

Route array for project CRUD: POST create, GET list, GET/:id read, PATCH/:id update, DELETE/:id del.

`create`/`list` only need an authenticated session (`authenticate`); the `list`
handler itself scopes results to the caller's `userId`. The object-level
routes (`read`/`update`/`del`) are gated by `authUser`, which fails closed —
it loads the project scoped to the caller's `userId` and 401/403s otherwise —
so generated apps that wire this resource do NOT expose other tenants' projects
by default. Mirrors `@molecule/api-resource-device`.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/projects"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/projects"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/projects/:id"; readonly handler: "read"; readonly middlewares: readonly ["authUser"]; }, { readonly method: "patch"; readonly path: "/projects/:id"; readonly handler: "update"; readonly middlewares: readonly ["authUser"]; }, { readonly method: "delete"; readonly path: "/projects/:id"; readonly handler: "del"; readonly middlewares: readonly ["authUser"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-project` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-project`
- `@molecule/api-logger`
- `@molecule/api-resource`

The shipped routes are owner-scoped and **fail closed** — they do not expose
other tenants' projects by default. `GET /projects` (`list`) returns only the
authenticated caller's rows (scoped to `session.userId`), and the object-level
routes `GET/PATCH/DELETE /projects/:id` are gated by the `authUser` authorizer,
which loads the project scoped to the caller's `userId`, stashes it on
`res.locals.project`, and responds `401` (no session) / `403` (not the owner)
otherwise. This mirrors `@molecule/api-resource-device`. A consumer that needs
a richer access model (e.g. owner-or-team) can gate the route with its own
middleware and set `res.locals.project` to the pre-authorized row — `read`,
`update`, and `del` reuse it instead of re-deriving ownership.

Table: `src/__setup__/projects.sql` creates `projects`. An mlcl-scaffolded
API replays `__setup__/*.sql` automatically on migrate; anywhere else run
it once. User-facing strings use `t(key, …, { defaultValue })`; translations
ship in the companion `@molecule/api-locales-project` bond.
