# @molecule/api-resource-status

Status page resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-status
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

Route array for status page endpoints: public read routes and authenticated admin routes.

```typescript
const routes: ({ method: "get"; path: string; middlewares: never[]; handler: string; } | { method: "post"; path: string; middlewares: string[]; handler: string; } | { method: "patch"; path: string; middlewares: string[]; handler: string; } | { method: "delete"; path: string; middlewares: string[]; handler: string; })[]
```

#### `servicePropsSchema`

Full schema for a monitored service.

```typescript
const servicePropsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; name: z.ZodString; url: z.ZodString; method: z.ZodDefault<z.ZodEnum<{ GET: "GET"; HEAD: "HEAD"; POST: "POST"; }>>; expectedStatus: z.ZodDefault<z.ZodNumber>; timeoutMs: z.ZodDefault<z.ZodNumber>; intervalMs: z.ZodDefault<z.ZodNumber>; groupName: z.ZodOptional<z.ZodString>; enabled: z.ZodDefault<z.ZodBoolean>; }, z.core.$strip>
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
- `@molecule/api-locales-status` ^1.0.0
- `@molecule/api-monitoring` ^1.0.0
- `@molecule/api-notifications` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-scheduler` ^1.0.0
