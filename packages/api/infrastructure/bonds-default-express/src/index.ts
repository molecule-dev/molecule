/**
 * `@molecule/api-bonds-default-express` — default API bond wirings and
 * shared route/handler plumbing for Express-based apps.
 *
 * Two halves:
 *
 * 1. **`setup<Name>()` bond wirings** (40+): one function per default
 *    provider (`setupConfigEnv`, `setupDatabasePostgresql`,
 *    `setupJwtJsonwebtoken`, `setupEmailsMailgun`, `setupUploadsS3`,
 *    `setupRealtimeSocketio`, `setupAiAnthropic`, …) so per-app
 *    `api/src/bonds/<name>.ts` files are 1-line re-exports and
 *    `bonds/index.ts` just calls them in order.
 * 2. **Shared Express plumbing**: `createBillingRouter` (the fleet's
 *    Stripe billing endpoints), the `mountDefaultUserAuthRoutes` /
 *    `mountDefaultDeviceRoutes` / other `mountDefault*Routes` helpers,
 *    handler guards (`requireAuth`, `requireUser`, `requireOwnership`,
 *    `getUserId`, `validationError`, `internalError`), zod param schemas,
 *    `trackAuthEvent`, and a `createMigrator` re-export.
 *
 * @example
 * ```typescript
 * // api/src/bonds/index.ts — wire defaults at startup, then validate:
 * import { validateBonds } from '@molecule/api-bond'
 * import {
 *   setupConfigEnv,
 *   setupDatabasePostgresql,
 *   setupEmailsMailgun,
 *   setupJwtJsonwebtoken,
 *   setupSecretsEnv,
 * } from '@molecule/api-bonds-default-express'
 *
 * async function setupBonds(): Promise<void> {
 *   setupConfigEnv()
 *   setupSecretsEnv()
 *   setupDatabasePostgresql()
 *   setupJwtJsonwebtoken()
 *   setupEmailsMailgun()
 *   validateBonds()
 * }
 * ```
 *
 * @example
 * ```typescript
 * // api/src/routes/billing.ts — the fleet-standard billing endpoints
 * // (POST /checkout, POST /cancel, GET /status, GET /tiers), mounted by
 * // the app router at /billing (the real file default-exports the router):
 * import { createBillingRouter } from '@molecule/api-bonds-default-express'
 *
 * // Your app owns these (typically in api/src/tiers.ts):
 * interface AppLimits { seats: number }
 * const getPricingTiers = () => []       // your tiers, each with a stripePriceId + limits
 * const appPlanKeys = { free: 'free', pro: 'pro' }
 *
 * const billingRouter = createBillingRouter<AppLimits>({
 *   getPricingTiers,
 *   planKeys: appPlanKeys,
 * })
 * ```
 *
 * @module
 * @remarks
 * - **Development falls back to zero-credential providers; production never
 *   does.** When `NODE_ENV !== 'production'` and a provider's required env
 *   is missing, the setup wires the capture/local sibling instead and logs
 *   the swap: mailgun→emails-capture (`MAILGUN_API_KEY`/`MAILGUN_DOMAIN`),
 *   uploads-s3→uploads-filesystem (`AWS_*`), search-meilisearch→
 *   search-postgres (`MEILISEARCH_URL`), web-push→push-capture
 *   (`VAPID_*`), geolocation-mapbox→nominatim (`MAPBOX_ACCESS_TOKEN`),
 *   cache-redis→cache-memory (`REDIS_URL`). In production the credentialed
 *   provider is wired regardless — missing env surfaces as loud,
 *   actionable 503s and boot-report entries, never a silent provider swap.
 *   So "emails don't arrive in dev" usually means they were CAPTURED (read
 *   them via the activity/capture tooling), not lost.
 * - **Realtime setups (`setupRealtimeSocketio`, `setupRealtimeWs`,
 *   `setupRealtimeSse`) all defer-attach.** Each dynamic-imports its
 *   provider's `createProvider({ deferAttach: true })`, calls
 *   `setProvider()`, then `registerServerCreatedHook((server) =>
 *   provider.attachHttpServer?.(server))` from
 *   `@molecule/api-server-default-express` — so the realtime transport
 *   shares the API's HTTP server/port once it exists, instead of a
 *   standalone port a containerized sandbox / proxied deploy may not
 *   expose. Add new realtime bonds by mirroring this pattern exactly.
 * - `createBillingRouter` registers the app's Stripe plan catalogue with
 *   `@molecule/api-resource-payment` at construction AND re-registers per
 *   checkout (price-id env vars may resolve after startup); webhook
 *   handling stays with `@molecule/api-resource-user`'s
 *   `handlePaymentNotification`. A paid price whose `planKeys` entry is
 *   missing is skipped WITH a warning — that plan could never be granted.
 * - Only wire the setups whose packages your app actually installed —
 *   each one imports its provider package (several lazily via dynamic
 *   import), so calling a setup for an uninstalled bond fails at that
 *   import.
 */

export * from './browser-guard.js'
export * from './billing.js'
export * from './handlers.js'
export * from './middleware.js'
export * from './migrate.js'
export * from './resources.js'
export * from './routes.js'
export * from './schemas.js'
export * from './setup.js'
