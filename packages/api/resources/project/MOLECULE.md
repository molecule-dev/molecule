# @molecule/api-resource-project

project resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-project
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

List.

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object.
- `res` — The response object.

#### `read(req, res)`

Read.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

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

Map of request handler.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; }
```

#### `routes`

Route array for project CRUD: POST create, GET list, GET/:id read, PATCH/:id update, DELETE/:id del.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/projects"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/projects"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/projects/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/projects/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/projects/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }]
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
