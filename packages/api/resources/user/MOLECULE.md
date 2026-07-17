# @molecule/api-resource-user

The `user` resource types, schema, and definition.

## Quick Start

```ts
// Extend safely: a display field in Props, a secret in SecretProps.
//   propsSchema:       { …, timezone: z.string().optional() }           // safe → client
//   secretPropsSchema: { …, passwordResetToken: z.string().optional() } // server-only, secrets table

// A custom handler returns SAFE props — never the secrets row.
router.get('/me/timezone', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: 'Authentication required.' })
  const user = await findById('users', userId) // the users table holds Props only
  res.json({ timezone: user?.timezone })        // never spread a secrets-table row here
})
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-user @molecule/api-bond @molecule/api-config @molecule/api-database @molecule/api-entitlements @molecule/api-i18n @molecule/api-jwt @molecule/api-locales-user @molecule/api-locales-user-payments @molecule/api-password @molecule/api-payments @molecule/api-push-notifications @molecule/api-rate-limit @molecule/api-resource @molecule/api-resource-device @molecule/api-secrets @molecule/api-two-factor zod
```

## API

### Interfaces

#### `UserRequestHandlerMap`

Shape of the user request-handler map produced by `createRequestHandlerMap`.
Names match the route definitions in `routes.ts`. Exported so helpers that
accept the map (e.g. `mountDefaultUserAuthRoutes`, `mountDefaultUserCrudRoutes`)
can type their parameter precisely instead of widening to
`Record<string, MoleculeRequestHandler>`.

```typescript
interface UserRequestHandlerMap {
  auth: MoleculeRequestHandler
  authSelf: MoleculeRequestHandler
  rateLimitAuth: MoleculeRequestHandler
  rateLimitTwoFactor: MoleculeRequestHandler
  create: MoleculeRequestHandler
  logIn: MoleculeRequestHandler
  oauthAuthorize: MoleculeRequestHandler
  logInOAuth: MoleculeRequestHandler
  logout: MoleculeRequestHandler
  read: MoleculeRequestHandler
  readSelf: MoleculeRequestHandler
  update: MoleculeRequestHandler
  del: MoleculeRequestHandler
  updatePassword: MoleculeRequestHandler
  forgotPassword: MoleculeRequestHandler
  resetPassword: MoleculeRequestHandler
  verifyTwoFactor: MoleculeRequestHandler
  updatePlan: MoleculeRequestHandler
  verifyPayment: MoleculeRequestHandler
  handlePaymentNotification: MoleculeRequestHandler
  requireWebhookAuthenticity: MoleculeRequestHandler
}
```

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
function createRequestHandlerMap(createRequestHandler: (handler: Handler) => (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>): UserRequestHandlerMap
```

- `createRequestHandler` — Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.

**Returns:** A `UserRequestHandlerMap` of handler names to Express middleware.

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
function createSchema(options?: { oauthServers?: OAuthServers; planKeys?: PlanKeys; }): z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodString>>; emailVerified: z.ZodOptional<z.ZodBoolean>; avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>; bio: z.ZodOptional<z.ZodNullable<z.ZodString>>; twoFactorEnabled: z.ZodOptional<z.ZodBoolean>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{ [k in keyof { [k in NonNullable<OAuthServers>[number]]: k; }]: { [k in NonNullable<OAuthServers>[number]]: k; }[k]; }>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; planKey: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{ [k in keyof { [k in NonNullable<PlanKeys>[number]]: k; }]: { [k in NonNullable<PlanKeys>[number]]: k; }[k]; }>>; planExpiresAt: z.ZodOptional<z.ZodString>; planAutoRenews: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

- `options` — Optional configuration.
- `options` — .oauthServers - Tuple of allowed OAuth server names. Constrains `oauthServer` to a Zod enum.
- `options` — .planKeys - Tuple of allowed plan key strings. Constrains `planKey` to a Zod enum.

**Returns:** A Zod object schema extending `basePropsSchema` with user-specific fields (username, email, OAuth, plan).

### Constants

#### `createOAuthPropsSchema`

Schema for creating a user via OAuth.

```typescript
const createOAuthPropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodString>>; emailVerified: z.ZodOptional<z.ZodBoolean>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
```

#### `createPropsSchema`

Schema for creating a user via password.

```typescript
const createPropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
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

#### `MAX_AVATAR_LENGTH`

Maximum length (in characters) of a user's `avatar`. Sized to permit a small
inline data-URI (~256KB) without requiring an external upload/storage bond.
Larger avatars must be hosted elsewhere and referenced by URL.

```typescript
const MAX_AVATAR_LENGTH: number
```

#### `MAX_BIO_LENGTH`

Maximum length (in characters) of a user's `bio`.

```typescript
const MAX_BIO_LENGTH: 1000
```

#### `propsSchema`

Default schema for user props.

```typescript
const propsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; username: z.ZodOptional<z.ZodString>; name: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodNullable<z.ZodString>>; emailVerified: z.ZodOptional<z.ZodBoolean>; avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>; bio: z.ZodOptional<z.ZodNullable<z.ZodString>>; twoFactorEnabled: z.ZodOptional<z.ZodBoolean>; oauthServer: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; oauthId: z.ZodOptional<z.ZodString>; oauthData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; planKey: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodEnum<{}>>; planExpiresAt: z.ZodOptional<z.ZodString>; planAutoRenews: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `resource`

Default user resource definition.

```typescript
const resource: types.Resource<unknown>
```

#### `resourceUserSecretDefinitions`

Secret definitions required by the user resource.

```typescript
const resourceUserSecretDefinitions: SecretDefinition[]
```

#### `routes`

Route definitions for the User resource.
Routes marked optional require additional packages to be installed.

Declarative route definitions used by the injection engine.

```typescript
const routes: ({ method: "post"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "get"; path: string; middlewares: string[]; handler: string; optional: string; } | { method: "post"; path: string; middlewares: string[]; handler: string; optional: string; } | { method: "get"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "patch"; path: string; middlewares: string[]; handler: string; optional?: undefined; } | { method: "delete"; path: string; middlewares: string[]; handler: string; optional?: undefined; })[]
```

#### `secretPropsSchema`

Secret properties stored in a separate table.

```typescript
const secretPropsSchema: z.ZodObject<{ id: z.ZodString; passwordHash: z.ZodOptional<z.ZodString>; passwordResetToken: z.ZodOptional<z.ZodString>; passwordResetTokenAt: z.ZodOptional<z.ZodString>; pendingTwoFactorSecret: z.ZodOptional<z.ZodString>; twoFactorSecret: z.ZodOptional<z.ZodString>; lastTwoFactorTimeStep: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
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

Schema for updating a user (partial username, name, email, avatar, bio).

```typescript
const updatePropsSchema: z.ZodObject<{ username: z.ZodOptional<z.ZodOptional<z.ZodString>>; name: z.ZodOptional<z.ZodOptional<z.ZodString>>; email: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; avatar: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; bio: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; }, z.core.$strip>
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

Members:

- `authorization.getAuthCookieName` — function: Resolve the actual cookie name for an auth cookie.
- `authorization.getAuthCookieOptions` — function: Base cookie attributes shared by EVERY auth cookie this resource sets and
- `authorization.invalidateDeviceExistsCache` — function: Evict a single device's positive entry from the device-exists cache so the
- `authorization.invalidateAllDeviceExistsCache` — function: Evict ALL positive entries from the device-exists cache.
- `authorization.set` — function: Set authorization headers and cookie for a session.
- `authorization.verifyMiddleware` — function: Middleware that verifies the JWT token from the `Authorization` header and sets `res.locals.session`.

#### `authorizers`

Members:

- `authorizers.auth` — function: Middleware that checks if the request has an authenticated session (`res.locals.session.userId`).
- `authorizers.authSelf` — function: Middleware that checks if the authenticated user's ID matches the `:id` route parameter.
- `authorizers.RateLimitAuthOptions` — interface: Configuration for {@link rateLimit}.
- `authorizers.rateLimit` — function: Creates an authorizer middleware that brute-force-protects an auth endpoint.
- `authorizers.loginAccountKey` — function: Account-identifier extractor for the login endpoint: the submitted username
- `authorizers.emailAccountKey` — function: Account-identifier extractor for the forgot-password endpoint: the submitted
- `authorizers.paramIdAccountKey` — function: Account-identifier extractor for the verify-two-factor endpoint: the target
- `authorizers.requireWebhookAuthenticity` — function: Middleware guarding the public `POST /users/payment-notification/:provider`

#### `handlers`

Members:

- `handlers.handlePaymentNotification` — function: Generic payment notification handler that works with any bonded PaymentProvider. Reads the
- `handlers.verifyPayment` — function: Generic payment verification handler that works with any bonded PaymentProvider. Reads the
- `handlers.CreateRequest` — interface: Request body for user creation, including password and optional device name.
- `handlers.create` — function: Creates a user with username and password. Validates username uniqueness and email format,
- `handlers.del` — function: Deletes a user and their associated data. Removes secrets from the secrets table,
- `handlers.ForgotPasswordRequest` — interface: Request body for password reset initiation.
- `handlers.forgotPassword` — function: Generates a UUID password reset token, stores it in the secrets table, and sends a reset
- `handlers.LogInRequest` — interface: Request body for user login, supporting password, reset token, and 2FA flows.
- `handlers.logIn` — function: Logs in a user by username or email. Supports password authentication, password reset token
- `handlers.LogInOAuthRequest` — interface: Request body for OAuth login, including the OAuth server name, authorization code, and PKCE verifier.
- `handlers.logInOAuth` — function: Logs in or creates a user via OAuth. Verifies the authorization code with the bonded OAuth
- `handlers.logout` — function: Logs the current user out. Revokes the session device server-side (so the JWT
- `handlers.oauthAuthorize` — function: OAuth initiation — `GET /users/oauth/:provider`.
- `handlers.read` — function: Reads a user by ID from the database. Attaches plan info (with expiration/renewal status) via the
- `handlers.readSelf` — function: Reads the AUTHENTICATED user from the session — no `:id` param. Backs
- `handlers.ResetPasswordRequest` — interface: Request body for confirming a password reset using a token.
- `handlers.resetPassword` — function: Confirms a password reset by validating the one-time token previously generated by
- `handlers.update` — function: Updates a user's profile fields (username, name, email). Validates username format
- `handlers.UpdatePasswordRequest` — interface: Request body for password update, with current password verification and new password.
- `handlers.updatePassword` — function: Updates a user's password. If the user already has a password hash, the current password
- `handlers.UpdatePlanRequest` — interface: Request body for plan update, containing the target plan key.
- `handlers.updatePlan` — function: Updates a user's subscription plan. Uses the bonded PlanService to look up plan metadata and
- `handlers.VerifyTwoFactorRequest` — interface: Request body for two-factor authentication operations (setup, enable, or disable).
- `handlers.verifyTwoFactor` — function: Handles two-factor authentication lifecycle via `@molecule/api-two-factor`:

#### `types`

Members:

- `types.CreateOAuthProps` — type: Create O Auth Props type.
- `types.CreateProps` — type: Create Props type.
- `types.CreateSecretProps` — type: Create Secret Props type.
- `types.Props` — type: User props type inferred from schema.
- `types.SecretProps` — type: Secret Props type.
- `types.Session` — type: User session data (userId, email, role, permissions, metadata) inferred from sessionSchema.
- `types.UpdatePasswordSecretProps` — type: Update Password Secret Props type.
- `types.UpdatePlanProps` — type: Update Plan Props type.
- `types.UpdateProps` — type: Update Props type.
- `types.VerifyTwoFactorProps` — type: Verify Two Factor Props type.
- `types.VerifyTwoFactorSecretProps` — type: Verify Two Factor Secret Props type.
- `types.Resource` — type: An object describing the `user` resource.

#### `utilities`

Members:

- `utilities.getPlan` — function: Get a user's current plan info.
- `utilities.invalidateEntitlementsCache` — function: Invalidates the entitlements plan-key cache for a user after their plan
- `utilities.invalidateEntitlementsCacheSafe` — function: Fire-and-forget variant of {@link invalidateEntitlementsCache} for call
- `utilities.normalizeEmail` — function: Normalizes an email address for storage and lookup so case/whitespace
- `utilities.notify` — function: Sends push notifications to all of a user's devices except the current one. Retrieves devices

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
- `@molecule/api-config` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-entitlements` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-jwt` ^1.0.0
- `@molecule/api-locales-user` ^1.0.0
- `@molecule/api-locales-user-payments` ^1.0.0
- `@molecule/api-password` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0
- `@molecule/api-rate-limit` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-resource-device` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-two-factor` ^1.0.0

### Environment Variables

- `JWT_PRIVATE_KEY` *(required)* — JWT signing key (RSA private)
  - **Auto-generated at scaffold — no manual setup.**
- `JWT_PUBLIC_KEY` *(required)* — JWT verification key (RSA public)
  - **Auto-generated at scaffold — no manual setup.**

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-config`
- `@molecule/api-database`
- `@molecule/api-entitlements`
- `@molecule/api-i18n`
- `@molecule/api-jwt`
- `@molecule/api-locales-user`
- `@molecule/api-locales-user-payments`
- `@molecule/api-password`
- `@molecule/api-payments`
- `@molecule/api-push-notifications`
- `@molecule/api-rate-limit`
- `@molecule/api-resource`
- `@molecule/api-resource-device`
- `@molecule/api-secrets`
- `@molecule/api-two-factor`
- `zod`

The user record is split across TWO schemas — pick the right one or you leak credentials:
- **{@link Props} (`propsSchema`)** — SAFE, client-facing fields (username, name, email,
  `emailVerified`, `twoFactorEnabled`, plan). This is what handlers return and what lives
  in the `users` table.
- **{@link SecretProps} (`secretPropsSchema`)** — SERVER-ONLY secrets: `passwordHash`, the
  TOTP `twoFactorSecret` (and its pending-setup value). Stored in a SEPARATE secrets table
  and NEVER serialized to the client. Note the pair `twoFactorEnabled` (safe boolean, in
  `Props`) vs `twoFactorSecret` (secret, in `SecretProps`).

When you extend the user, put a secret (token, hash, key, provider refresh token) in
`SecretProps`; put a display field in `Props`. **Never add a secret to `Props`, never
return a secrets-table value in a response or log, and never `res.json(userRow)` a raw DB
row** — return `Props`.

Auth is ALREADY wired globally (the router's `verifyMiddleware` → `res.locals.session`),
so a handler reads the current user with `getUserId(res)` and does NOT add per-route auth
middleware (see the `auth` skill). Scope every custom user query by the authenticated id.

On the CLIENT, the bearer token is held IN MEMORY only — a `localStorage` copy is
XSS-exfiltratable and is forbidden. The session is restored after a reload via the
httpOnly cookie + `GET /users/me`; don't persist the token yourself.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A new user can sign up with email + password and lands authenticated (the
  UI reflects the signed-in user, e.g. their name/menu appears).
- [ ] Any flow that emails a link/code (signup verification, password reset)
  round-trips: the sandbox CAPTURES the message instead of sending — read it
  with the `read_activity` tool (filter type 'email') and follow the link/code
  in its payload; never mock the flow or modify production code to expose it.
- [ ] Logging out and logging back in with the same credentials reaches the same
  account and its data.
- [ ] The session survives a full page reload (restored via the httpOnly cookie +
  `GET /users/me` — never from a token persisted in localStorage).
- [ ] A wrong password shows a visible error and does NOT authenticate.
- [ ] Authenticated-only screens are unreachable when logged out (redirect to
  login or an explicit denial — never a blank page).
- [ ] A profile/account edit (e.g. display name) persists across a reload.
