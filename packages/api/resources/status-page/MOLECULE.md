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

Members:

- `handlers.createIncident` — function: Creates a new incident record. Validates the request body against
- `handlers.createService` — function: Creates a new monitored service. Validates the request body against
- `handlers.deleteService` — function: Deletes a monitored service by ID. Returns 404 if the service does not exist.
- `handlers.getService` — function: Returns a single service by ID along with the last 50 check results.
- `handlers.getStatus` — function: Returns the aggregated system health status.
- `handlers.getUptime` — function: Returns uptime window statistics for all services, or filtered by
- `handlers.listIncidents` — function: Lists incidents with support for `?status=` filtering and pagination
- `handlers.listServices` — function: Lists all services along with each service's latest check result.
- `handlers.updateIncident` — function: Updates an existing incident by ID. Validates the request body against
- `handlers.updateService` — function: Updates an existing monitored service by ID. Validates the request body

#### `types`

Members:

- `types.CheckProps` — type: Health check result properties.
- `types.CreateIncidentProps` — type: Fields accepted when creating a new incident.
- `types.CreateServiceProps` — type: Fields accepted when creating a new service.
- `types.IncidentProps` — type: Full incident record properties.
- `types.ServiceProps` — type: Full service record properties.
- `types.UpdateIncidentProps` — type: Updatable incident fields.
- `types.UpdateServiceProps` — type: Updatable service fields.
- `types.UptimeWindowProps` — type: Uptime window statistics properties.
- `types.Resource` — type: An object describing the `status` resource.

#### `z`

Members:

- `z.core` — namespace
- `z.infer` — type
- `z.output` — type
- `z.input` — type
- `z.JSONType` — type
- `z.globalRegistry` — const
- `z.GlobalMeta` — interface
- `z.registry` — function
- `z.config` — function
- `z.$output` — const
- `z.$input` — const
- `z.$brand` — const
- `z.clone` — function
- `z.regexes` — namespace
- `z.treeifyError` — function
- `z.prettifyError` — function
- `z.formatError` — function
- `z.flattenError` — function
- `z.TimePrecision` — const
- `z.util` — namespace
- `z.NEVER` — const: A special constant with type `never`
- `z.toJSONSchema` — function
- `z.fromJSONSchema` — function: Converts a JSON Schema to a Zod schema. This function should be considered semi-experimental. It's behavior is liable to change.
- `z.locales` — namespace
- `z.ZodISODateTime` — interface
- `z.ZodISODate` — interface
- `z.ZodISOTime` — interface
- `z.ZodISODuration` — interface
- `z.iso` — namespace
- `z.ZodCoercedString` — interface
- `z.ZodCoercedNumber` — interface
- `z.ZodCoercedBigInt` — interface
- `z.ZodCoercedBoolean` — interface
- `z.ZodCoercedDate` — interface
- `z.coerce` — namespace
- `z.string` — function
- `z.email` — function
- `z.guid` — function
- `z.uuid` — function
- `z.uuidv4` — function
- `z.uuidv6` — function
- `z.uuidv7` — function
- `z.url` — function
- `z.httpUrl` — function
- `z.emoji` — function
- `z.nanoid` — function
- `z.cuid` — function: Validates a CUID v1 string.
- `z.cuid2` — function
- `z.ulid` — function
- `z.xid` — function
- `z.ksuid` — function
- `z.ipv4` — function
- `z.mac` — function
- `z.ipv6` — function
- `z.cidrv4` — function
- `z.cidrv6` — function
- `z.base64` — function
- `z.base64url` — function
- `z.e164` — function
- `z.jwt` — function
- `z.stringFormat` — function
- `z.hostname` — function
- `z.hex` — function
- `z.hash` — function
- `z.number` — function
- `z.int` — function
- `z.float32` — function
- `z.float64` — function
- `z.int32` — function
- `z.uint32` — function
- `z.boolean` — function
- `z.bigint` — function
- `z.int64` — function
- `z.uint64` — function
- `z.symbol` — function
- `z.any` — function
- `z.unknown` — function
- `z.never` — function
- `z.date` — function
- `z.array` — function
- `z.keyof` — function
- `z.object` — function
- `z.strictObject` — function
- `z.looseObject` — function
- `z.union` — function
- `z.xor` — function: Creates an exclusive union (XOR) where exactly one option must match.
- `z.discriminatedUnion` — function
- `z.intersection` — function
- `z.tuple` — function
- `z.record` — function
- `z.partialRecord` — function
- `z.looseRecord` — function
- `z.map` — function
- `z.set` — function
- `z.nativeEnum` — function
- `z.literal` — function
- `z.file` — function
- `z.transform` — function
- `z.optional` — function
- `z.exactOptional` — function
- `z.nullable` — function
- `z.nullish` — function
- `z._default` — function
- `z.prefault` — function
- `z.nonoptional` — function
- `z.success` — function
- `z.nan` — function
- `z.pipe` — function
- `z.codec` — function
- `z.invertCodec` — function
- `z.readonly` — function
- `z.templateLiteral` — function
- `z.lazy` — function
- `z.promise` — function
- `z._function` — function
- `z.check` — function
- `z.custom` — function
- `z.refine` — function
- `z.superRefine` — function
- `z.json` — function
- `z.preprocess` — function
- `z.ZodStandardSchemaWithJSON` — type
- `z.ZodType` — interface
- `z._ZodType` — interface
- `z._ZodString` — interface
- `z.ZodString` — interface
- `z.ZodStringFormat` — interface
- `z.ZodEmail` — interface
- `z.ZodGUID` — interface
- `z.ZodUUID` — interface
- `z.ZodURL` — interface
- `z.ZodEmoji` — interface
- `z.ZodNanoID` — interface
- `z.ZodCUID` — interface
- `z.ZodCUID2` — interface
- `z.ZodULID` — interface
- `z.ZodXID` — interface
- `z.ZodKSUID` — interface
- `z.ZodIPv4` — interface
- `z.ZodMAC` — interface
- `z.ZodIPv6` — interface
- `z.ZodCIDRv4` — interface
- `z.ZodCIDRv6` — interface
- `z.ZodBase64` — interface
- `z.ZodBase64URL` — interface
- `z.ZodE164` — interface
- `z.ZodJWT` — interface
- `z.ZodCustomStringFormat` — interface
- `z._ZodNumber` — interface
- `z.ZodNumber` — interface
- `z.ZodNumberFormat` — interface
- `z.ZodInt` — interface
- `z.ZodFloat32` — interface
- `z.ZodFloat64` — interface
- `z.ZodInt32` — interface
- `z.ZodUInt32` — interface
- `z._ZodBoolean` — interface
- `z.ZodBoolean` — interface
- `z._ZodBigInt` — interface
- `z.ZodBigInt` — interface
- `z.ZodBigIntFormat` — interface
- `z.ZodSymbol` — interface
- `z.ZodUndefined` — interface
- `z.undefined` — function
- `z.ZodNull` — interface
- `z.null` — function
- `z.ZodAny` — interface
- `z.ZodUnknown` — interface
- `z.ZodNever` — interface
- `z.ZodVoid` — interface
- `z.void` — function
- `z._ZodDate` — interface
- `z.ZodDate` — interface
- `z.ZodArray` — interface
- `z.SafeExtendShape` — type
- `z.ZodObject` — interface
- `z.ZodUnion` — interface
- `z.ZodXor` — interface
- `z.ZodDiscriminatedUnion` — interface
- `z.ZodIntersection` — interface
- `z.ZodTuple` — interface
- `z.ZodRecord` — interface
- `z.ZodMap` — interface
- `z.ZodSet` — interface
- `z.ZodEnum` — interface
- `z.enum` — function
- `z.ZodLiteral` — interface
- `z.ZodFile` — interface
- `z.ZodTransform` — interface
- `z.ZodOptional` — interface
- `z.ZodExactOptional` — interface
- `z.ZodNullable` — interface
- `z.ZodDefault` — interface
- `z.ZodPrefault` — interface
- `z.ZodNonOptional` — interface
- `z.ZodSuccess` — interface
- `z.ZodCatch` — interface
- `z.catch` — function
- `z.ZodNaN` — interface
- `z.ZodPipe` — interface
- `z.ZodCodec` — interface
- `z.ZodPreprocess` — interface
- `z.ZodReadonly` — interface
- `z.ZodTemplateLiteral` — interface
- `z.ZodLazy` — interface
- `z.ZodPromise` — interface
- `z.ZodFunction` — interface
- `z.function` — function
- `z.ZodCustom` — interface
- `z.describe` — const
- `z.meta` — const
- `z.instanceof` — function
- `z.stringbool` — const
- `z.ZodJSONSchemaInternals` — interface
- `z.ZodJSONSchema` — interface
- `z.lt` — function
- `z.lte` — function
- `z.gt` — function
- `z.gte` — function
- `z.positive` — function
- `z.negative` — function
- `z.nonpositive` — function
- `z.nonnegative` — function
- `z.multipleOf` — function
- `z.maxSize` — function
- `z.minSize` — function
- `z.size` — function
- `z.maxLength` — function
- `z.minLength` — function
- `z.length` — function
- `z.regex` — function
- `z.lowercase` — function
- `z.uppercase` — function
- `z.includes` — function
- `z.startsWith` — function
- `z.endsWith` — function
- `z.property` — function
- `z.mime` — function
- `z.overwrite` — function
- `z.normalize` — function
- `z.trim` — function
- `z.toLowerCase` — function
- `z.toUpperCase` — function
- `z.slugify` — function
- `z.RefinementCtx` — interface
- `z.ZodIssue` — type
- `z.ZodError` — interface: An Error-like class used to store Zod validation issues.
- `z.ZodRealError` — const
- `z.ZodFlattenedError` — type
- `z.ZodFormattedError` — type
- `z.ZodErrorMap` — interface
- `z.IssueData` — type
- `z.ZodSafeParseResult` — type
- `z.ZodSafeParseSuccess` — type
- `z.ZodSafeParseError` — type
- `z.parse` — const
- `z.parseAsync` — const
- `z.safeParse` — const
- `z.safeParseAsync` — const
- `z.encode` — const
- `z.decode` — const
- `z.encodeAsync` — const
- `z.decodeAsync` — const
- `z.safeEncode` — const
- `z.safeDecode` — const
- `z.safeEncodeAsync` — const
- `z.safeDecodeAsync` — const
- `z.setErrorMap` — function
- `z.getErrorMap` — function
- `z.TypeOf` — type
- `z.Infer` — type
- `z.ZodFirstPartySchemaTypes` — type
- `z.ZodIssueCode` — const
- `z.inferFlattenedErrors` — type
- `z.inferFormattedError` — type
- `z.BRAND` — type: Use `z.$brand` instead
- `z.ZodTypeAny` — interface
- `z.ZodSchema` — interface
- `z.Schema` — interface
- `z.ZodRawShape` — type: Included for Zod 3 compatibility
- `z.ZodFirstPartyTypeKind` — enum

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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual status-page screens/flows, and check every
box off one by one. A box you can't check is an integration bug to fix — not
a skip. Verify BEHAVIOR and the public/admin split, not just that CRUD
compiles:
- [ ] The PUBLIC status page renders every monitored service (component)
  with its current status and an OVERALL banner that is DERIVED, never
  hardcoded: GET /status returns `operational` when no enabled service's
  latest `check` is `down` or `degraded` ("All systems operational"), `down`
  if ANY latest check is `down`, else `degraded` if any is `degraded` — the
  banner reflects the WORST service, and a service with no check reads
  `unknown` (which never turns the banner red). GET /status/services lists
  each service with its latest check.
- [ ] An admin creating an INCIDENT (POST /status/incidents with serviceId,
  title, severity minor|major|critical, status `investigating`, startedAt)
  persists it and it shows on the public GET /status/incidents. The affected
  service reads down/degraded on the page because its latest `check` says so
  (checks are monitor-written, never typed in), so the overall banner goes
  non-green while the incident is open.
- [ ] Updating the incident (PATCH /status/incidents/:id) advances its
  timeline through the real lifecycle investigating -> identified ->
  monitoring -> resolved (bumping updatedAt), and each stage shows on the
  public page. Marking it `resolved` (with resolvedAt) moves it to history —
  the public list filtered `?status=resolved` includes it while the active
  incidents drop it — and once the affected service's latest check returns
  to `up`, GET /status recovers to "All systems operational" (the banner
  tracks live check state, so a still-down check keeps it red).
- [ ] AUTHORIZATION — reads are PUBLIC: with NO session, every GET (/status,
  /status/services, /status/services/:id, /status/incidents, /status/uptime)
  returns 200 — the status page is meant to be seen without signing in.
- [ ] AUTHORIZATION — writes are ADMIN-ONLY, deny by default: every mutation
  (POST/PATCH/DELETE /status/services(/:id), POST/PATCH
  /status/incidents(/:id)) is refused for an anonymous caller (401) and for
  a normal signed-in user with no admin claim / `manage status` grant (403),
  and nothing changes — enforced twice (the `requireAdmin` route middleware
  AND the in-handler `isStatusAdmin` re-check). A non-admin has NO path to
  fabricate an outage, delete a service, or post a fake incident, and no
  endpoint sets a service up/down at all (that is monitor-written).
