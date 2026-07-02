/**
 * Default Express-based API bond wirings.
 *
 * Centralizes the 10 byte-identical `api/src/bonds/<name>.ts` setup
 * functions that every flagship app shipped before this package
 * existed. Each function preserves the legacy name (`setupConfigEnv`,
 * `setupDatabasePostgresql`, ...) so per-app `bonds/<name>.ts` files
 * can become 1-line re-exports without changing `bonds/index.ts` call
 * sites.
 *
 * @module
 */

import { bond, getLogger } from '@molecule/api-bond'
import { setProvider as setConfig } from '@molecule/api-config'
import { provider as configProvider } from '@molecule/api-config-env'
import { setPool, setStore } from '@molecule/api-database'
import { pool as dbPool, store as dbStore } from '@molecule/api-database-postgresql'
import { setTransport as setEmails } from '@molecule/api-emails'
import { provider as emailsCaptureProvider } from '@molecule/api-emails-capture'
import { provider as emailsMailgunProvider } from '@molecule/api-emails-mailgun'
import { setProvider as setJwt } from '@molecule/api-jwt'
import { provider as jwtProvider } from '@molecule/api-jwt-jsonwebtoken'
import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
import {
  jsonParserFactory as bodyJsonParserFactory,
  provider as bodyParserProvider,
} from '@molecule/api-middleware-body-parser-express'
import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
import {
  cookieParserFactory,
  provider as cookieParserProvider,
} from '@molecule/api-middleware-cookie-parser-express'
import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
import { corsFactory, provider as corsProvider } from '@molecule/api-middleware-cors-express'
import { setProvider as setPassword } from '@molecule/api-password'
import { provider as passwordProvider } from '@molecule/api-password-bcrypt'
import { paymentProvider as stripePaymentProvider } from '@molecule/api-payments-stripe'
import { deviceService } from '@molecule/api-resource-device'
import { paymentRecordService, planService } from '@molecule/api-resource-payment'
import { setProvider as setSearch } from '@molecule/api-search'
import { provider as searchMeilisearchProvider } from '@molecule/api-search-meilisearch'
import { provider as searchPostgresProvider } from '@molecule/api-search-postgres'
import { setProvider as setSecrets } from '@molecule/api-secrets'
import { provider as secretsProvider } from '@molecule/api-secrets-env'
import { setProvider as setTwoFactor } from '@molecule/api-two-factor'
import { provider as twoFactorProvider } from '@molecule/api-two-factor-otplib'
import { setProvider as setUploads } from '@molecule/api-uploads'
import { provider as uploadsFilesystemProvider } from '@molecule/api-uploads-filesystem'
import { provider as uploadsS3Provider } from '@molecule/api-uploads-s3'

const logger = getLogger()

/**
 * Whether a credentialed provider whose required env is absent should fall
 * back to its zero-credential development sibling. In production the
 * credentialed provider is wired regardless — its actionable
 * `config.notConfigured` 503s (and the boot config report) are the correct
 * loud failure; silently swapping providers in production would hide a
 * misconfiguration.
 *
 * @returns `true` outside production.
 */
const devFallbackAllowed = (): boolean => process.env.NODE_ENV !== 'production'

/**
 * Logs a development-fallback decision (once per call site) so the swap is
 * always visible next to the boot config report.
 *
 * @param category - The bond category being wired.
 * @param missing - The missing env keys that triggered the fallback.
 * @param fallback - The zero-credential package wired instead.
 */
const logDevFallback = (category: string, missing: string, fallback: string): void => {
  logger.info(
    `bonds: ${missing} not set — wiring ${fallback} for ${category} (zero-credential development default; the boot config report lists what production needs)`,
  )
}

/** Wires `@molecule/api-config-env` to `@molecule/api-config`. */
export function setupConfigEnv(): void {
  setConfig(configProvider)
}

/** Wires `@molecule/api-database-postgresql` to `@molecule/api-database`. */
export function setupDatabasePostgresql(): void {
  setPool(dbPool)
  setStore(dbStore)
}

/** Wires `@molecule/api-jwt-jsonwebtoken` to `@molecule/api-jwt`. */
export function setupJwtJsonwebtoken(): void {
  setJwt(jwtProvider)
}

/** Wires `@molecule/api-middleware-body-parser-express` to `@molecule/api-middleware-body-parser`. */
export function setupMiddlewareBodyParserExpress(): void {
  setBodyParser(bodyParserProvider)
  setJsonParserFactory(bodyJsonParserFactory)
}

/** Wires `@molecule/api-middleware-cookie-parser-express` to `@molecule/api-middleware-cookie-parser`. */
export function setupMiddlewareCookieParserExpress(): void {
  setCookieParser(cookieParserProvider)
  setCookieParserFactory(cookieParserFactory)
}

/** Wires `@molecule/api-middleware-cors-express` to `@molecule/api-middleware-cors`. */
export function setupMiddlewareCorsExpress(): void {
  setCors(corsProvider)
  setCorsFactory(corsFactory)
}

/** Wires `@molecule/api-password-bcrypt` to `@molecule/api-password`. */
export function setupPasswordBcrypt(): void {
  setPassword(passwordProvider)
}

/** Wires `@molecule/api-secrets-env` to `@molecule/api-secrets`. */
export function setupSecretsEnv(): void {
  setSecrets(secretsProvider)
}

/** Registers the device service from `@molecule/api-resource-device` on the bond system. */
export function setupServiceDevice(): void {
  bond('device', deviceService)
}

/** Wires `@molecule/api-two-factor-otplib` to `@molecule/api-two-factor`. */
export function setupTwoFactorOtplib(): void {
  setTwoFactor(twoFactorProvider)
}

/** Wires `@molecule/api-emails-mailgun` to `@molecule/api-emails`. */
export function setupEmailsMailgun(): void {
  if (devFallbackAllowed() && (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN)) {
    logDevFallback('emails', 'MAILGUN_API_KEY/MAILGUN_DOMAIN', '@molecule/api-emails-capture')
    setEmails(emailsCaptureProvider)
    return
  }
  setEmails(emailsMailgunProvider)
}

/** Registers `@molecule/api-payments-stripe` as a named `'stripe'` payments provider. */
export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', stripePaymentProvider)
}

/** Registers the plan + paymentRecord services from `@molecule/api-resource-payment`. */
export function setupServicePayment(): void {
  bond('plans', planService)
  bond('paymentRecords', paymentRecordService)
}

/** Wires `@molecule/api-search-meilisearch` to `@molecule/api-search`. */
export function setupSearchMeilisearch(): void {
  if (devFallbackAllowed() && !process.env.MEILISEARCH_URL) {
    logDevFallback('search', 'MEILISEARCH_URL', '@molecule/api-search-postgres')
    setSearch(searchPostgresProvider)
    return
  }
  setSearch(searchMeilisearchProvider)
}

/** Wires `@molecule/api-uploads-s3` to `@molecule/api-uploads`. */
export function setupUploadsS3(): void {
  if (
    devFallbackAllowed() &&
    (!process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_S3_BUCKET)
  ) {
    logDevFallback('uploads', 'AWS_* / AWS_S3_BUCKET', '@molecule/api-uploads-filesystem')
    setUploads(uploadsFilesystemProvider)
    return
  }
  setUploads(uploadsS3Provider)
}

/** Wires `@molecule/api-image-sharp` to `@molecule/api-image`. */
export async function setupImageSharp(): Promise<void> {
  const [{ setProvider: setImage }, { provider }] = await Promise.all([
    import('@molecule/api-image'),
    import('@molecule/api-image-sharp'),
  ])
  setImage(provider)
}

/** Wires `@molecule/api-permissions-custom` to `@molecule/api-permissions`. */
export async function setupPermissionsCustom(): Promise<void> {
  const [{ setProvider: setPermissions }, { provider }] = await Promise.all([
    import('@molecule/api-permissions'),
    import('@molecule/api-permissions-custom'),
  ])
  setPermissions(provider)
}

/** Wires `@molecule/api-reporting-database` to `@molecule/api-reporting`. */
export async function setupReportingDatabase(): Promise<void> {
  const [{ setProvider: setReporting }, { provider }] = await Promise.all([
    import('@molecule/api-reporting'),
    import('@molecule/api-reporting-database'),
  ])
  setReporting(provider)
}

/** Wires `@molecule/api-realtime-socketio` to `@molecule/api-realtime`. */
export async function setupRealtimeSocketio(): Promise<void> {
  const [{ setProvider: setRealtime }, { createProvider }, { registerServerCreatedHook }] =
    await Promise.all([
      import('@molecule/api-realtime'),
      import('@molecule/api-realtime-socketio'),
      import('@molecule/api-server-default-express'),
    ])
  // Defer Socket.io binding and attach to the API's HTTP server once the factory
  // creates it — so realtime shares the API port at `/socket.io/` instead of a
  // standalone port that a containerized sandbox / proxied deploy may not expose
  // (the previous `createProvider()` bound a standalone port, silently breaking
  // realtime in the sandbox preview for every realtime-socketio template).
  const provider = createProvider({ deferAttach: true })
  setRealtime(provider)
  registerServerCreatedHook((server) => provider.attachHttpServer?.(server))
}

/** Wires `@molecule/api-cron-node-cron` to `@molecule/api-cron`. */
export async function setupCronNodeCron(): Promise<void> {
  const [{ setProvider: setCron }, { provider }] = await Promise.all([
    import('@molecule/api-cron'),
    import('@molecule/api-cron-node-cron'),
  ])
  setCron(provider)
}

/** Wires `@molecule/api-encryption-aes` to `@molecule/api-encryption`. */
export async function setupEncryptionAes(): Promise<void> {
  const [{ setProvider: setEncryption }, { provider }] = await Promise.all([
    import('@molecule/api-encryption'),
    import('@molecule/api-encryption-aes'),
  ])
  setEncryption(provider)
}

/** Wires `@molecule/api-push-notifications-web-push` to `@molecule/api-push-notifications`. */
export async function setupPushNotificationsWebPush(): Promise<void> {
  if (devFallbackAllowed() && (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)) {
    logDevFallback('push-notifications', 'VAPID_*', '@molecule/api-push-capture')
    const [{ setProvider: setPush }, { provider }] = await Promise.all([
      import('@molecule/api-push-notifications'),
      import('@molecule/api-push-capture'),
    ])
    setPush(provider)
    return
  }
  const [{ setProvider: setPush }, { provider }] = await Promise.all([
    import('@molecule/api-push-notifications'),
    import('@molecule/api-push-notifications-web-push'),
  ])
  setPush(provider)
}

/** Wires `@molecule/api-import-export-csv` to `@molecule/api-import-export`. */
export async function setupImportExportCsv(): Promise<void> {
  const [{ setProvider: setImportExport }, { provider }] = await Promise.all([
    import('@molecule/api-import-export'),
    import('@molecule/api-import-export-csv'),
  ])
  setImportExport(provider)
}

/** Registers `@molecule/api-ai-anthropic` as a named `'anthropic'` AI provider. */
export async function setupAiAnthropic(): Promise<void> {
  const { provider } = await import('@molecule/api-ai-anthropic')
  bond('ai', 'anthropic', provider)
}

/** Wires `@molecule/api-audit-database` to `@molecule/api-audit`. */
export async function setupAuditDatabase(): Promise<void> {
  const [{ setProvider: setAudit }, { provider }] = await Promise.all([
    import('@molecule/api-audit'),
    import('@molecule/api-audit-database'),
  ])
  setAudit(provider)
}

/** Wires `@molecule/api-pdf-pdfkit` to `@molecule/api-pdf`. */
export async function setupPdfPdfkit(): Promise<void> {
  const [{ setProvider: setPdf }, { provider }] = await Promise.all([
    import('@molecule/api-pdf'),
    import('@molecule/api-pdf-pdfkit'),
  ])
  setPdf(provider)
}

/** Wires a no-op default analytics provider so `@molecule/api-analytics` calls succeed. */
export async function setupApiAnalyticsDefault(): Promise<void> {
  const { setProvider: setAnalytics } = await import('@molecule/api-analytics')
  setAnalytics({
    identify: async () => {},
    track: async () => {},
    page: async () => {},
  })
}

/** Wires `@molecule/api-geolocation-mapbox` to `@molecule/api-geolocation`. */
export async function setupGeolocationMapbox(): Promise<void> {
  if (devFallbackAllowed() && !process.env.MAPBOX_ACCESS_TOKEN) {
    logDevFallback('geolocation', 'MAPBOX_ACCESS_TOKEN', '@molecule/api-geolocation-nominatim')
    const [{ setProvider: setGeo }, { provider }] = await Promise.all([
      import('@molecule/api-geolocation'),
      import('@molecule/api-geolocation-nominatim'),
    ])
    setGeo(provider)
    return
  }
  const [{ setProvider: setGeo }, { provider }] = await Promise.all([
    import('@molecule/api-geolocation'),
    import('@molecule/api-geolocation-mapbox'),
  ])
  setGeo(provider)
}

/**
 * Wires `@molecule/api-error-tracking-sentry` to `@molecule/api-error-tracking`.
 *
 * Safe to wire unconditionally: without `SENTRY_DSN` the Sentry provider is a
 * documented no-op (the boot config report flags the missing key), so an app
 * that hasn't configured Sentry yet boots and runs untouched.
 */
export async function setupErrorTrackingSentry(): Promise<void> {
  const [{ setProvider: setErrorTracking }, { provider }] = await Promise.all([
    import('@molecule/api-error-tracking'),
    import('@molecule/api-error-tracking-sentry'),
  ])
  setErrorTracking(provider)
}

/**
 * Wires `@molecule/api-error-tracking-console` to `@molecule/api-error-tracking`.
 *
 * Zero-credential development default: captures are logged as structured
 * lines through the bonded logger instead of being sent to a remote service.
 */
export async function setupErrorTrackingConsole(): Promise<void> {
  const [{ setProvider: setErrorTracking }, { provider }] = await Promise.all([
    import('@molecule/api-error-tracking'),
    import('@molecule/api-error-tracking-console'),
  ])
  setErrorTracking(provider)
}

/** Wires `@molecule/api-cache-redis` to `@molecule/api-cache`. */
export async function setupCacheRedis(): Promise<void> {
  if (devFallbackAllowed() && !process.env.REDIS_URL) {
    logDevFallback('cache', 'REDIS_URL', '@molecule/api-cache-memory')
    const [{ setProvider: setCache }, { provider }] = await Promise.all([
      import('@molecule/api-cache'),
      import('@molecule/api-cache-memory'),
    ])
    setCache(provider)
    return
  }
  const [{ setProvider: setCache }, { provider }] = await Promise.all([
    import('@molecule/api-cache'),
    import('@molecule/api-cache-redis'),
  ])
  setCache(provider)
}

/**
 * Wires `@molecule/api-queue-memory` to `@molecule/api-queue` — the
 * zero-credential in-process queue (single-process/dev; swap to
 * redis/rabbitmq/sqs for multi-instance production).
 */
export async function setupQueueMemory(): Promise<void> {
  const [{ setProvider: setQueue }, { provider }] = await Promise.all([
    import('@molecule/api-queue'),
    import('@molecule/api-queue-memory'),
  ])
  setQueue(provider)
}

/**
 * Returns the model to default to for the given OpenAI bond category.
 * Explicit env var wins (escape hatch for debugging at a different
 * tier). Otherwise, non-production defaults to the cheapest model in
 * the family so smoke / CI / dev iteration doesn't accidentally burn
 * real OpenAI credits at the auto-selected expensive tier (see
 * gpt-image-1's `quality` story for the analog — auto picks high).
 * Production passes `undefined` so the provider's own default applies
 * and there's no silent downgrade for real user traffic.
 * @param envVar - Name of the env var that, if set, takes precedence as the explicit model id.
 * @param cheapModel - Fallback model id to use in non-production environments when no env override is set.
 * @returns The model id to pass as the provider's default, or `undefined` to defer to the provider's own default (production case).
 */
function nonProdDefaultModel(envVar: string, cheapModel: string): string | undefined {
  const explicit = process.env[envVar]
  if (explicit) return explicit
  if (process.env.NODE_ENV !== 'production') return cheapModel
  return undefined
}

/** Registers `@molecule/api-ai-openai` as a named `'openai'` AI provider. */
export async function setupAiOpenai(): Promise<void> {
  const { createProvider } = await import('@molecule/api-ai-openai')
  bond(
    'ai',
    'openai',
    createProvider({
      defaultModel: nonProdDefaultModel('OPENAI_TEXT_MODEL', 'gpt-4o-mini'),
    }),
  )
}

/** Wires `@molecule/api-ai-embeddings-openai` to `@molecule/api-ai-embeddings`. */
export async function setupAiEmbeddingsOpenai(): Promise<void> {
  const [{ setProvider: setEmb }, { createProvider }] = await Promise.all([
    import('@molecule/api-ai-embeddings'),
    import('@molecule/api-ai-embeddings-openai'),
  ])
  setEmb(
    createProvider({
      defaultModel: nonProdDefaultModel('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
    }),
  )
}

/** Wires `@molecule/api-webhook-http` to `@molecule/api-webhook`. */
export async function setupWebhookHttp(): Promise<void> {
  const [{ setProvider: setWebhook }, { createProvider }] = await Promise.all([
    import('@molecule/api-webhook'),
    import('@molecule/api-webhook-http'),
  ])
  setWebhook(createProvider())
}

/** Wires `@molecule/api-ai-vector-store-pgvector` to `@molecule/api-ai-vector-store`. */
export async function setupAiVectorStorePgvector(): Promise<void> {
  const [{ setProvider: setVS }, { createProvider }] = await Promise.all([
    import('@molecule/api-ai-vector-store'),
    import('@molecule/api-ai-vector-store-pgvector'),
  ])
  setVS(createProvider())
}

/** Wires `@molecule/api-ai-speech-openai` to `@molecule/api-ai-speech`. */
export async function setupAiSpeechOpenai(): Promise<void> {
  const [{ setProvider: setSpeech }, { createProvider }] = await Promise.all([
    import('@molecule/api-ai-speech'),
    import('@molecule/api-ai-speech-openai'),
  ])
  setSpeech(
    createProvider({
      defaultTTSModel: nonProdDefaultModel('OPENAI_TTS_MODEL', 'tts-1'),
      defaultSTTModel: nonProdDefaultModel('OPENAI_STT_MODEL', 'whisper-1'),
    }),
  )
}

/** Wires `@molecule/api-workflow-database` to `@molecule/api-workflow`. */
export async function setupWorkflowDatabase(): Promise<void> {
  const [{ setProvider: setWf }, { provider }] = await Promise.all([
    import('@molecule/api-workflow'),
    import('@molecule/api-workflow-database'),
  ])
  setWf(provider)
}

/** Wires `@molecule/api-http-fetch` to `@molecule/api-http`. */
export async function setupHttpFetch(): Promise<void> {
  const [{ setClient: setHttp }, { provider }] = await Promise.all([
    import('@molecule/api-http'),
    import('@molecule/api-http-fetch'),
  ])
  setHttp(provider)
}

/** Registers `@molecule/api-notifications-webhook` as a named `'webhook'` notifications provider. */
export async function setupNotificationsWebhook(): Promise<void> {
  const { provider } = await import('@molecule/api-notifications-webhook')
  bond('notifications', 'webhook', provider)
}

/** Wires `@molecule/api-geolocation-google` to `@molecule/api-geolocation`. */
export async function setupGeolocationGoogle(): Promise<void> {
  if (devFallbackAllowed() && !process.env.GOOGLE_MAPS_API_KEY) {
    logDevFallback('geolocation', 'GOOGLE_MAPS_API_KEY', '@molecule/api-geolocation-nominatim')
    const [{ setProvider: setGeo }, { provider }] = await Promise.all([
      import('@molecule/api-geolocation'),
      import('@molecule/api-geolocation-nominatim'),
    ])
    setGeo(provider)
    return
  }
  const [{ setProvider: setGeo }, { provider }] = await Promise.all([
    import('@molecule/api-geolocation'),
    import('@molecule/api-geolocation-google'),
  ])
  setGeo(provider)
}

/** Wires `@molecule/api-media-streaming-hls` to `@molecule/api-media-streaming`. */
export async function setupMediaStreamingHls(): Promise<void> {
  const [{ setProvider: setMedia }, { provider }] = await Promise.all([
    import('@molecule/api-media-streaming'),
    import('@molecule/api-media-streaming-hls'),
  ])
  setMedia(provider)
}

/**
 * Wires `@molecule/api-rate-limit-memory` to `@molecule/api-rate-limit`.
 *
 * This is the default brute-force-protection backend for `mlcl`-generated apps
 * (single-instance). Multi-instance deployments should swap in
 * `@molecule/api-rate-limit-redis` so the throttle is shared across replicas.
 */
export async function setupRateLimitMemory(): Promise<void> {
  const [{ setProvider: setRateLimit }, { provider }] = await Promise.all([
    import('@molecule/api-rate-limit'),
    import('@molecule/api-rate-limit-memory'),
  ])
  setRateLimit(provider)
}
