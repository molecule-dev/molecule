# @molecule/api-resource-status-page

Status page resource for molecule.dev.

Public status-page backend: monitored services, incidents with lifecycle
updates, health-check history, and uptime windows. The read endpoints power
a public status page; the mutation endpoints are for operators.

## Quick Start

```typescript
import { createRequestHandler } from '@molecule/api-resource'
import { createRequestHandlerMap, routes } from '@molecule/api-resource-status-page'

// The handler map is a FACTORY (like api-resource-device) — build it with
// the createRequestHandler from @molecule/api-resource (mlcl inject does this):
const requestHandlerMap = createRequestHandlerMap(createRequestHandler)

// Public reads: GET /status, GET /status/services, GET /status/services/:id,
//               GET /status/incidents, GET /status/uptime
// Admin-only:   POST/PATCH/DELETE /status/services(/:id),
//               POST/PATCH /status/incidents(/:id)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-status-page @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-status-page @molecule/api-monitoring @molecule/api-notifications @molecule/api-permissions @molecule/api-resource @molecule/api-scheduler zod
```

## API

### Types

#### `CheckProps`

Health check result properties.

```typescript
type CheckProps = z.infer<typeof checkPropsSchema>
```

#### `CreateIncidentProps`

Fields accepted when creating a new incident.

```typescript
type CreateIncidentProps = z.infer<typeof createIncidentPropsSchema>
```

#### `CreateServiceProps`

Fields accepted when creating a new service.

```typescript
type CreateServiceProps = z.infer<typeof createServicePropsSchema>
```

#### `IncidentProps`

Full incident record properties.

```typescript
type IncidentProps = z.infer<typeof incidentPropsSchema>
```

#### `ServiceProps`

Full service record properties.

```typescript
type ServiceProps = z.infer<typeof servicePropsSchema>
```

#### `UpdateIncidentProps`

Updatable incident fields.

```typescript
type UpdateIncidentProps = z.infer<typeof updateIncidentPropsSchema>
```

#### `UpdateServiceProps`

Updatable service fields.

```typescript
type UpdateServiceProps = z.infer<typeof updateServicePropsSchema>
```

#### `UptimeWindowProps`

Uptime window statistics properties.

```typescript
type UptimeWindowProps = z.infer<typeof uptimeWindowPropsSchema>
```

### Functions

#### `createRequestHandlerMap(createRequestHandler)`

Creates the full request handler map for the Status resource. Maps handler names
(matching route definitions) to Express middleware via `createRequestHandler`.

`requireAdmin` is the status-management authorizer middleware referenced by the
mutating routes (`createService`/`updateService`/`deleteService`/`createIncident`/
`updateIncident`). It must live here as a real handler-map key so the mlcl
injector's route scanner preserves it — a bare middleware string that isn't a
handler-map key is silently dropped (which is why the previous `'auth'` gate was
inert and the mutating routes shipped public). It is already an Express
middleware, so it is NOT wrapped in `createRequestHandler`.

```typescript
function createRequestHandlerMap(createRequestHandler: (handler: Handler) => (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>): Record<string, MoleculeRequestHandler>
```

- `createRequestHandler` — Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.

**Returns:** A record mapping handler names to Express middleware functions.

#### `createResource()`

Creates a new status resource definition.

```typescript
function createResource(): types.Resource<unknown>
```

**Returns:** The status resource descriptor with name, tableName, and schema.

#### `isStatusAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer the status page (create/update/delete services + incidents).
Fail-closed: returns `false` when there is no authenticated session, and
otherwise only `true` when the session carries an admin claim or a bonded
permissions provider grants the `manage status` permission.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isStatusAdmin(res: MoleculeResponse): Promise<boolean>
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized status page admin.

#### `requireAdmin()`

Route middleware that gates the admin-only status page mutation routes. Calls
`next()` only for an authenticated status page admin; otherwise forwards an
error to the framework error handler — `Unauthorized` when no session is
present, `Forbidden` when the session is authenticated but not authorized to
manage the status page.

Exposed as a request-handler-map key so the injector's route scanner keeps it
(unlike the inert global `'auth'` string, which is dropped).

```typescript
function requireAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

### Constants

#### `checkPropsSchema`

Schema for a single health check result.

```typescript
const checkPropsSchema: z.ZodObject<{ id: z.ZodString; serviceId: z.ZodString; status: z.ZodEnum<{ up: "up"; down: "down"; degraded: "degraded"; }>; httpStatus: z.ZodOptional<z.ZodNumber>; latencyMs: z.ZodOptional<z.ZodNumber>; error: z.ZodOptional<z.ZodString>; checkedAt: z.ZodString; }, z.core.$strip>
```

#### `createIncidentPropsSchema`

Schema for creating a new incident.

```typescript
const createIncidentPropsSchema: z.ZodObject<{ status: z.ZodEnum<{ investigating: "investigating"; identified: "identified"; monitoring: "monitoring"; resolved: "resolved"; }>; serviceId: z.ZodString; title: z.ZodString; description: z.ZodOptional<z.ZodString>; severity: z.ZodEnum<{ minor: "minor"; major: "major"; critical: "critical"; }>; autoDetected: z.ZodDefault<z.ZodBoolean>; startedAt: z.ZodString; }, z.core.$strip>
```

#### `createServicePropsSchema`

Schema for creating a new service.

```typescript
const createServicePropsSchema: z.ZodObject<{ name: z.ZodString; url: z.ZodString; method: z.ZodDefault<z.ZodEnum<{ GET: "GET"; HEAD: "HEAD"; POST: "POST"; }>>; expectedStatus: z.ZodDefault<z.ZodNumber>; timeoutMs: z.ZodDefault<z.ZodNumber>; intervalMs: z.ZodDefault<z.ZodNumber>; groupName: z.ZodOptional<z.ZodString>; enabled: z.ZodDefault<z.ZodBoolean>; }, z.core.$strip>
```

#### `i18nNamespace`

The i18n namespace for the status resource.

```typescript
const i18nNamespace: "status"
```

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `incidentPropsSchema`

Full schema for a service incident.

```typescript
const incidentPropsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; serviceId: z.ZodString; title: z.ZodString; description: z.ZodOptional<z.ZodString>; severity: z.ZodEnum<{ minor: "minor"; major: "major"; critical: "critical"; }>; status: z.ZodEnum<{ investigating: "investigating"; identified: "identified"; monitoring: "monitoring"; resolved: "resolved"; }>; autoDetected: z.ZodDefault<z.ZodBoolean>; startedAt: z.ZodString; resolvedAt: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `resource`

The status resource definition.

```typescript
const resource: types.Resource<unknown>
```

#### `routes`

Route array for status page endpoints: public read routes and admin-gated mutation routes.

```typescript
const routes: ({ method: "get"; path: string; middlewares: never[]; handler: string; } | { method: "post"; path: string; middlewares: string[]; handler: string; } | { method: "patch"; path: string; middlewares: string[]; handler: string; } | { method: "delete"; path: string; middlewares: string[]; handler: string; })[]
```

#### `servicePropsSchema`

Full schema for a monitored service.

```typescript
const servicePropsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; name: z.ZodString; url: z.ZodString; method: z.ZodDefault<z.ZodEnum<{ GET: "GET"; HEAD: "HEAD"; POST: "POST"; }>>; expectedStatus: z.ZodDefault<z.ZodNumber>; timeoutMs: z.ZodDefault<z.ZodNumber>; intervalMs: z.ZodDefault<z.ZodNumber>; groupName: z.ZodOptional<z.ZodString>; enabled: z.ZodDefault<z.ZodBoolean>; }, z.core.$strip>
```

#### `STATUS_ADMIN_PERMISSION`

Session-claim permission string (`'status:manage'`) that, when present in a
session's `permissions` array, grants status page administration without a
bonded permissions provider.

```typescript
const STATUS_ADMIN_PERMISSION: "status:manage"
```

#### `STATUS_PERMISSION_ACTION`

Permission action checked against `@molecule/api-permissions` for status page
administration.

```typescript
const STATUS_PERMISSION_ACTION: "manage"
```

#### `STATUS_PERMISSION_RESOURCE`

Permission resource checked against `@molecule/api-permissions` for status page
administration.

```typescript
const STATUS_PERMISSION_RESOURCE: "status"
```

#### `updateIncidentPropsSchema`

Schema for updating an existing incident (all fields optional).

```typescript
const updateIncidentPropsSchema: z.ZodObject<{ status: z.ZodOptional<z.ZodEnum<{ investigating: "investigating"; identified: "identified"; monitoring: "monitoring"; resolved: "resolved"; }>>; title: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodOptional<z.ZodString>>; severity: z.ZodOptional<z.ZodEnum<{ minor: "minor"; major: "major"; critical: "critical"; }>>; resolvedAt: z.ZodOptional<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
```

#### `updateServicePropsSchema`

Schema for updating an existing service (all fields optional).

```typescript
const updateServicePropsSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; url: z.ZodOptional<z.ZodString>; method: z.ZodOptional<z.ZodDefault<z.ZodEnum<{ GET: "GET"; HEAD: "HEAD"; POST: "POST"; }>>>; expectedStatus: z.ZodOptional<z.ZodDefault<z.ZodNumber>>; timeoutMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>; intervalMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>; groupName: z.ZodOptional<z.ZodOptional<z.ZodString>>; enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>; }, z.core.$strip>
```

#### `uptimeWindowPropsSchema`

Schema for a pre-computed uptime statistics window.

```typescript
const uptimeWindowPropsSchema: z.ZodObject<{ id: z.ZodString; serviceId: z.ZodString; window: z.ZodEnum<{ "1h": "1h"; "24h": "24h"; "7d": "7d"; "30d": "30d"; "90d": "90d"; }>; uptimePct: z.ZodNumber; totalChecks: z.ZodNumber; upChecks: z.ZodNumber; avgLatencyMs: z.ZodNumber; }, z.core.$strip>
```

### Namespaces

#### `handlers`

#### `types`

#### `z`

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-monitoring` ^1.0.0
- `@molecule/api-notifications` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-scheduler` ^1.0.0
- `@molecule/api-locales-status-page` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-status-page`
- `@molecule/api-monitoring`
- `@molecule/api-notifications`
- `@molecule/api-permissions`
- `@molecule/api-resource`
- `@molecule/api-scheduler`
- `zod`

The GET routes are PUBLIC by design — a status page is a public surface; do
not put them behind auth. The mutating routes are ADMIN-ONLY and DENY by
default: they are gated by the `requireAdmin` middleware AND re-checked
inside every mutation handler via `isStatusAdmin` — fail-closed
defense-in-depth that holds even if a route scanner drops the middleware.
"Admin" resolves as: an admin session claim (`isAdmin: true`,
`role: 'admin'`, `roles` containing `'admin'`, or a `'status:manage'` /
`'admin'` entry in `session.permissions`) OR a bonded
`@molecule/api-permissions` grant of `manage` on `status`. Until the app
grants one of those, every mutation is denied — grant the claim/permission
at startup, do NOT strip the gate: an open mutation surface lets any caller
deface the public status page (fabricate outages, delete services).

Handler text flows through `t()` with English defaults; the companion
locale bond `@molecule/api-locales-status-page` provides translations.

Tables: `setup/*.sql` creates `services`, `incidents`, `checks`, and
`uptimeWindows`. An mlcl-scaffolded API replays these setup files
automatically on migrate; anywhere else run them once — nothing at runtime
creates them.
