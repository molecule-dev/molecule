# @molecule/api-resource-user

The `user` resource types, schema, and definition.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-user
```

## API

### Types

#### `CreateOAuthProps`

Create O Auth Props type.

```typescript
type CreateOAuthProps = z.infer<typeof createOAuthPropsSchema>
```

#### `CreateProps`

Create Props type.

```typescript
type CreateProps = z.infer<typeof createPropsSchema>
```

#### `CreateSecretProps`

Create Secret Props type.

```typescript
type CreateSecretProps = z.infer<typeof createSecretPropsSchema>
```

#### `Props`

User props type inferred from schema.

```typescript
type Props = z.infer<typeof propsSchema>
```

#### `SecretProps`

Secret Props type.

```typescript
type SecretProps = z.infer<typeof secretPropsSchema>
```

#### `Session`

User session data (userId, email, role, permissions, metadata) inferred from sessionSchema.

```typescript
type Session = z.infer<typeof sessionSchema>
```

#### `UpdatePasswordSecretProps`

Update Password Secret Props type.

```typescript
type UpdatePasswordSecretProps = z.infer<typeof updatePasswordSecretPropsSchema>
```

#### `UpdatePlanProps`

Update Plan Props type.

```typescript
type UpdatePlanProps = z.infer<typeof updatePlanPropsSchema>
```

#### `UpdateProps`

Update Props type.

```typescript
type UpdateProps = z.infer<typeof updatePropsSchema>
```

#### `VerifyTwoFactorProps`

Verify Two Factor Props type.

```typescript
type VerifyTwoFactorProps = z.infer<typeof verifyTwoFactorPropsSchema>
```

#### `VerifyTwoFactorSecretProps`

Verify Two Factor Secret Props type.

```typescript
type VerifyTwoFactorSecretProps = z.infer<typeof verifyTwoFactorSecretPropsSchema>
```

### Functions

#### `createRequestHandlerMap(createRequestHandler)`

Creates the full request handler map for the User resource.
Optional features (OAuth, payments) are conditionally included
based on bonded providers.

Handler names match the route definitions in routes.ts.

```typescript
function createRequestHandlerMap(createRequestHandler: (handler: Handler) => (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>): Record<string, MoleculeRequestHandler>
```

- `createRequestHandler` — Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.

**Returns:** A record mapping handler names (matching route definitions) to Express middleware functions.

#### `createResource(options, options, options)`

Creates a user resource definition with optional OAuth servers and plan keys.

```typescript
function createResource(options?: { oauthServers?: OAuthServers; planKeys?: PlanKeys; }): types.Resource<unknown>
```

- `options` — Optional configuration.
- `options` — .oauthServers - Tuple of allowed OAuth server names (e.g. `['google', 'github']`). Constrains the `oauthServer` schema field.
- `options` — .planKeys - Tuple of allowed plan key strings (e.g. `['free', 'pro']`). Constrains the `planKey` schema field.

**Returns:** A `Resource` with name `'User'`, table `'users'`, and a Zod schema reflecting the options.

#### `createSchema(options, options, options)`

Creates a full schema for user props.

OAuth servers and plan keys can be constrained by passing them as options.

```typescript
function createSchema(options?: { oauthServers?: OAuthServers; planKeys?: PlanKeys; }): z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodEmail>>; twoFactorEnabled: z.ZodOptional<z.ZodBoolean>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{ [k in keyof { [k in NonNullable<OAuthServers>[number]]: k; }]: { [k in NonNullable<OAuthServers>[number]]: k; }[k]; }>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; planKey: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{ [k in keyof { [k in NonNullable<PlanKeys>[number]]: k; }]: { [k in NonNullable<PlanKeys>[number]]: k; }[k]; }>>; planExpiresAt: z.ZodOptional<z.ZodString>; planAutoRenews: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

- `options` — Optional configuration.
- `options` — .oauthServers - Tuple of allowed OAuth server names. Constrains `oauthServer` to a Zod enum.
- `options` — .planKeys - Tuple of allowed plan key strings. Constrains `planKey` to a Zod enum.

**Returns:** A Zod object schema extending `basePropsSchema` with user-specific fields (username, email, OAuth, plan).

### Constants

#### `createOAuthPropsSchema`

Schema for creating a user via OAuth.

```typescript
const createOAuthPropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodEmail>>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
```

#### `createPropsSchema`

Schema for creating a user via password. Email is required as the primary identity.

```typescript
const createPropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodEmail; }, z.core.$strip>
```

#### `createSecretPropsSchema`

Schema for creating secret props (password hash only).

```typescript
const createSecretPropsSchema: z.ZodObject<{ passwordHash: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `propsSchema`

Default schema for user props.

```typescript
const propsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodEmail>>; twoFactorEnabled: z.ZodOptional<z.ZodBoolean>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; planKey: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; planExpiresAt: z.ZodOptional<z.ZodString>; planAutoRenews: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `resource`

Default user resource definition.

```typescript
const resource: types.Resource<unknown>
```

#### `routes`

Route definitions for the User resource.
Routes marked optional require additional packages to be installed.

Declarative route definitions used by the injection engine.

```typescript
const routes: ({ method: "post"; path: string; middlewares: never[]; handler: string; optional: string; } | { method: "get"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "patch"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "delete"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "post"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "get"; path: string; middlewares: never[]; handler: string; optional: string; })[]
```

#### `secretPropsSchema`

Secret properties stored in a separate table.

```typescript
const secretPropsSchema: z.ZodObject<{ id: z.ZodString; passwordHash: z.ZodOptional<z.ZodString>; passwordResetToken: z.ZodOptional<z.ZodString>; passwordResetTokenAt: z.ZodOptional<z.ZodString>; pendingTwoFactorSecret: z.ZodOptional<z.ZodString>; twoFactorSecret: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `sessionSchema`

Zod schema for JWT session payloads (userId, deviceId, optional OAuth fields).

```typescript
const sessionSchema: z.ZodObject<{ id: z.ZodOptional<z.ZodString>; userId: z.ZodString; deviceId: z.ZodString; oauthServer: z.ZodOptional<z.ZodString>; oauthId: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `updatePasswordSecretPropsSchema`

Schema for updating password secret props (partial password hash).

```typescript
const updatePasswordSecretPropsSchema: z.ZodObject<{ passwordHash: z.ZodOptional<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
```

#### `updatePlanPropsSchema`

Schema for updating a user's plan (partial planKey, planExpiresAt, planAutoRenews).

```typescript
const updatePlanPropsSchema: z.ZodObject<{ planKey: z.ZodOptional<z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>>; planExpiresAt: z.ZodOptional<z.ZodOptional<z.ZodString>>; planAutoRenews: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; }, z.core.$strip>
```

#### `updatePropsSchema`

Schema for updating a user (partial username, name, email).

```typescript
const updatePropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodOptional<z.ZodString>>; name: z.ZodOptional<z.ZodOptional<z.ZodString>>; email: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEmail>>>; }, z.core.$strip>
```

#### `verifyTwoFactorPropsSchema`

Schema for verifying two-factor authentication.

```typescript
const verifyTwoFactorPropsSchema: z.ZodObject<{ twoFactorEnabled: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; }, z.core.$strip>
```

#### `verifyTwoFactorSecretPropsSchema`

Schema for two-factor secret props.

```typescript
const verifyTwoFactorSecretPropsSchema: z.ZodObject<{ pendingTwoFactorSecret: z.ZodOptional<z.ZodOptional<z.ZodString>>; twoFactorSecret: z.ZodOptional<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
```

### Namespaces

#### `authorization`

#### `authorizers`

#### `handlers`

#### `types`

#### `utilities`

#### `z`

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-config` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-jwt` ^1.0.0
- `@molecule/api-locales-user` ^1.0.0
- `@molecule/api-locales-user-payments` ^1.0.0
- `@molecule/api-password` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-two-factor` ^1.0.0

### Environment Variables

- `JWT_PRIVATE_KEY` *(required)*
- `JWT_PUBLIC_KEY` *(required)*
