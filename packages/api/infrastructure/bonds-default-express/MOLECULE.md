# @molecule/api-bonds-default-express

`@molecule/api-bonds-default-express` — default API bond wirings and
shared route/handler plumbing for Express-based apps.

Two halves:

1. **`setup<Name>()` bond wirings** (40+): one function per default
   provider (`setupConfigEnv`, `setupDatabasePostgresql`,
   `setupJwtJsonwebtoken`, `setupEmailsMailgun`, `setupUploadsS3`,
   `setupRealtimeSocketio`, `setupAiAnthropic`, …) so per-app
   `api/src/bonds/<name>.ts` files are 1-line re-exports and
   `bonds/index.ts` just calls them in order.
2. **Shared Express plumbing**: `createBillingRouter` (the fleet's
   Stripe billing endpoints), the `mountDefaultUserAuthRoutes` /
   `mountDefaultDeviceRoutes` / other `mountDefault*Routes` helpers,
   handler guards (`requireAuth`, `requireUser`, `requireOwnership`,
   `getUserId`, `validationError`, `internalError`), zod param schemas,
   `trackAuthEvent`, and a `createMigrator` re-export.

## Quick Start

```typescript
// api/src/bonds/index.ts — wire defaults at startup, then validate:
import { validateBonds } from '@molecule/api-bond'
import {
  setupConfigEnv,
  setupDatabasePostgresql,
  setupEmailsMailgun,
  setupJwtJsonwebtoken,
  setupSecretsEnv,
} from '@molecule/api-bonds-default-express'

async function setupBonds(): Promise<void> {
  setupConfigEnv()
  setupSecretsEnv()
  setupDatabasePostgresql()
  setupJwtJsonwebtoken()
  setupEmailsMailgun()
  validateBonds()
}
```

```typescript
// api/src/routes/billing.ts — the fleet-standard billing endpoints
// (POST /checkout, POST /cancel, GET /status, GET /tiers), mounted by
// the app router at /billing (the real file default-exports the router):
import { createBillingRouter } from '@molecule/api-bonds-default-express'

// Your app owns these (typically in api/src/tiers.ts):
interface AppLimits { seats: number }
const getPricingTiers = () => []       // your tiers, each with a stripePriceId + limits
const appPlanKeys = { free: 'free', pro: 'pro' }

const billingRouter = createBillingRouter<AppLimits>({
  getPricingTiers,
  planKeys: appPlanKeys,
})
```

## Type
`feature`

## Installation
```bash
npm install @molecule/api-bonds-default-express @molecule/api-ai-anthropic @molecule/api-ai-embeddings @molecule/api-ai-embeddings-openai @molecule/api-ai-openai @molecule/api-ai-speech @molecule/api-ai-speech-openai @molecule/api-ai-vector-store @molecule/api-ai-vector-store-pgvector @molecule/api-analytics @molecule/api-audit @molecule/api-audit-database @molecule/api-bond @molecule/api-cache @molecule/api-cache-memory @molecule/api-cache-redis @molecule/api-config @molecule/api-config-env @molecule/api-cron @molecule/api-cron-node-cron @molecule/api-database @molecule/api-database-postgresql @molecule/api-emails @molecule/api-emails-capture @molecule/api-emails-mailgun @molecule/api-encryption @molecule/api-encryption-aes @molecule/api-entitlements @molecule/api-error-tracking @molecule/api-error-tracking-console @molecule/api-error-tracking-sentry @molecule/api-geolocation @molecule/api-geolocation-google @molecule/api-geolocation-mapbox @molecule/api-geolocation-nominatim @molecule/api-http @molecule/api-http-fetch @molecule/api-i18n @molecule/api-image @molecule/api-image-sharp @molecule/api-import-export @molecule/api-import-export-csv @molecule/api-jwt @molecule/api-jwt-jsonwebtoken @molecule/api-logger @molecule/api-media-streaming @molecule/api-media-streaming-hls @molecule/api-middleware-body-parser @molecule/api-middleware-body-parser-express @molecule/api-middleware-cookie-parser @molecule/api-middleware-cookie-parser-express @molecule/api-middleware-cors @molecule/api-middleware-cors-express @molecule/api-middleware-validation @molecule/api-notifications-webhook @molecule/api-password @molecule/api-password-bcrypt @molecule/api-payments @molecule/api-payments-stripe @molecule/api-pdf @molecule/api-pdf-pdfkit @molecule/api-permissions @molecule/api-permissions-custom @molecule/api-push-capture @molecule/api-push-notifications @molecule/api-push-notifications-web-push @molecule/api-queue @molecule/api-queue-memory @molecule/api-queue-redis @molecule/api-rate-limit @molecule/api-rate-limit-memory @molecule/api-realtime @molecule/api-realtime-socketio @molecule/api-realtime-sse @molecule/api-realtime-ws @molecule/api-reporting @molecule/api-reporting-database @molecule/api-resource @molecule/api-resource-device @molecule/api-resource-payment @molecule/api-resource-user @molecule/api-search @molecule/api-search-meilisearch @molecule/api-search-postgres @molecule/api-secrets @molecule/api-secrets-env @molecule/api-two-factor @molecule/api-two-factor-otplib @molecule/api-uploads @molecule/api-uploads-filesystem @molecule/api-uploads-s3 @molecule/api-webhook @molecule/api-webhook-http @molecule/api-workflow @molecule/api-workflow-database
```

## API

### Types

#### `AuthzResult`

Result of an ownership check. `ok: true` carries the resolved row;
`ok: false` carries the HTTP status the handler should return —
always 404 to avoid leaking row existence to non-owners (the
"no IDOR" rule).

```typescript
type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }
```

### Functions

#### `createBillingRouter(opts)`

Factory for the default billing router. The router exposes four
endpoints: `POST /checkout`, `POST /cancel`, `GET /status`, `GET /tiers`.

```typescript
function createBillingRouter(opts: { getPricingTiers: () => ReadonlyArray<PricingTier>; planKeys: { free: string; } & Record<string, string>; }): Router
```

#### `createMigrator(migrationsDir)`

Returns a `runMigrations()` function bound to the given directory.

```typescript
function createMigrator(migrationsDir: string): () => Promise<void>
```

- `migrationsDir` — Absolute path to the directory containing ordered `*.sql` migration files. Resolve via `join(new URL('.', import.meta.url).pathname, '../../migrations')` from the app's `scripts/migrate.ts`.

**Returns:** A no-arg `runMigrations()` that creates the database (if missing) and applies every migration file in lexical order.

#### `getParamId(req, name?)`

Read a route param as a string, defending against the Express
type union `string | string[]` (multi-value when the same param
key appears more than once). Defaults to `'id'`.

```typescript
function getParamId(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, name?: string): string
```

#### `getUserId(res)`

Read the JWT session userId off `res.locals.session`. Returns null
when there is no session (the auth middleware never ran, or the
request is unauthenticated).

```typescript
function getUserId(res: Response<any, Record<string, any>>): string | null
```

#### `internalError(res, error?)`

Standard 500 response that logs the underlying cause before responding
with a generic message. Always pass the original error so silent
catches don't ship to prod under green tests.

```typescript
function internalError(res: Response<any, Record<string, any>>, error?: unknown): void
```

#### `mountDefaultDeviceRoutes(router, device)`

Mounts the standard device routes:

- `GET /devices/push/public-key` (public — the VAPID public key browsers
  need for `pushManager.subscribe({ applicationServerKey })`; bond-gated
  404/503 when no push provider is bonded/configured)
- `GET /devices` (auth+query)
- `GET /devices/:id` (authUser+read)
- `PATCH /devices/:id` (authUser+update)
- `DELETE /devices/:id` (authUser+del)

```typescript
function mountDefaultDeviceRoutes(router: Router, device: DeviceRequestHandlerMap): void
```

#### `mountDefaultUserAuthRoutes(router, user)`

Mounts the public auth endpoints:

- `POST /users` (create)
- `POST /users/log-in` (rateLimitAuth + logIn)
- `POST /users/forgot-password` (rateLimitAuth + forgotPassword)

The credential-bearing routes are fronted by `user.rateLimitAuth` — the
default IP+account brute-force throttle from `@molecule/api-resource-user` —
so generated apps are not left with unthrottled password / TOTP-via-login
guessing. The limiter degrades open (logs a warning) when no rate-limit
provider is bonded, so apps that opt out still boot.

```typescript
function mountDefaultUserAuthRoutes(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserBillingRoutes(router, user)`

Mounts plan/billing routes:

- `PATCH /users/:id/plan` (authSelf+updatePlan)
- `POST /users/payment-notification/:provider` (requireWebhookAuthenticity+handlePaymentNotification)

The notification route is public (providers POST to it), so it is gated by
`requireWebhookAuthenticity`: signature-verifying webhook providers (Stripe)
pass through, while unsigned server-to-server providers (Apple/Google) require
a shared secret — the endpoint is not open by default.

```typescript
function mountDefaultUserBillingRoutes(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserCrudRoutes(router, user)`

Mounts the authed-self user CRUD routes:

- `GET /users/me` (auth+readSelf) — session restore; MUST precede `/users/:id`
- `GET /users/:id` (authSelf+read)
- `PATCH /users/:id` (authSelf+update)
- `DELETE /users/:id` (authSelf+del)

```typescript
function mountDefaultUserCrudRoutes(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserOAuthLoginRoute(router, user)`

Optional OAuth routes — BOTH halves of the flow:

- `GET /users/oauth/:provider` (rateLimitAuth + oauthAuthorize) —
  initiation: sets the CSRF `oauth_state` + PKCE `oauth_verifier` httpOnly
  cookies and 302-redirects to the bonded provider's authorization URL.
  Without this half the state cookie `logInOAuth` validates is never set,
  so every callback fails 403 (this is exactly how the generated-app fleet
  shipped an exchange endpoint with no way to start the dance). The GET
  carries the same `rateLimitAuth` throttle as the POST: it has no body, so
  only the generous per-IP bucket applies — an abuse ceiling on cookie-mint/
  redirect flooding that a legitimate login (one GET + one POST) never
  approaches. A trip is a 429 JSON on a top-level navigation, which is
  acceptable for that ceiling.
- `POST /users/log-in/oauth` (rateLimitAuth + logInOAuth) — callback
  exchange: verifies state + code with the bonded provider and logs the
  user in.

Only mount when the app wires an oauth bond. Handlers check the bond
registry at request time, so an unbonded provider yields a clean 404.

```typescript
function mountDefaultUserOAuthLoginRoute(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserResetPasswordRoute(router, user)`

Optional reset-password route: `POST /users/reset-password` (rateLimitAuth +
resetPassword). Only mount when the app uses the pkg's resetPassword handler
rather than a custom local handler.

```typescript
function mountDefaultUserResetPasswordRoute(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserSecurityRoutes(router, user)`

Mounts password + 2FA security routes:

- `PATCH /users/:id/password` (authSelf+updatePassword)
- `POST /users/:id/verify-two-factor` (authSelf + rateLimitTwoFactor + verifyTwoFactor)

The 2FA verification route carries a stricter limiter (`user.rateLimitTwoFactor`)
that temp-locks the second factor per account after consecutive misses.

```typescript
function mountDefaultUserSecurityRoutes(router: Router, user: UserRequestHandlerMap): void
```

#### `mountDefaultUserVerifyPaymentRoutes(router, user)`

Optional payment-verification routes for apps that support
client-driven payment confirmation (Apple/Google receipt verify).

Both verbs require `authSelf` ([M3-1]): the handler mutates and returns the
`:id` user, so an unauthenticated / cross-user call must not reach it. The
permissive global `verifyMiddleware()` never blocks, so per-route `authSelf`
is the gate. `authSelf` does NOT break the Stripe Checkout `success_url`
callback — that is a top-level browser navigation which carries the
`sameSite:'lax'` session cookie — and in-handler customer/checkout-session
binding remains as defense-in-depth. This mirrors the hardened declarative
route table (`resources/user/src/routes.ts`) and molecule-dev's live router;
the fix had not been propagated to this mounter, which the generated-app
fleet uses.

- `GET /users/:id/verify-payment/:provider` (authSelf+verifyPayment)
- `POST /users/:id/verify-payment/:provider` (authSelf+verifyPayment)

```typescript
function mountDefaultUserVerifyPaymentRoutes(router: Router, user: UserRequestHandlerMap): void
```

#### `requireAuth(_req, res, next)`

Express middleware that 401s any request lacking `res.locals.session.userId`.
Drop-in for the fleet's 51 inline `requireAuth` copies.

```typescript
function requireAuth(_req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, next: NextFunction): void
```

#### `requireOwnership(table, id, userId)`

Look up a row by id and verify the caller owns it via `owner_id`.
Returns the row on success, 404 when missing OR owned by a different
user (so attackers can't probe row existence).

```typescript
function requireOwnership(table: string, id: string, userId: string): Promise<AuthzResult<T>>
```

#### `requireUser(res)`

Like `getUserId` but writes a 401 + returns null when there's no
session. Use at the top of handler bodies to bail early:

```ts
const userId = requireUser(res)
if (!userId) return
```

```typescript
function requireUser(res: Response<any, Record<string, any>>): string | null
```

#### `requireUserOwnership(table, id, userId)`

Variant of `requireOwnership` for tables that scope by `user_id`
instead of `owner_id` (notifications, user-bound preferences, etc.).

```typescript
function requireUserOwnership(table: string, id: string, userId: string): Promise<AuthzResult<T>>
```

#### `setupAiAnthropic()`

Registers `@molecule/api-ai-anthropic` as a named `'anthropic'` AI provider.

```typescript
function setupAiAnthropic(): Promise<void>
```

#### `setupAiEmbeddingsOpenai()`

Wires `@molecule/api-ai-embeddings-openai` to `@molecule/api-ai-embeddings`.

```typescript
function setupAiEmbeddingsOpenai(): Promise<void>
```

#### `setupAiOpenai()`

Registers `@molecule/api-ai-openai` as a named `'openai'` AI provider.

```typescript
function setupAiOpenai(): Promise<void>
```

#### `setupAiSpeechOpenai()`

Wires `@molecule/api-ai-speech-openai` to `@molecule/api-ai-speech`.

```typescript
function setupAiSpeechOpenai(): Promise<void>
```

#### `setupAiVectorStorePgvector()`

Wires `@molecule/api-ai-vector-store-pgvector` to `@molecule/api-ai-vector-store`.

```typescript
function setupAiVectorStorePgvector(): Promise<void>
```

#### `setupApiAnalyticsDefault()`

Wires a no-op default analytics provider so `@molecule/api-analytics` calls succeed.

```typescript
function setupApiAnalyticsDefault(): Promise<void>
```

#### `setupAuditDatabase()`

Wires `@molecule/api-audit-database` to `@molecule/api-audit`.

```typescript
function setupAuditDatabase(): Promise<void>
```

#### `setupCacheRedis()`

Wires `@molecule/api-cache-redis` to `@molecule/api-cache`.

```typescript
function setupCacheRedis(): Promise<void>
```

#### `setupConfigEnv()`

Wires `@molecule/api-config-env` to `@molecule/api-config`.

```typescript
function setupConfigEnv(): void
```

#### `setupCronNodeCron()`

Wires `@molecule/api-cron-node-cron` to `@molecule/api-cron`.

```typescript
function setupCronNodeCron(): Promise<void>
```

#### `setupDatabasePostgresql()`

Wires `@molecule/api-database-postgresql` to `@molecule/api-database`.

```typescript
function setupDatabasePostgresql(): void
```

#### `setupEmailsMailgun()`

Wires `@molecule/api-emails-mailgun` to `@molecule/api-emails`.

```typescript
function setupEmailsMailgun(): void
```

#### `setupEncryptionAes()`

Wires `@molecule/api-encryption-aes` to `@molecule/api-encryption`.

```typescript
function setupEncryptionAes(): Promise<void>
```

#### `setupErrorTrackingConsole()`

Wires `@molecule/api-error-tracking-console` to `@molecule/api-error-tracking`.

Zero-credential development default: captures are logged as structured
lines through the bonded logger instead of being sent to a remote service.

```typescript
function setupErrorTrackingConsole(): Promise<void>
```

#### `setupErrorTrackingSentry()`

Wires `@molecule/api-error-tracking-sentry` to `@molecule/api-error-tracking`.

Safe to wire unconditionally: without `SENTRY_DSN` the Sentry provider is a
documented no-op (the boot config report flags the missing key), so an app
that hasn't configured Sentry yet boots and runs untouched.

```typescript
function setupErrorTrackingSentry(): Promise<void>
```

#### `setupGeolocationGoogle()`

Wires `@molecule/api-geolocation-google` to `@molecule/api-geolocation`.

```typescript
function setupGeolocationGoogle(): Promise<void>
```

#### `setupGeolocationMapbox()`

Wires `@molecule/api-geolocation-mapbox` to `@molecule/api-geolocation`.

```typescript
function setupGeolocationMapbox(): Promise<void>
```

#### `setupHttpFetch()`

Wires `@molecule/api-http-fetch` to `@molecule/api-http`.

```typescript
function setupHttpFetch(): Promise<void>
```

#### `setupImageSharp()`

Wires `@molecule/api-image-sharp` to `@molecule/api-image`.

```typescript
function setupImageSharp(): Promise<void>
```

#### `setupImportExportCsv()`

Wires `@molecule/api-import-export-csv` to `@molecule/api-import-export`.

```typescript
function setupImportExportCsv(): Promise<void>
```

#### `setupJwtJsonwebtoken()`

Wires `@molecule/api-jwt-jsonwebtoken` to `@molecule/api-jwt`.

```typescript
function setupJwtJsonwebtoken(): void
```

#### `setupMediaStreamingHls()`

Wires `@molecule/api-media-streaming-hls` to `@molecule/api-media-streaming`.

```typescript
function setupMediaStreamingHls(): Promise<void>
```

#### `setupMiddlewareBodyParserExpress()`

Wires `@molecule/api-middleware-body-parser-express` to `@molecule/api-middleware-body-parser`.

```typescript
function setupMiddlewareBodyParserExpress(): void
```

#### `setupMiddlewareCookieParserExpress()`

Wires `@molecule/api-middleware-cookie-parser-express` to `@molecule/api-middleware-cookie-parser`.

```typescript
function setupMiddlewareCookieParserExpress(): void
```

#### `setupMiddlewareCorsExpress()`

Wires `@molecule/api-middleware-cors-express` to `@molecule/api-middleware-cors`.

```typescript
function setupMiddlewareCorsExpress(): void
```

#### `setupNotificationsWebhook()`

Registers `@molecule/api-notifications-webhook` as a named `'webhook'` notifications provider.

```typescript
function setupNotificationsWebhook(): Promise<void>
```

#### `setupPasswordBcrypt()`

Wires `@molecule/api-password-bcrypt` to `@molecule/api-password`.

```typescript
function setupPasswordBcrypt(): void
```

#### `setupPaymentsStripe()`

Registers `@molecule/api-payments-stripe` as a named `'stripe'` payments provider.

```typescript
function setupPaymentsStripe(): void
```

#### `setupPdfPdfkit()`

Wires `@molecule/api-pdf-pdfkit` to `@molecule/api-pdf`.

```typescript
function setupPdfPdfkit(): Promise<void>
```

#### `setupPermissionsCustom()`

Wires `@molecule/api-permissions-custom` to `@molecule/api-permissions`.

```typescript
function setupPermissionsCustom(): Promise<void>
```

#### `setupPushNotificationsWebPush()`

Wires `@molecule/api-push-notifications-web-push` to `@molecule/api-push-notifications`.

```typescript
function setupPushNotificationsWebPush(): Promise<void>
```

#### `setupQueueMemory()`

Wires `@molecule/api-queue-memory` to `@molecule/api-queue` — the
zero-credential in-process queue (single-process/dev; swap to
redis/rabbitmq/sqs for multi-instance production).

```typescript
function setupQueueMemory(): Promise<void>
```

#### `setupQueueRedis()`

Wires `@molecule/api-queue-redis` to `@molecule/api-queue`. Outside
production, when `REDIS_URL` is absent, falls back to
`@molecule/api-queue-memory` — the zero-credential in-process queue — so
queue-backed features (background jobs, async delivery workers) run out of
the box, mirroring `setupCacheRedis`.

```typescript
function setupQueueRedis(): Promise<void>
```

#### `setupRateLimitMemory()`

Wires `@molecule/api-rate-limit-memory` to `@molecule/api-rate-limit`.

This is the default brute-force-protection backend for `mlcl`-generated apps
(single-instance). Multi-instance deployments should swap in
`@molecule/api-rate-limit-redis` so the throttle is shared across replicas.

```typescript
function setupRateLimitMemory(): Promise<void>
```

#### `setupRealtimeSocketio()`

Wires `@molecule/api-realtime-socketio` to `@molecule/api-realtime`.

```typescript
function setupRealtimeSocketio(): Promise<void>
```

#### `setupRealtimeSse()`

Wires `@molecule/api-realtime-sse` to `@molecule/api-realtime`.

```typescript
function setupRealtimeSse(): Promise<void>
```

#### `setupRealtimeWs()`

Wires `@molecule/api-realtime-ws` to `@molecule/api-realtime`.

```typescript
function setupRealtimeWs(): Promise<void>
```

#### `setupReportingDatabase()`

Wires `@molecule/api-reporting-database` to `@molecule/api-reporting`.

```typescript
function setupReportingDatabase(): Promise<void>
```

#### `setupSearchMeilisearch()`

Wires `@molecule/api-search-meilisearch` to `@molecule/api-search`.

```typescript
function setupSearchMeilisearch(): void
```

#### `setupSecretsEnv()`

Wires `@molecule/api-secrets-env` to `@molecule/api-secrets`.

```typescript
function setupSecretsEnv(): void
```

#### `setupServiceDevice()`

Registers the device service from `@molecule/api-resource-device` on the bond system.

```typescript
function setupServiceDevice(): void
```

#### `setupServicePayment()`

Registers the plan + paymentRecord services from `@molecule/api-resource-payment`.

```typescript
function setupServicePayment(): void
```

#### `setupTwoFactorOtplib()`

Wires `@molecule/api-two-factor-otplib` to `@molecule/api-two-factor`.

```typescript
function setupTwoFactorOtplib(): void
```

#### `setupUploadsS3()`

Wires `@molecule/api-uploads-s3` to `@molecule/api-uploads`.

```typescript
function setupUploadsS3(): void
```

#### `setupWebhookHttp()`

Wires `@molecule/api-webhook-http` to `@molecule/api-webhook`.

```typescript
function setupWebhookHttp(): Promise<void>
```

#### `setupWorkflowDatabase()`

Wires `@molecule/api-workflow-database` to `@molecule/api-workflow`.

```typescript
function setupWorkflowDatabase(): Promise<void>
```

#### `trackAuthEvent(eventName)`

Emits an analytics event AND a log entry for an auth-related mutation
(signup, login, password reset, plan change, etc.). Logs at info on
success and warn on auth failure (4xx) so security signal is captured.

Replaces the per-app `api/src/middleware/auth-analytics.ts` shipped
by 10 fleet apps.

```typescript
function trackAuthEvent(eventName: string): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
```

#### `validationError(res, issues)`

Standard 400 response for zod / schema validation failures.
Used by ~21 fleet apps' `api/src/lib/authz.ts` files.

```typescript
function validationError(res: Response<any, Record<string, any>>, issues: unknown): void
```

### Constants

#### `deviceRequestHandlerMap`

Pre-wired request handler map for `@molecule/api-resource-device`.

```typescript
const deviceRequestHandlerMap: DeviceRequestHandlerMap
```

#### `deviceService`

DeviceService implementation for the bond system.

Provides device CRUD operations that other resources
can use through `get('device')` / `require('device')`.

```typescript
const deviceService: DeviceService
```

#### `idParamSchema`

Standard route-param schema for `:id`. Accepts any non-empty string.
Pair with `validateParams(idParamSchema)`.

```typescript
const idParamSchema: z.ZodObject<{ id: z.ZodString; }, z.core.$strip>
```

#### `userRequestHandlerMap`

Pre-wired request handler map for `@molecule/api-resource-user`.

```typescript
const userRequestHandlerMap: UserRequestHandlerMap
```

#### `uuidParamSchema`

Strict variant of `idParamSchema` that requires a UUID. Use when the
underlying column is a uuid.

```typescript
const uuidParamSchema: z.ZodObject<{ id: z.ZodString; }, z.core.$strip>
```

### Namespaces

#### `userAuthorization`

Members:

- `userAuthorization.getAuthCookieName` — const: Resolve the actual cookie name for an auth cookie.
- `userAuthorization.getAuthCookieOptions` — const: Base cookie attributes shared by EVERY auth cookie this resource sets and
- `userAuthorization.invalidateDeviceExistsCache` — const: Evict a single device's positive entry from the device-exists cache so the
- `userAuthorization.invalidateAllDeviceExistsCache` — const: Evict ALL positive entries from the device-exists cache.
- `userAuthorization.set` — const: Set authorization headers and cookie for a session.
- `userAuthorization.verifyMiddleware` — const: Middleware that verifies the JWT token from the `Authorization` header and sets `res.locals.session`.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-anthropic` ^1.0.0
- `@molecule/api-ai-embeddings` ^1.0.0
- `@molecule/api-ai-embeddings-openai` ^1.0.0
- `@molecule/api-ai-openai` ^1.0.0
- `@molecule/api-ai-speech` ^1.0.0
- `@molecule/api-ai-speech-openai` ^1.0.0
- `@molecule/api-ai-vector-store` ^1.0.0
- `@molecule/api-ai-vector-store-pgvector` ^1.0.0
- `@molecule/api-analytics` ^1.0.0
- `@molecule/api-audit` ^1.0.0
- `@molecule/api-audit-database` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-cache` ^1.0.0
- `@molecule/api-cache-memory` ^1.0.0
- `@molecule/api-cache-redis` ^1.0.0
- `@molecule/api-config` ^1.0.0
- `@molecule/api-config-env` ^1.0.0
- `@molecule/api-cron` ^1.0.0
- `@molecule/api-cron-node-cron` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-database-postgresql` ^1.0.0
- `@molecule/api-emails` ^1.0.0
- `@molecule/api-emails-capture` ^1.0.0
- `@molecule/api-emails-mailgun` ^1.0.0
- `@molecule/api-encryption` ^1.0.0
- `@molecule/api-encryption-aes` ^1.0.0
- `@molecule/api-entitlements` ^1.0.0
- `@molecule/api-error-tracking` ^1.0.0
- `@molecule/api-error-tracking-console` ^1.0.0
- `@molecule/api-error-tracking-sentry` ^1.0.0
- `@molecule/api-geolocation` ^1.0.0
- `@molecule/api-geolocation-google` ^1.0.0
- `@molecule/api-geolocation-mapbox` ^1.0.0
- `@molecule/api-geolocation-nominatim` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-http-fetch` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-image` ^1.0.0
- `@molecule/api-image-sharp` ^1.0.0
- `@molecule/api-import-export` ^1.0.0
- `@molecule/api-import-export-csv` ^1.0.0
- `@molecule/api-jwt` ^1.0.0
- `@molecule/api-jwt-jsonwebtoken` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-media-streaming` ^1.0.0
- `@molecule/api-media-streaming-hls` ^1.0.0
- `@molecule/api-middleware-body-parser` ^1.0.0
- `@molecule/api-middleware-body-parser-express` ^1.0.0
- `@molecule/api-middleware-cookie-parser` ^1.0.0
- `@molecule/api-middleware-cookie-parser-express` ^1.0.0
- `@molecule/api-middleware-cors` ^1.0.0
- `@molecule/api-middleware-cors-express` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-notifications-webhook` ^1.0.0
- `@molecule/api-password` ^1.0.0
- `@molecule/api-password-bcrypt` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-payments-stripe` ^1.0.0
- `@molecule/api-pdf` ^1.0.0
- `@molecule/api-pdf-pdfkit` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-permissions-custom` ^1.0.0
- `@molecule/api-push-capture` ^1.0.0
- `@molecule/api-push-notifications` ^1.0.0
- `@molecule/api-push-notifications-web-push` ^1.0.0
- `@molecule/api-queue` ^1.0.0
- `@molecule/api-queue-memory` ^1.0.0
- `@molecule/api-queue-redis` ^1.0.0
- `@molecule/api-rate-limit` ^1.0.0
- `@molecule/api-rate-limit-memory` ^1.0.0
- `@molecule/api-realtime` ^1.0.0
- `@molecule/api-realtime-socketio` ^1.0.0
- `@molecule/api-realtime-sse` ^1.0.0
- `@molecule/api-realtime-ws` ^1.0.0
- `@molecule/api-reporting` ^1.0.0
- `@molecule/api-reporting-database` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-resource-device` ^1.0.0
- `@molecule/api-resource-payment` ^1.0.0
- `@molecule/api-resource-user` ^1.0.0
- `@molecule/api-search` ^1.0.0
- `@molecule/api-search-meilisearch` ^1.0.0
- `@molecule/api-search-postgres` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-secrets-env` ^1.0.0
- `@molecule/api-two-factor` ^1.0.0
- `@molecule/api-two-factor-otplib` ^1.0.0
- `@molecule/api-uploads` ^1.0.0
- `@molecule/api-uploads-filesystem` ^1.0.0
- `@molecule/api-uploads-s3` ^1.0.0
- `@molecule/api-webhook` ^1.0.0
- `@molecule/api-webhook-http` ^1.0.0
- `@molecule/api-workflow` ^1.0.0
- `@molecule/api-workflow-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai-anthropic`
- `@molecule/api-ai-embeddings`
- `@molecule/api-ai-embeddings-openai`
- `@molecule/api-ai-openai`
- `@molecule/api-ai-speech`
- `@molecule/api-ai-speech-openai`
- `@molecule/api-ai-vector-store`
- `@molecule/api-ai-vector-store-pgvector`
- `@molecule/api-analytics`
- `@molecule/api-audit`
- `@molecule/api-audit-database`
- `@molecule/api-bond`
- `@molecule/api-cache`
- `@molecule/api-cache-memory`
- `@molecule/api-cache-redis`
- `@molecule/api-config`
- `@molecule/api-config-env`
- `@molecule/api-cron`
- `@molecule/api-cron-node-cron`
- `@molecule/api-database`
- `@molecule/api-database-postgresql`
- `@molecule/api-emails`
- `@molecule/api-emails-capture`
- `@molecule/api-emails-mailgun`
- `@molecule/api-encryption`
- `@molecule/api-encryption-aes`
- `@molecule/api-entitlements`
- `@molecule/api-error-tracking`
- `@molecule/api-error-tracking-console`
- `@molecule/api-error-tracking-sentry`
- `@molecule/api-geolocation`
- `@molecule/api-geolocation-google`
- `@molecule/api-geolocation-mapbox`
- `@molecule/api-geolocation-nominatim`
- `@molecule/api-http`
- `@molecule/api-http-fetch`
- `@molecule/api-i18n`
- `@molecule/api-image`
- `@molecule/api-image-sharp`
- `@molecule/api-import-export`
- `@molecule/api-import-export-csv`
- `@molecule/api-jwt`
- `@molecule/api-jwt-jsonwebtoken`
- `@molecule/api-logger`
- `@molecule/api-media-streaming`
- `@molecule/api-media-streaming-hls`
- `@molecule/api-middleware-body-parser`
- `@molecule/api-middleware-body-parser-express`
- `@molecule/api-middleware-cookie-parser`
- `@molecule/api-middleware-cookie-parser-express`
- `@molecule/api-middleware-cors`
- `@molecule/api-middleware-cors-express`
- `@molecule/api-middleware-validation`
- `@molecule/api-notifications-webhook`
- `@molecule/api-password`
- `@molecule/api-password-bcrypt`
- `@molecule/api-payments`
- `@molecule/api-payments-stripe`
- `@molecule/api-pdf`
- `@molecule/api-pdf-pdfkit`
- `@molecule/api-permissions`
- `@molecule/api-permissions-custom`
- `@molecule/api-push-capture`
- `@molecule/api-push-notifications`
- `@molecule/api-push-notifications-web-push`
- `@molecule/api-queue`
- `@molecule/api-queue-memory`
- `@molecule/api-queue-redis`
- `@molecule/api-rate-limit`
- `@molecule/api-rate-limit-memory`
- `@molecule/api-realtime`
- `@molecule/api-realtime-socketio`
- `@molecule/api-realtime-sse`
- `@molecule/api-realtime-ws`
- `@molecule/api-reporting`
- `@molecule/api-reporting-database`
- `@molecule/api-resource`
- `@molecule/api-resource-device`
- `@molecule/api-resource-payment`
- `@molecule/api-resource-user`
- `@molecule/api-search`
- `@molecule/api-search-meilisearch`
- `@molecule/api-search-postgres`
- `@molecule/api-secrets`
- `@molecule/api-secrets-env`
- `@molecule/api-two-factor`
- `@molecule/api-two-factor-otplib`
- `@molecule/api-uploads`
- `@molecule/api-uploads-filesystem`
- `@molecule/api-uploads-s3`
- `@molecule/api-webhook`
- `@molecule/api-webhook-http`
- `@molecule/api-workflow`
- `@molecule/api-workflow-database`

- **Development falls back to zero-credential providers; production never
  does.** When `NODE_ENV !== 'production'` and a provider's required env
  is missing, the setup wires the capture/local sibling instead and logs
  the swap: mailgun→emails-capture (`MAILGUN_API_KEY`/`MAILGUN_DOMAIN`),
  uploads-s3→uploads-filesystem (`AWS_*`), search-meilisearch→
  search-postgres (`MEILISEARCH_URL`), web-push→push-capture
  (`VAPID_*`), geolocation-mapbox→nominatim (`MAPBOX_ACCESS_TOKEN`),
  cache-redis→cache-memory (`REDIS_URL`). In production the credentialed
  provider is wired regardless — missing env surfaces as loud,
  actionable 503s and boot-report entries, never a silent provider swap.
  So "emails don't arrive in dev" usually means they were CAPTURED (read
  them via the activity/capture tooling), not lost.
- **Realtime setups (`setupRealtimeSocketio`, `setupRealtimeWs`,
  `setupRealtimeSse`) all defer-attach.** Each dynamic-imports its
  provider's `createProvider({ deferAttach: true })`, calls
  `setProvider()`, then `registerServerCreatedHook((server) =>
  provider.attachHttpServer?.(server))` from
  `@molecule/api-server-default-express` — so the realtime transport
  shares the API's HTTP server/port once it exists, instead of a
  standalone port a containerized sandbox / proxied deploy may not
  expose. Add new realtime bonds by mirroring this pattern exactly.
- `createBillingRouter` registers the app's Stripe plan catalogue with
  `@molecule/api-resource-payment` at construction AND re-registers per
  checkout (price-id env vars may resolve after startup); webhook
  handling stays with `@molecule/api-resource-user`'s
  `handlePaymentNotification`. A paid price whose `planKeys` entry is
  missing is skipped WITH a warning — that plan could never be granted.
- Only wire the setups whose packages your app actually installed —
  each one imports its provider package (several lazily via dynamic
  import), so calling a setup for an uninstalled bond fails at that
  import.
