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

import { bond } from '@molecule/api-bond'
import { setProvider as setConfig } from '@molecule/api-config'
import { setTransport as setEmails } from '@molecule/api-emails'
import { provider as emailsMailgunProvider } from '@molecule/api-emails-mailgun'
import { paymentProvider as stripePaymentProvider } from '@molecule/api-payments-stripe'
import { paymentRecordService, planService } from '@molecule/api-resource-payment'
import { setProvider as setSearch } from '@molecule/api-search'
import { provider as searchMeilisearchProvider } from '@molecule/api-search-meilisearch'
import { setProvider as setUploads } from '@molecule/api-uploads'
import { provider as uploadsS3Provider } from '@molecule/api-uploads-s3'
import { provider as configProvider } from '@molecule/api-config-env'
import { setPool, setStore } from '@molecule/api-database'
import { pool as dbPool, store as dbStore } from '@molecule/api-database-postgresql'
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
import { deviceService } from '@molecule/api-resource-device'
import { setProvider as setSecrets } from '@molecule/api-secrets'
import { provider as secretsProvider } from '@molecule/api-secrets-env'
import { setProvider as setTwoFactor } from '@molecule/api-two-factor'
import { provider as twoFactorProvider } from '@molecule/api-two-factor-otplib'

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
  setSearch(searchMeilisearchProvider)
}

/** Wires `@molecule/api-uploads-s3` to `@molecule/api-uploads`. */
export function setupUploadsS3(): void {
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
  const [{ setProvider: setRealtime }, { createProvider }] = await Promise.all([
    import('@molecule/api-realtime'),
    import('@molecule/api-realtime-socketio'),
  ])
  setRealtime(createProvider())
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
  const [{ setProvider: setGeo }, { provider }] = await Promise.all([
    import('@molecule/api-geolocation'),
    import('@molecule/api-geolocation-mapbox'),
  ])
  setGeo(provider)
}

/** Wires `@molecule/api-cache-redis` to `@molecule/api-cache`. */
export async function setupCacheRedis(): Promise<void> {
  const [{ setProvider: setCache }, { provider }] = await Promise.all([
    import('@molecule/api-cache'),
    import('@molecule/api-cache-redis'),
  ])
  setCache(provider)
}

/** Registers `@molecule/api-ai-openai` as a named `'openai'` AI provider. */
export async function setupAiOpenai(): Promise<void> {
  const { createProvider } = await import('@molecule/api-ai-openai')
  bond('ai', 'openai', createProvider())
}

/** Wires `@molecule/api-ai-embeddings-openai` to `@molecule/api-ai-embeddings`. */
export async function setupAiEmbeddingsOpenai(): Promise<void> {
  const [{ setProvider: setEmb }, { provider }] = await Promise.all([
    import('@molecule/api-ai-embeddings'),
    import('@molecule/api-ai-embeddings-openai'),
  ])
  setEmb(provider)
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
  setSpeech(createProvider())
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
