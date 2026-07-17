# @molecule/api-resource-template

Resource-template resource for molecule.dev.

Generic template registry: store reusable, versioned snapshots keyed by
(`resourceType`, `slug`) plus a pure-data `instantiate` helper that
resolves `{{variable}}` placeholders inside the snapshot to materialise
a concrete payload. Handler errors flow through `t()` with English
defaults — no companion locale bond is shipped (no user-visible UI text
lives in this package).

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-template'

// Wire routes into your Express app via `mlcl inject`:
// POST   /resource-templates
// GET    /resource-templates
// GET    /resource-templates/:id
// PATCH  /resource-templates/:id
// DELETE /resource-templates/:id
// POST   /resource-templates/:id/instantiate
```

```typescript
import { instantiateTemplate } from '@molecule/api-resource-template'

const result = instantiateTemplate(
  {
    snapshot: { title: 'Hello {{name}}', body: '{{greeting}}!' },
    variables: [{ name: 'greeting', defaultValue: 'Welcome' }],
  },
  { name: 'Ada' },
)
// result.payload === { title: 'Hello Ada', body: 'Welcome!' }
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-template @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `CreateTemplateInput`

Input for creating a new template.

```typescript
interface CreateTemplateInput {
  /** Resource type the template materialises. */
  resourceType: string
  /** Unique slug within `resourceType`. */
  slug: string
  /** Display name. */
  name: string
  /** Optional long description. */
  description?: string | null
  /** Raw JSON snapshot. */
  snapshot: unknown
  /** Declared variables. */
  variables?: TemplateVariable[]
  /** Free-form tags. */
  tags?: string[]
  /** Whether to expose the template publicly. */
  isPublic?: boolean
  /** Creator user ID. */
  createdBy?: string | null
}
```

#### `InstantiateResult`

Result of an instantiation request.

```typescript
interface InstantiateResult<T = unknown> {
  /** Cloned snapshot with placeholders resolved. */
  payload: T
  /** Variable map that was actually applied (defaults merged in). */
  resolvedVariables: VariableValues
  /** Variable names that were left unresolved (no value supplied, no default). */
  missingVariables: string[]
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** Items on the current page. */
  data: T[]
  /** Total matching rows across all pages. */
  total: number
  /** Page size. */
  limit: number
  /** Rows skipped before this page. */
  offset: number
}
```

#### `Template`

A persisted template entry. The `snapshot` field is the raw JSON to
clone on instantiation; placeholders inside it are resolved against
the supplied `variables` map.

```typescript
interface Template {
  /** Unique template identifier. */
  id: string
  /** The type of resource this template materialises (e.g. 'document'). */
  resourceType: string
  /** Human-friendly URL slug, unique within `resourceType`. */
  slug: string
  /** Display name. */
  name: string
  /** Optional long description. */
  description: string | null
  /** Raw JSON snapshot — may contain `{{variable}}` placeholders. */
  snapshot: unknown
  /** Declared variables expected by the snapshot. */
  variables: TemplateVariable[]
  /** Free-form tags for filtering and search. */
  tags: string[]
  /** Monotonic version counter — bumped on every update. */
  version: number
  /** Whether the template is publicly listable. */
  isPublic: boolean
  /** ID of the creating user, if known. */
  createdBy: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-update timestamp. */
  updatedAt: string
}
```

#### `TemplateQuery`

Filters for listing templates.

```typescript
interface TemplateQuery {
  /**
   * ID of the authenticated caller. Scopes the result to the templates this
   * viewer is allowed to see: public templates plus their OWN private ones.
   * When omitted, only public templates are returned (fail closed).
   */
  viewerId?: string
  /** Limit results to a specific resource type. */
  resourceType?: string
  /** Restrict to public templates only. */
  publicOnly?: boolean
  /** Filter by creator user ID. */
  createdBy?: string
  /** Match any of the supplied tags. */
  tags?: string[]
  /** Maximum number of rows to return. */
  limit?: number
  /** Number of rows to skip. */
  offset?: number
}
```

#### `TemplateVariable`

A single declared variable a template expects when instantiated.

```typescript
interface TemplateVariable {
  /** Variable name, referenced as `{{name}}` in the snapshot. */
  name: string
  /** Optional default value when the caller does not supply one. */
  defaultValue?: string | number | boolean | null
  /** Whether the variable must be provided at instantiation time. */
  required?: boolean
  /** Free-form human-readable description of the variable. */
  description?: string
}
```

#### `UpdateTemplateInput`

Input for updating an existing template. Any field omitted is left as-is;
`version` is incremented automatically when any field changes.

```typescript
interface UpdateTemplateInput {
  /** New display name. */
  name?: string
  /** New description (`null` to clear). */
  description?: string | null
  /** Replace the snapshot wholesale. */
  snapshot?: unknown
  /** Replace the declared variables. */
  variables?: TemplateVariable[]
  /** Replace the tags. */
  tags?: string[]
  /** Toggle public visibility. */
  isPublic?: boolean
}
```

### Types

#### `VariableValues`

Map of variable name to substitution value.

```typescript
type VariableValues = Record<string, string | number | boolean | null | undefined>
```

### Functions

#### `canEditTemplate(template, userId)`

Returns `true` when the supplied user can edit the template (currently
limited to the creator). Hosts that need richer rules (org admin, share
grants, etc.) should layer their own check on top.

```typescript
function canEditTemplate(template: Template, userId: string | null): boolean
```

- `template` — Template under inspection.
- `userId` — The editing user's ID, or `null`.

**Returns:** `true` when the user is the creator.

#### `canViewTemplate(template, userId)`

Returns `true` when the supplied user can view the template — that is,
the template is public or the user is its creator.

```typescript
function canViewTemplate(template: Template, userId: string | null): boolean
```

- `template` — Template under inspection.
- `userId` — The viewing user's ID, or `null` for anonymous viewers.

**Returns:** `true` when the template is visible.

#### `create(req, res)`

Creates a new template entry. Returns `409 Conflict` if a row already
exists for the same `(resourceType, slug)` pair.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with creation body.
- `res` — Response object.

#### `createTemplate(input)`

Creates a new template entry. Throws when a row already exists for the
same `(resourceType, slug)` pair.

```typescript
function createTemplate(input: CreateTemplateInput): Promise<Template>
```

- `input` — Template creation payload.

**Returns:** The persisted template.

#### `del(req, res)`

Deletes a template by ID.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `id` path param.
- `res` — Response object.

#### `deleteTemplate(id)`

Deletes a template by ID. Idempotent — returns `false` when no row was
deleted (e.g. unknown ID).

```typescript
function deleteTemplate(id: string): Promise<boolean>
```

- `id` — The template ID.

**Returns:** `true` when a row was deleted.

#### `getTemplate(id)`

Returns a single template by ID, or `null` when not found.

```typescript
function getTemplate(id: string): Promise<Template | null>
```

- `id` — The template ID.

**Returns:** The template or `null`.

#### `getTemplateBySlug(resourceType, slug)`

Returns a single template by `(resourceType, slug)`, or `null` when not
found.

```typescript
function getTemplateBySlug(resourceType: string, slug: string): Promise<Template | null>
```

- `resourceType` — The resource type.
- `slug` — The template slug, unique within the resource type.

**Returns:** The template or `null`.

#### `instantiate(req, res)`

Instantiates a template by ID. The response includes the resolved
payload, the merged variable map, and any unresolved variable names.

```typescript
function instantiate(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `id` path param and `{ variables? }` body.
- `res` — Response object.

#### `instantiateById(id, variables)`

Loads a template and resolves its snapshot against the supplied variable
map. Returns `null` when the template does not exist.

```typescript
function instantiateById(id: string, variables?: VariableValues): Promise<InstantiateResult<T> | null>
```

- `id` — The template ID.
- `variables` — Caller-supplied variable values.

**Returns:** The instantiation result, or `null` when not found.

#### `instantiateTemplate(template, variables)`

Resolves a template's snapshot against a caller-supplied variable map.
Declared defaults are merged in for any variable the caller omits.

```typescript
function instantiateTemplate(template: Pick<Template, "snapshot" | "variables">, variables?: VariableValues): InstantiateResult<T>
```

- `template` — The template to instantiate.
- `variables` — Caller-supplied variable values.

**Returns:** The resolved payload, the merged variable map, and any
 *          unresolved variable names.

#### `list(req, res)`

Lists templates with optional filtering by `resourceType`, `tags`, and
`publicOnly`.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with optional query string filters.
- `res` — Response object.

#### `listTemplates(query)`

Lists templates visible to the caller, with optional filtering and
pagination.

Visibility is scoped to the caller (`query.viewerId`): a viewer sees public
templates PLUS their own private ones — never another user's private rows.
The DataStore's `buildWhere` joins clauses with AND only (there is no OR
group), so the visibility OR is realised as two queries (public rows + the
viewer's own rows) merged + de-duped in memory. Tag filtering is likewise
in-memory (no native JSONB `?|` operator). The table is bounded
(admin/user-managed), so the in-memory merge, sort, and pagination are fine —
the same justification used for the in-memory tag filter.

Filters compose with the visibility scope:
- `publicOnly=true` restricts to public rows only (drops the viewer's private).
- `createdBy=<X>` is INTERSECTED with the viewer-visible set: a non-owner
  `createdBy` still only surfaces that user's PUBLIC rows — a caller can never
  page another tenant's private rows via `createdBy`.
- When `viewerId` is omitted, only public rows are returned (fail closed).

```typescript
function listTemplates(query?: TemplateQuery): Promise<PaginatedResult<Template>>
```

- `query` — Filters, viewer scope, and pagination.

**Returns:** Paginated list of viewer-visible templates.

#### `mergeVariableValues(declared, supplied)`

Merges declared template defaults with caller-supplied overrides.
Caller values take precedence; declared defaults fill in the rest.

```typescript
function mergeVariableValues(declared: TemplateVariable[], supplied?: VariableValues): VariableValues
```

- `declared` — Variable declarations from the template.
- `supplied` — Caller-supplied variable map.

**Returns:** The merged variable map.

#### `read(req, res)`

Reads a single template by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `id` path param.
- `res` — Response object.

#### `substitute(value, variables, missing)`

Recursively walks a JSON-like value and substitutes placeholders inside
any string leaves. Non-string scalars are returned unchanged.

```typescript
function substitute(value: T, variables: VariableValues, missing?: string[]): T
```

- `value` — Snapshot value to walk (object, array, scalar, or null).
- `variables` — Map of variable name to value.
- `missing` — Mutable array collecting unresolved variable names.

**Returns:** A deep clone with placeholders resolved.

#### `substituteString(input, variables, missing)`

Substitutes `{{variable}}` placeholders inside any string value. Numbers,
booleans, and `null` are coerced to their JSON-string form. Unknown
variables are pushed onto `missing` and left as the original placeholder
text.

```typescript
function substituteString(input: string, variables: VariableValues, missing?: string[]): string
```

- `input` — The template string.
- `variables` — Map of variable name to value.
- `missing` — Mutable array collecting unresolved variable names.

**Returns:** The substituted string.

#### `update(req, res)`

Updates a template's mutable fields. `version` is bumped automatically.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Request with `id` path param and patch body.
- `res` — Response object.

#### `updateTemplate(id, patch)`

Updates an existing template by ID. Any provided field replaces the
stored value; `version` is incremented when at least one field changes.

```typescript
function updateTemplate(id: string, patch: UpdateTemplateInput): Promise<Template | null>
```

- `id` — The template ID.
- `patch` — Fields to update.

**Returns:** The updated template, or `null` when the row does not exist.

### Constants

#### `createTemplateSchema`

Schema for creating a new template.

```typescript
const createTemplateSchema: z.ZodObject<{ resourceType: z.ZodString; slug: z.ZodString; name: z.ZodString; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; snapshot: z.ZodUnknown; variables: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>; required: z.ZodOptional<z.ZodBoolean>; description: z.ZodOptional<z.ZodString>; }, z.core.$strip>>>; tags: z.ZodOptional<z.ZodArray<z.ZodString>>; isPublic: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `instantiateSchema`

Schema for the instantiate endpoint body. The variable map accepts only
primitive values — placeholders inside the snapshot are string-shaped.

```typescript
const instantiateSchema: z.ZodObject<{ variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for resource-template routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly instantiate: typeof instantiate; }
```

#### `routes`

HTTP routes for template CRUD and instantiation.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/resource-templates"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/resource-templates"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/resource-templates/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/resource-templates/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/resource-templates/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/resource-templates/:id/instantiate"; readonly handler: "instantiate"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `updateTemplateSchema`

Schema for updating an existing template. Every field is optional;
`version` is bumped automatically when at least one field changes.

```typescript
const updateTemplateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; snapshot: z.ZodOptional<z.ZodUnknown>; variables: z.ZodOptional<z.ZodArray<z.ZodObject<{ name: z.ZodString; defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>; required: z.ZodOptional<z.ZodBoolean>; description: z.ZodOptional<z.ZodString>; }, z.core.$strip>>>; tags: z.ZodOptional<z.ZodArray<z.ZodString>>; isPublic: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`
- `zod`

- **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
  bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
  HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
  peels a PURE single-key `{ data }` — yields an EMPTY list.
Session-auth prerequisite: every route — including reads — requires an
authenticated session; handlers read `res.locals.session.userId` and fail
closed with 401, so mount behind your global auth middleware. Visibility is
per-row: a template is readable when `isPublic` is true or the caller is its
`createdBy` creator (`canViewTemplate`), and editable/deletable ONLY by its
creator (`canEditTemplate`) — a non-visible row returns 404 (existence is
not leaked); a public row edited by a non-owner returns 403. `createdBy` is
derived from the session, never from the request body.

`(resourceType, slug)` is UNIQUE — a duplicate `create` returns 409
(`template.error.conflict`).

Tables: `src/__setup__/resource-templates.sql` creates `resource-templates`
(note the hyphenated table name). An mlcl-scaffolded API replays
`__setup__/*.sql` automatically on migrate; anywhere else run it once —
nothing at runtime creates them.
