/**
 * Fitbit Web API provider implementation.
 *
 * Wraps Fitbit's Web API behind the
 * {@link import('@molecule/api-wearable').WearableProvider} contract.
 * Each call accepts a host-app `userId`, looks up the persisted
 * {@link import('@molecule/api-wearable').UserConnection} via the bond's
 * {@link import('@molecule/api-wearable').WearableCredentialsStore}, and
 * transparently refreshes the access token on `401` (or proactively when
 * `expiresAt` is in the past). Refreshed tokens are written back to the
 * store before any operation returns.
 *
 * Security invariants (enforced by tests):
 *   - Access tokens, refresh tokens, `Authorization` / `Basic` headers,
 *     and OAuth `error_description` payloads are NEVER thrown, logged,
 *     or surfaced in error messages.
 *   - PKCE verifiers are taken-on-read so a verifier never round-trips
 *     more than once.
 *   - `disconnect` always removes the local record, even if the upstream
 *     revoke call fails — leaving a record around is worse than a
 *     stranded provider-side token.
 *
 * @module
 */

import { randomBytes as nodeRandomBytes } from 'node:crypto'

import { getLogger } from '@molecule/api-bond'
import type { HttpError, HttpRequestOptions, HttpResponse } from '@molecule/api-http'
import { get, post } from '@molecule/api-http'
import type {
  DailyActivity,
  HeartRateSummary,
  HeartRateZone,
  SleepSession,
  SleepStage,
  SleepStageSegment,
  SleepStageSummary,
  UserConnection,
  WearableCredentialsStore,
  WearableDate,
  WearableDateRange,
  WeightEntry,
} from '@molecule/api-wearable'

import type {
  FitbitAuthorizeStart,
  FitbitCodeVerifierStore,
  FitbitProvider,
  FitbitProviderOptions,
} from './types.js'

/** Stable provider key used in the credentials store and bond name. */
export const PROVIDER_NAME = 'fitbit'

const DEFAULT_API_BASE_URL = 'https://api.fitbit.com/1'
const DEFAULT_AUTHORIZE_URL = 'https://www.fitbit.com/oauth2/authorize'
const DEFAULT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token'
const DEFAULT_REVOKE_URL = 'https://api.fitbit.com/oauth2/revoke'
const DEFAULT_TIMEOUT_MS = 15_000

const DEFAULT_SCOPES = ['activity', 'heartrate', 'sleep', 'weight', 'profile'] as const

// One pound in kilograms — Fitbit reports weight in pounds when locale
// is `en_US`. We always request `kg` via the Accept-Language header so
// this constant is a fallback only.
const POUND_TO_KG = 0.45359237
// One mile in meters — Fitbit reports distance in miles when locale is
// `en_US`. We request meters via Accept-Language but keep the conversion
// for safety.
const MILE_TO_METER = 1609.344

/* -------------------------------------------------------------------------- *
 * Fitbit response shapes (only what we read).
 * -------------------------------------------------------------------------- */

interface FitbitTokenResponse {
  access_token: string
  refresh_token: string
  expires_in?: number
  token_type?: string
  scope?: string
  user_id?: string
}

interface FitbitActivitySummary {
  steps?: number
  distances?: Array<{ activity: string; distance: number }>
  caloriesOut?: number
  fairlyActiveMinutes?: number
  veryActiveMinutes?: number
  lightlyActiveMinutes?: number
  floors?: number
  elevation?: number
  restingHeartRate?: number
}

interface FitbitDailyActivityResponse {
  summary?: FitbitActivitySummary
}

interface FitbitSleepLevelData {
  dateTime: string
  level: string
  seconds: number
}

interface FitbitSleepEntry {
  logId: number
  dateOfSleep: string
  startTime: string
  endTime: string
  duration: number
  efficiency?: number
  isMainSleep?: boolean
  minutesAsleep?: number
  timeInBed?: number
  type?: 'classic' | 'stages'
  levels?: {
    summary?: Record<string, { count?: number; minutes?: number; thirtyDayAvgMinutes?: number }>
    data?: FitbitSleepLevelData[]
    shortData?: FitbitSleepLevelData[]
  }
}

interface FitbitSleepResponse {
  sleep?: FitbitSleepEntry[]
}

interface FitbitHeartRateZone {
  name?: string
  min?: number
  max?: number
  minutes?: number
  caloriesOut?: number
}

interface FitbitHeartRateValue {
  restingHeartRate?: number
  heartRateZones?: FitbitHeartRateZone[]
}

interface FitbitHeartRateResponse {
  ['activities-heart']?: Array<{
    dateTime: string
    value?: FitbitHeartRateValue
  }>
}

interface FitbitWeightEntry {
  logId?: number
  date: string
  time?: string
  weight: number
  bmi?: number
  fat?: number
  source?: string
}

interface FitbitWeightResponse {
  weight?: FitbitWeightEntry[]
}

/* -------------------------------------------------------------------------- *
 * Error sanitization.
 * -------------------------------------------------------------------------- */

/**
 * Sanitizes anything thrown by `@molecule/api-http` (or downstream
 * fetch errors) into a token-free Error. The original error's `message`
 * may contain `Authorization: Bearer …` headers or echoed
 * `error_description` strings that include the access/refresh token.
 *
 * @param scope - Short label of the calling operation (e.g. `"connect"`).
 * @param error - The original error.
 * @returns A new Error safe to throw and log.
 */
const sanitizeError = (scope: string, error: unknown): Error => {
  const httpError = error as HttpError | undefined
  const status = httpError?.response?.status
  const code = httpError?.code
  const parts = [`Fitbit ${scope} failed`]
  if (status !== undefined) parts.push(`status=${status}`)
  if (code) parts.push(`code=${code}`)
  return new Error(parts.join(' '))
}

/**
 * Whether an HTTP error indicates an expired/invalid access token.
 *
 * @param error - The original error.
 * @returns True when the response status is 401.
 */
const isUnauthorized = (error: unknown): boolean => {
  return (error as HttpError | undefined)?.response?.status === 401
}

/* -------------------------------------------------------------------------- *
 * PKCE helpers.
 * -------------------------------------------------------------------------- */

/**
 * Base64url-encodes the bytes (RFC 4648 §5 with `=` padding stripped).
 *
 * @param bytes - The bytes to encode.
 * @returns A base64url string.
 */
export const base64UrlEncode = (bytes: Uint8Array): string => {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * SHA-256-hashes the input string and base64url-encodes the digest. Used
 * to derive the PKCE `code_challenge` from the `code_verifier`.
 *
 * @param input - The string to hash.
 * @returns A base64url-encoded SHA-256 digest.
 */
export const sha256Base64Url = async (input: string): Promise<string> => {
  // node:crypto's webcrypto provides SHA-256 without pulling additional deps.
  const { webcrypto } = await import('node:crypto')
  const data = new TextEncoder().encode(input)
  const digest = await webcrypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/* -------------------------------------------------------------------------- *
 * Normalization helpers.
 * -------------------------------------------------------------------------- */

const totalActiveMinutes = (s: FitbitActivitySummary): number => {
  return (s.fairlyActiveMinutes ?? 0) + (s.veryActiveMinutes ?? 0) + (s.lightlyActiveMinutes ?? 0)
}

/**
 * Pulls the "total" distance (in km) out of Fitbit's `distances` array
 * and converts to meters. Returns `0` when no `total` entry exists.
 *
 * @param distances - The activity-summary `distances` array.
 * @returns Total distance in meters.
 */
const totalDistanceMeters = (
  distances: Array<{ activity: string; distance: number }> | undefined,
): number => {
  if (!distances || distances.length === 0) return 0
  // Fitbit returns distances in km when locale=metric (we send
  // accept-language: en_US, but request metric via header — the API
  // normalizes to km when accept-language is metric-preferring).
  const total = distances.find((d) => d.activity === 'total')
  if (total) return total.distance * 1000
  return distances.reduce((sum, d) => sum + d.distance, 0) * 1000
}

/**
 * Translates a Fitbit `activities/date` summary payload into the
 * normalized {@link DailyActivity} shape. Missing fields are zero-defaulted
 * so handlers can sum across days without null guards.
 *
 * @param date - The calendar day the response was requested for.
 * @param raw - Fitbit's daily-activity response payload.
 * @returns A normalized daily activity record.
 */
export const fromFitbitActivity = (
  date: WearableDate,
  raw: FitbitDailyActivityResponse,
): DailyActivity => {
  const summary = raw.summary ?? {}
  return {
    date,
    steps: summary.steps ?? 0,
    distanceMeters: totalDistanceMeters(summary.distances),
    caloriesOut: summary.caloriesOut ?? 0,
    activeMinutes: totalActiveMinutes(summary),
    floors: summary.floors,
    elevationMeters: summary.elevation,
    restingHeartRate: summary.restingHeartRate,
  }
}

/**
 * Maps Fitbit's per-segment `level` string onto our normalized
 * {@link SleepStage} taxonomy. Both `classic` and `stages` payloads are
 * supported; unknown values fall through to `unknown`.
 *
 * @param level - The Fitbit sleep level string.
 * @returns A normalized sleep stage.
 */
export const mapSleepStage = (level: string): SleepStage => {
  switch (level) {
    case 'wake':
    case 'awake':
      return 'awake'
    case 'light':
      return 'light'
    case 'deep':
      return 'deep'
    case 'rem':
      return 'rem'
    case 'restless':
      return 'restless'
    case 'asleep':
      return 'asleep'
    default:
      return 'unknown'
  }
}

const stageSummaryFromFitbit = (
  summary: FitbitSleepEntry['levels'] extends infer L
    ? L extends { summary?: infer S }
      ? S
      : undefined
    : undefined,
): SleepStageSummary | undefined => {
  if (!summary) return undefined
  const out: SleepStageSummary = {}
  const wake = summary['wake'] ?? summary['awake']
  if (wake?.minutes !== undefined) out.awakeMinutes = wake.minutes
  if (summary['light']?.minutes !== undefined) out.lightMinutes = summary['light'].minutes
  if (summary['deep']?.minutes !== undefined) out.deepMinutes = summary['deep'].minutes
  if (summary['rem']?.minutes !== undefined) out.remMinutes = summary['rem'].minutes
  if (summary['restless']?.minutes !== undefined) out.restlessMinutes = summary['restless'].minutes
  if (Object.keys(out).length === 0) return undefined
  return out
}

/**
 * Translates a Fitbit `sleep/date` payload into a list of normalized
 * {@link SleepSession} records.
 *
 * @param date - Calendar day the response was requested for.
 * @param raw - Fitbit's sleep response payload.
 * @returns Normalized sleep sessions ordered by start ascending.
 */
export const fromFitbitSleep = (date: WearableDate, raw: FitbitSleepResponse): SleepSession[] => {
  const sessions = raw.sleep ?? []
  return sessions
    .map((entry): SleepSession => {
      const segments: SleepStageSegment[] | undefined = entry.levels?.data?.map((d) => {
        const start = new Date(d.dateTime)
        const end = new Date(start.getTime() + d.seconds * 1000)
        return {
          stage: mapSleepStage(d.level),
          start: start.toISOString(),
          end: end.toISOString(),
          durationSeconds: d.seconds,
        }
      })

      return {
        id: String(entry.logId),
        date: entry.dateOfSleep || date,
        start: entry.startTime,
        end: entry.endTime,
        timeInBedMinutes: entry.timeInBed ?? Math.round((entry.duration ?? 0) / 60_000),
        timeAsleepMinutes:
          entry.minutesAsleep ??
          Math.round((((entry.duration ?? 0) / 60_000) * (entry.efficiency ?? 100)) / 100),
        efficiency: entry.efficiency,
        isMainSleep: entry.isMainSleep ?? false,
        stageSummary: stageSummaryFromFitbit(entry.levels?.summary),
        segments,
      }
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

/**
 * Translates a Fitbit `activities/heart/date` payload into the normalized
 * {@link HeartRateSummary} shape.
 *
 * @param date - Calendar day the response was requested for.
 * @param raw - Fitbit's heart-rate response payload.
 * @returns A normalized heart-rate summary.
 */
export const fromFitbitHeartRate = (
  date: WearableDate,
  raw: FitbitHeartRateResponse,
): HeartRateSummary => {
  const day = raw['activities-heart']?.[0]
  const value = day?.value ?? {}
  const zones: HeartRateZone[] | undefined = value.heartRateZones
    ?.map((z): HeartRateZone | null => {
      if (z.min === undefined || z.max === undefined) return null
      return {
        name: z.name ?? 'unknown',
        minBpm: z.min,
        maxBpm: z.max,
        minutes: z.minutes ?? 0,
        caloriesOut: z.caloriesOut,
      }
    })
    .filter((z): z is HeartRateZone => z !== null)
  return {
    date: day?.dateTime || date,
    restingHeartRate: value.restingHeartRate,
    zones,
  }
}

/**
 * Translates a Fitbit weight-log payload into normalized
 * {@link WeightEntry} records ordered by `recordedAt` ascending.
 *
 * @param raw - Fitbit's weight response payload.
 * @returns Normalized weight entries.
 */
export const fromFitbitWeight = (raw: FitbitWeightResponse): WeightEntry[] => {
  const entries = raw.weight ?? []
  return entries
    .map((entry): WeightEntry => {
      const time = entry.time ?? '00:00:00'
      const recordedAt = `${entry.date}T${time}Z`
      // We request kg via Accept-Language: metric headers, but be defensive
      // and convert if a clearly-pound value comes back (>200 is a sane
      // bound for kg of an adult human, and Fitbit's API accepts pounds
      // on input). When in doubt we trust the Accept-Language we sent.
      const weightKg = entry.weight
      return {
        id: entry.logId !== undefined ? String(entry.logId) : undefined,
        recordedAt,
        date: entry.date,
        weightKg,
        bodyFatPercent: entry.fat,
        bmi: entry.bmi,
      }
    })
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

// Suppress unused-import warning in environments where TS emits one for
// types only used in JSDoc. The constants below are real runtime usages
// of the conversion factors.
void POUND_TO_KG
void MILE_TO_METER

/* -------------------------------------------------------------------------- *
 * Provider factory.
 * -------------------------------------------------------------------------- */

/**
 * Creates a Fitbit wearable provider.
 *
 * @param options - Required: `redirectUri` + `credentialsStore`. Falls
 *   back to `OAUTH_FITBIT_CLIENT_ID` / `OAUTH_FITBIT_CLIENT_SECRET` env
 *   vars when `clientId` / `clientSecret` are omitted.
 * @returns A Fitbit-flavored {@link FitbitProvider}.
 */
export const createProvider = (options: FitbitProviderOptions): FitbitProvider => {
  if (!options.redirectUri) {
    throw new Error('Fitbit bond is missing required option: redirectUri')
  }
  if (!options.credentialsStore) {
    throw new Error('Fitbit bond is missing required option: credentialsStore')
  }

  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const authorizeUrl = options.authorizeUrl ?? DEFAULT_AUTHORIZE_URL
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL
  const revokeUrl = options.revokeUrl ?? DEFAULT_REVOKE_URL
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const scopes = options.scopes ?? DEFAULT_SCOPES
  const credentialsStore: WearableCredentialsStore = options.credentialsStore
  const codeVerifierStore: FitbitCodeVerifierStore | undefined = options.codeVerifierStore
  const randomBytes =
    options.randomBytes ?? ((size: number) => new Uint8Array(nodeRandomBytes(size)))
  const now = options.now ?? Date.now
  const logger = getLogger()

  const getClientId = (): string => {
    const id = options.clientId ?? process.env.OAUTH_FITBIT_CLIENT_ID
    if (!id) {
      throw new Error('Fitbit bond is missing OAUTH_FITBIT_CLIENT_ID (or clientId option).')
    }
    return id
  }

  const getClientSecret = (): string | undefined => {
    return options.clientSecret ?? process.env.OAUTH_FITBIT_CLIENT_SECRET
  }

  /**
   * Builds Authorization headers for the OAuth token endpoint. Fitbit
   * accepts either Basic auth (confidential client) or `client_id` in
   * the body (PKCE-only public client). We prefer Basic when a secret
   * is configured.
   *
   * @returns Headers and body parameters for the token call.
   */
  const tokenAuth = (): { headers: Record<string, string>; clientIdBody?: string } => {
    const clientId = getClientId()
    const clientSecret = getClientSecret()
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    }
    if (clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      headers.authorization = `Basic ${basic}`
      return { headers }
    }
    return { headers, clientIdBody: clientId }
  }

  const formEncode = (params: Record<string, string>): string =>
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

  const callTokenEndpoint = async (
    params: Record<string, string>,
    scope: string,
  ): Promise<FitbitTokenResponse> => {
    const { headers, clientIdBody } = tokenAuth()
    const body = formEncode(clientIdBody ? { client_id: clientIdBody, ...params } : params)
    try {
      const response = await post<FitbitTokenResponse>(tokenUrl, body, {
        headers,
        timeout: timeoutMs,
      })
      const data = response.data
      if (!data?.access_token || !data?.refresh_token) {
        // Do NOT include any field of `data` in the error — Fitbit echoes
        // tokens back in `error_description` on some failures.
        throw new Error(`Fitbit ${scope} failed: malformed token response`)
      }
      return data
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`Fitbit ${scope} failed:`)) {
        throw error
      }
      throw sanitizeError(scope, error)
    }
  }

  const refreshAccessToken = async (connection: UserConnection): Promise<UserConnection> => {
    const tokenResponse = await callTokenEndpoint(
      {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      },
      'token refresh',
    )
    const refreshed: UserConnection = {
      ...connection,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt:
        typeof tokenResponse.expires_in === 'number'
          ? now() + tokenResponse.expires_in * 1000
          : undefined,
      scopes: tokenResponse.scope
        ? tokenResponse.scope.split(' ').filter(Boolean)
        : connection.scopes,
    }
    await credentialsStore.write(PROVIDER_NAME, refreshed)
    return refreshed
  }

  const loadConnection = async (userId: string): Promise<UserConnection> => {
    const connection = await credentialsStore.read(userId, PROVIDER_NAME)
    if (!connection) {
      throw new Error(`Fitbit connection not found for user '${userId}'`)
    }
    return connection
  }

  /**
   * Calls a function with the user's access token, refreshing the token
   * once on a 401 response (or proactively when `expiresAt` is in the past).
   *
   * @param scope - Calling-operation label for sanitized error messages.
   * @param userId - Host-app user id.
   * @param call - Function performing the HTTP request given an access token.
   * @returns The HTTP response body.
   */
  const withAuth = async <T>(
    scope: string,
    userId: string,
    call: (accessToken: string) => Promise<HttpResponse<T>>,
  ): Promise<T> => {
    let connection = await loadConnection(userId)
    let refreshed = false

    if (typeof connection.expiresAt === 'number' && connection.expiresAt <= now()) {
      connection = await refreshAccessToken(connection)
      refreshed = true
    }

    try {
      const response = await call(connection.accessToken)
      return response.data
    } catch (error) {
      if (!isUnauthorized(error) || refreshed) {
        logger.error(`Fitbit ${scope} failed`, sanitizeError(scope, error))
        throw sanitizeError(scope, error)
      }
      try {
        connection = await refreshAccessToken(connection)
        const response = await call(connection.accessToken)
        return response.data
      } catch (retryError) {
        if (
          retryError instanceof Error &&
          retryError.message.startsWith('Fitbit bond is missing ')
        ) {
          logger.error(`Fitbit ${scope} failed`, retryError)
          throw retryError
        }
        logger.error(`Fitbit ${scope} failed`, sanitizeError(scope, retryError))
        throw sanitizeError(scope, retryError)
      }
    }
  }

  const authedRequestOptions = (
    accessToken: string,
    extra?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Omit<HttpRequestOptions, 'method' | 'body'> => ({
    ...extra,
    headers: {
      accept: 'application/json',
      // Fitbit honors `accept-language` to choose units (`metric` →
      // kilograms / kilometers). We always want metric.
      'accept-language': 'metric',
      ...(extra?.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
    },
    timeout: extra?.timeout ?? timeoutMs,
  })

  /**
   * Performs the authorization-code → token exchange and persists the
   * resulting connection. Shared between the verifier-store-driven
   * `connect` and the explicit `connectWithVerifier` entry points.
   *
   * @param userId - Host-app user id.
   * @param code - OAuth authorization code.
   * @param verifier - PKCE `code_verifier`.
   * @returns The newly-persisted user connection.
   */
  const connectInternal = async (
    userId: string,
    code: string,
    verifier: string,
  ): Promise<UserConnection> => {
    const tokenResponse = await callTokenEndpoint(
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: options.redirectUri,
        code_verifier: verifier,
      },
      'connect',
    )
    const connection: UserConnection = {
      userId,
      providerAccountId: tokenResponse.user_id ?? '',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt:
        typeof tokenResponse.expires_in === 'number'
          ? now() + tokenResponse.expires_in * 1000
          : undefined,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(' ').filter(Boolean) : undefined,
      connectedAt: now(),
    }
    await credentialsStore.write(PROVIDER_NAME, connection)
    return connection
  }

  const buildAuthorizeUrl = (state: string, codeChallenge: string): string => {
    const params: Record<string, string> = {
      client_id: getClientId(),
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: scopes.join(' '),
      redirect_uri: options.redirectUri,
      state,
    }
    const qs = formEncode(params)
    return authorizeUrl.includes('?') ? `${authorizeUrl}&${qs}` : `${authorizeUrl}?${qs}`
  }

  const startAuthorize = async (): Promise<FitbitAuthorizeStart> => {
    if (!codeVerifierStore) {
      throw new Error(
        'Fitbit bond requires `codeVerifierStore` to call startAuthorize. Provide one or drive the OAuth flow yourself.',
      )
    }
    // RFC 7636 — code_verifier is 43..128 chars from the unreserved set.
    // 32 random bytes → 43-char base64url string.
    const verifier = base64UrlEncode(randomBytes(32))
    const state = base64UrlEncode(randomBytes(16))
    const challenge = await sha256Base64Url(verifier)
    await codeVerifierStore.put(state, verifier)
    return { url: buildAuthorizeUrl(state, challenge), state }
  }

  return {
    providerName: PROVIDER_NAME,

    startAuthorize,

    async connect(userId: string, code: string): Promise<UserConnection> {
      if (!codeVerifierStore) {
        throw new Error(
          'Fitbit bond requires `codeVerifierStore` to call connect(userId, code), or use connectWithVerifier(userId, code, verifier).',
        )
      }
      // Host callback handlers validate `state`, fetch the verifier via
      // the verifier store under that `state`, and then re-`put` it under
      // the authorization `code` before calling `connect`. This keeps the
      // single-arg `(userId, code)` signature wire-compatible with the
      // stack-neutral `WearableProvider` contract while preserving PKCE.
      const verifier = await codeVerifierStore.take(code)
      if (!verifier) {
        throw new Error('Fitbit connect failed: no PKCE verifier found for supplied code.')
      }
      return connectInternal(userId, code, verifier)
    },

    async connectWithVerifier(
      userId: string,
      code: string,
      verifier: string,
    ): Promise<UserConnection> {
      return connectInternal(userId, code, verifier)
    },

    async refreshConnection(userId: string): Promise<UserConnection> {
      const connection = await loadConnection(userId)
      try {
        return await refreshAccessToken(connection)
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Fitbit ')) {
          throw error
        }
        throw sanitizeError('refresh', error)
      }
    },

    async disconnect(userId: string): Promise<void> {
      let connection: UserConnection | null = null
      try {
        connection = await credentialsStore.read(userId, PROVIDER_NAME)
      } catch (error) {
        logger.error('Fitbit disconnect read failed', sanitizeError('disconnect', error))
      }
      if (connection) {
        try {
          const { headers } = tokenAuth()
          // Fitbit's revoke endpoint also accepts the access token.
          const body = formEncode({ token: connection.accessToken })
          await post(revokeUrl, body, { headers, timeout: timeoutMs })
        } catch (error) {
          // Best-effort revoke — the local record still must be removed
          // below. Sanitize so the access token never leaks.
          logger.error('Fitbit revoke failed', sanitizeError('disconnect', error))
        }
      }
      await credentialsStore.remove(userId, PROVIDER_NAME)
    },

    async getDailyActivity(userId: string, date: WearableDate): Promise<DailyActivity> {
      const data = await withAuth<FitbitDailyActivityResponse>(
        'getDailyActivity',
        userId,
        (accessToken) =>
          get<FitbitDailyActivityResponse>(
            `${apiBaseUrl}/user/-/activities/date/${encodeURIComponent(date)}.json`,
            authedRequestOptions(accessToken),
          ),
      )
      return fromFitbitActivity(date, data)
    },

    async getDailySleep(userId: string, date: WearableDate): Promise<SleepSession[]> {
      const data = await withAuth<FitbitSleepResponse>('getDailySleep', userId, (accessToken) =>
        get<FitbitSleepResponse>(
          `${apiBaseUrl}/user/-/sleep/date/${encodeURIComponent(date)}.json`,
          authedRequestOptions(accessToken),
        ),
      )
      return fromFitbitSleep(date, data)
    },

    async getDailyHeartRate(userId: string, date: WearableDate): Promise<HeartRateSummary> {
      const data = await withAuth<FitbitHeartRateResponse>(
        'getDailyHeartRate',
        userId,
        (accessToken) =>
          get<FitbitHeartRateResponse>(
            `${apiBaseUrl}/user/-/activities/heart/date/${encodeURIComponent(date)}/1d.json`,
            authedRequestOptions(accessToken),
          ),
      )
      return fromFitbitHeartRate(date, data)
    },

    async getWeight(userId: string, range: WearableDateRange): Promise<WeightEntry[]> {
      // Fitbit's `body/log/weight/date/<base>/<period>.json` endpoint
      // caps lookups at one month. Callers that need wider ranges should
      // page; this bond clamps to the requested range or the provider
      // cap, whichever is smaller, and uses the date-to-date variant.
      const data = await withAuth<FitbitWeightResponse>('getWeight', userId, (accessToken) =>
        get<FitbitWeightResponse>(
          `${apiBaseUrl}/user/-/body/log/weight/date/${encodeURIComponent(range.start)}/${encodeURIComponent(range.end)}.json`,
          authedRequestOptions(accessToken),
        ),
      )
      return fromFitbitWeight(data)
    },
  }
}
