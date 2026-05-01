/**
 * Oura Cloud API v2 provider implementation.
 *
 * Wraps the Oura Cloud API v2 behind the
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
 *   - `disconnect` always removes the local record, even if the upstream
 *     revoke call fails — leaving a record around is worse than a
 *     stranded provider-side token.
 *   - `getWeight` returns `[]` — Oura does not track body weight. The
 *     bond preserves the `WearableProvider` contract by returning an
 *     empty array rather than a non-deterministic error.
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

import type { OuraAuthorizeStart, OuraProvider, OuraProviderOptions } from './types.js'

/** Stable provider key used in the credentials store and bond name. */
export const PROVIDER_NAME = 'oura'

const DEFAULT_API_BASE_URL = 'https://api.ouraring.com/v2'
const DEFAULT_AUTHORIZE_URL = 'https://cloud.ouraring.com/oauth/authorize'
const DEFAULT_TOKEN_URL = 'https://api.ouraring.com/oauth/token'
const DEFAULT_REVOKE_URL = 'https://api.ouraring.com/oauth/revoke'
const DEFAULT_TIMEOUT_MS = 15_000

const DEFAULT_SCOPES = ['daily', 'heartrate', 'personal', 'session'] as const

// Oura's `sleep_phase_5_min` hypnogram uses 5-minute segments per
// character. RFC link: https://cloud.ouraring.com/v2/docs#operation/sleep_route_v2
const SLEEP_PHASE_SEGMENT_SECONDS = 300

/* -------------------------------------------------------------------------- *
 * Oura response shapes (only what we read).
 * -------------------------------------------------------------------------- */

interface OuraTokenResponse {
  access_token: string
  refresh_token: string
  expires_in?: number
  token_type?: string
  scope?: string
}

interface OuraDailyActivityEntry {
  day: string
  steps?: number
  equivalent_walking_distance?: number
  total_calories?: number
  active_calories?: number
  high_activity_time?: number
  medium_activity_time?: number
  low_activity_time?: number
  inactivity_alerts?: number
  resting_time?: number
  meters_to_target?: number
}

interface OuraDailyActivityResponse {
  data?: OuraDailyActivityEntry[]
}

interface OuraSleepEntry {
  id: string
  day: string
  bedtime_start: string
  bedtime_end: string
  /** Sleep type — `long_sleep` is the user's main nightly sleep. */
  type?: string
  total_sleep_duration?: number
  time_in_bed?: number
  awake_time?: number
  light_sleep_duration?: number
  deep_sleep_duration?: number
  rem_sleep_duration?: number
  restless_periods?: number
  efficiency?: number
  /**
   * Hypnogram string: each character is one 5-minute segment, with
   * `1=deep`, `2=light`, `3=rem`, `4=awake`.
   */
  sleep_phase_5_min?: string
}

interface OuraSleepResponse {
  data?: OuraSleepEntry[]
}

interface OuraHeartRateSample {
  bpm: number
  source?: string
  timestamp: string
}

interface OuraHeartRateResponse {
  data?: OuraHeartRateSample[]
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
  const parts = [`Oura ${scope} failed`]
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
 * Encoding helpers.
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

/* -------------------------------------------------------------------------- *
 * Normalization helpers.
 * -------------------------------------------------------------------------- */

const totalActiveMinutes = (entry: OuraDailyActivityEntry): number => {
  // Oura returns activity-time fields in seconds.
  const high = entry.high_activity_time ?? 0
  const medium = entry.medium_activity_time ?? 0
  const low = entry.low_activity_time ?? 0
  return Math.round((high + medium + low) / 60)
}

/**
 * Translates an Oura `usercollection/daily_activity` entry into the
 * normalized {@link DailyActivity} shape. Missing fields are
 * zero-defaulted so handlers can sum across days without null guards.
 *
 * @param date - The calendar day requested.
 * @param entry - Oura's daily-activity response entry, or `undefined`.
 * @returns A normalized daily activity record.
 */
export const fromOuraActivity = (
  date: WearableDate,
  entry: OuraDailyActivityEntry | undefined,
): DailyActivity => {
  if (!entry) {
    return {
      date,
      steps: 0,
      distanceMeters: 0,
      caloriesOut: 0,
      activeMinutes: 0,
    }
  }
  return {
    date: entry.day || date,
    steps: entry.steps ?? 0,
    // `equivalent_walking_distance` is reported in meters.
    distanceMeters: entry.equivalent_walking_distance ?? 0,
    // `total_calories` is the most-comparable Fitbit `caloriesOut` analog
    // (active + BMR equivalent).
    caloriesOut: entry.total_calories ?? 0,
    activeMinutes: totalActiveMinutes(entry),
  }
}

/**
 * Maps an Oura `sleep_phase_5_min` digit onto our normalized
 * {@link SleepStage} taxonomy. Oura uses `1=deep`, `2=light`, `3=rem`,
 * `4=awake`; anything else falls through to `unknown`.
 *
 * @param digit - The single hypnogram character.
 * @returns A normalized sleep stage.
 */
export const mapSleepPhaseDigit = (digit: string): SleepStage => {
  switch (digit) {
    case '1':
      return 'deep'
    case '2':
      return 'light'
    case '3':
      return 'rem'
    case '4':
      return 'awake'
    default:
      return 'unknown'
  }
}

/**
 * Decodes Oura's `sleep_phase_5_min` hypnogram into a list of contiguous
 * {@link SleepStageSegment} records anchored at `bedtimeStart`.
 *
 * Each character represents a 5-minute window. Adjacent same-stage
 * windows are coalesced into a single segment so consumers don't have
 * to do the bookkeeping.
 *
 * @param hypnogram - The Oura hypnogram string.
 * @param bedtimeStart - ISO 8601 timestamp anchoring segment 0.
 * @returns Decoded sleep segments, or `undefined` when no hypnogram exists.
 */
export const decodeOuraHypnogram = (
  hypnogram: string | undefined,
  bedtimeStart: string,
): SleepStageSegment[] | undefined => {
  if (!hypnogram || hypnogram.length === 0) return undefined
  const anchor = new Date(bedtimeStart).getTime()
  if (Number.isNaN(anchor)) return undefined
  const segments: SleepStageSegment[] = []
  let runStage: SleepStage | null = null
  let runStartIndex = 0
  for (let i = 0; i <= hypnogram.length; i += 1) {
    const stage = i < hypnogram.length ? mapSleepPhaseDigit(hypnogram[i]!) : null
    if (stage !== runStage) {
      if (runStage !== null) {
        const startMs = anchor + runStartIndex * SLEEP_PHASE_SEGMENT_SECONDS * 1000
        const endMs = anchor + i * SLEEP_PHASE_SEGMENT_SECONDS * 1000
        segments.push({
          stage: runStage,
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          durationSeconds: (i - runStartIndex) * SLEEP_PHASE_SEGMENT_SECONDS,
        })
      }
      runStage = stage
      runStartIndex = i
    }
  }
  return segments
}

const stageSummaryFromOura = (entry: OuraSleepEntry): SleepStageSummary | undefined => {
  const out: SleepStageSummary = {}
  // Oura returns stage durations in seconds.
  if (typeof entry.awake_time === 'number') {
    out.awakeMinutes = Math.round(entry.awake_time / 60)
  }
  if (typeof entry.light_sleep_duration === 'number') {
    out.lightMinutes = Math.round(entry.light_sleep_duration / 60)
  }
  if (typeof entry.deep_sleep_duration === 'number') {
    out.deepMinutes = Math.round(entry.deep_sleep_duration / 60)
  }
  if (typeof entry.rem_sleep_duration === 'number') {
    out.remMinutes = Math.round(entry.rem_sleep_duration / 60)
  }
  if (Object.keys(out).length === 0) return undefined
  return out
}

/**
 * Translates an Oura `usercollection/sleep` payload into a list of
 * normalized {@link SleepSession} records ordered by start ascending.
 *
 * Oura's `type === 'long_sleep'` corresponds to the user's main nightly
 * sleep — the bond marks any matching session as `isMainSleep: true`,
 * with naps and short sessions as `false`.
 *
 * @param date - Calendar day requested.
 * @param raw - Oura's sleep response payload.
 * @returns Normalized sleep sessions.
 */
export const fromOuraSleep = (date: WearableDate, raw: OuraSleepResponse): SleepSession[] => {
  const entries = raw.data ?? []
  return entries
    .map((entry): SleepSession => {
      const totalSleepSeconds = entry.total_sleep_duration ?? 0
      const timeInBedSeconds = entry.time_in_bed ?? totalSleepSeconds
      const segments = decodeOuraHypnogram(entry.sleep_phase_5_min, entry.bedtime_start)
      return {
        id: String(entry.id),
        date: entry.day || date,
        start: entry.bedtime_start,
        end: entry.bedtime_end,
        timeInBedMinutes: Math.round(timeInBedSeconds / 60),
        timeAsleepMinutes: Math.round(totalSleepSeconds / 60),
        // Oura returns efficiency as 0-100 already.
        efficiency: entry.efficiency,
        isMainSleep: entry.type === 'long_sleep',
        stageSummary: stageSummaryFromOura(entry),
        segments,
      }
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

/**
 * Aggregates an Oura `usercollection/heartrate` payload into the
 * normalized {@link HeartRateSummary} shape.
 *
 * Oura returns per-sample BPM readings rather than a daily resting-HR
 * value or zone breakdown; the bond derives a coarse resting-HR estimate
 * from the minimum sample of the day. Zone data is not reported by this
 * endpoint, so `zones` is left undefined.
 *
 * @param date - Calendar day the response was requested for.
 * @param raw - Oura's heart-rate response payload.
 * @returns A normalized heart-rate summary.
 */
export const fromOuraHeartRate = (
  date: WearableDate,
  raw: OuraHeartRateResponse,
): HeartRateSummary => {
  const samples = raw.data ?? []
  if (samples.length === 0) {
    return { date, restingHeartRate: undefined, zones: undefined }
  }
  let min = Number.POSITIVE_INFINITY
  for (const s of samples) {
    if (typeof s.bpm === 'number' && s.bpm > 0 && s.bpm < min) min = s.bpm
  }
  return {
    date,
    restingHeartRate: Number.isFinite(min) ? min : undefined,
    zones: undefined,
  }
}

/* -------------------------------------------------------------------------- *
 * Provider factory.
 * -------------------------------------------------------------------------- */

/**
 * Creates an Oura wearable provider.
 *
 * @param options - Required: `redirectUri` + `credentialsStore`. Falls
 *   back to `OAUTH_OURA_CLIENT_ID` / `OAUTH_OURA_CLIENT_SECRET` env
 *   vars when `clientId` / `clientSecret` are omitted.
 * @returns An Oura-flavored {@link OuraProvider}.
 */
export const createProvider = (options: OuraProviderOptions): OuraProvider => {
  if (!options.redirectUri) {
    throw new Error('Oura bond is missing required option: redirectUri')
  }
  if (!options.credentialsStore) {
    throw new Error('Oura bond is missing required option: credentialsStore')
  }

  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const authorizeUrl = options.authorizeUrl ?? DEFAULT_AUTHORIZE_URL
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL
  const revokeUrl = options.revokeUrl ?? DEFAULT_REVOKE_URL
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const scopes = options.scopes ?? DEFAULT_SCOPES
  const credentialsStore: WearableCredentialsStore = options.credentialsStore
  const randomBytes =
    options.randomBytes ?? ((size: number) => new Uint8Array(nodeRandomBytes(size)))
  const now = options.now ?? Date.now
  const logger = getLogger()

  const getClientId = (): string => {
    const id = options.clientId ?? process.env.OAUTH_OURA_CLIENT_ID
    if (!id) {
      throw new Error('Oura bond is missing OAUTH_OURA_CLIENT_ID (or clientId option).')
    }
    return id
  }

  const getClientSecret = (): string => {
    const secret = options.clientSecret ?? process.env.OAUTH_OURA_CLIENT_SECRET
    if (!secret) {
      throw new Error('Oura bond is missing OAUTH_OURA_CLIENT_SECRET (or clientSecret option).')
    }
    return secret
  }

  /**
   * Builds Authorization headers for the OAuth token endpoint. Oura
   * accepts client_secret_basic (Basic auth) for both authorization-code
   * and refresh-token grants.
   *
   * @returns Headers for the token call.
   */
  const tokenAuthHeaders = (): Record<string, string> => {
    const clientId = getClientId()
    const clientSecret = getClientSecret()
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    return {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      authorization: `Basic ${basic}`,
    }
  }

  const formEncode = (params: Record<string, string>): string =>
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

  const callTokenEndpoint = async (
    params: Record<string, string>,
    scope: string,
  ): Promise<OuraTokenResponse> => {
    const headers = tokenAuthHeaders()
    const body = formEncode(params)
    try {
      const response = await post<OuraTokenResponse>(tokenUrl, body, {
        headers,
        timeout: timeoutMs,
      })
      const data = response.data
      if (!data?.access_token || !data?.refresh_token) {
        // Do NOT include any field of `data` in the error — Oura may
        // echo tokens back in `error_description` on some failures.
        throw new Error(`Oura ${scope} failed: malformed token response`)
      }
      return data
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`Oura ${scope} failed:`)) {
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
      throw new Error(`Oura connection not found for user '${userId}'`)
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
        logger.error(`Oura ${scope} failed`, sanitizeError(scope, error))
        throw sanitizeError(scope, error)
      }
      try {
        connection = await refreshAccessToken(connection)
        const response = await call(connection.accessToken)
        return response.data
      } catch (retryError) {
        if (retryError instanceof Error && retryError.message.startsWith('Oura bond is missing ')) {
          logger.error(`Oura ${scope} failed`, retryError)
          throw retryError
        }
        logger.error(`Oura ${scope} failed`, sanitizeError(scope, retryError))
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
      ...(extra?.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
    },
    timeout: extra?.timeout ?? timeoutMs,
  })

  const buildAuthorizeUrl = (state: string): string => {
    const params: Record<string, string> = {
      client_id: getClientId(),
      response_type: 'code',
      redirect_uri: options.redirectUri,
      scope: scopes.join(' '),
      state,
    }
    const qs = formEncode(params)
    return authorizeUrl.includes('?') ? `${authorizeUrl}&${qs}` : `${authorizeUrl}?${qs}`
  }

  const startAuthorize = (): OuraAuthorizeStart => {
    const state = base64UrlEncode(randomBytes(16))
    return { url: buildAuthorizeUrl(state), state }
  }

  /**
   * Performs the authorization-code → token exchange and persists the
   * resulting connection.
   *
   * @param userId - Host-app user id.
   * @param code - OAuth authorization code from the redirect callback.
   * @returns The newly-persisted user connection.
   */
  const connectInternal = async (userId: string, code: string): Promise<UserConnection> => {
    const tokenResponse = await callTokenEndpoint(
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: options.redirectUri,
      },
      'connect',
    )
    const connection: UserConnection = {
      userId,
      // Oura's token endpoint does not return a stable user id; the host
      // can fetch `usercollection/personal_info` separately if it needs
      // one. For now we leave `providerAccountId` empty.
      providerAccountId: '',
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

  return {
    providerName: PROVIDER_NAME,

    startAuthorize,

    async connect(userId: string, code: string): Promise<UserConnection> {
      return connectInternal(userId, code)
    },

    async refreshConnection(userId: string): Promise<UserConnection> {
      const connection = await loadConnection(userId)
      try {
        return await refreshAccessToken(connection)
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Oura ')) {
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
        logger.error('Oura disconnect read failed', sanitizeError('disconnect', error))
      }
      if (connection) {
        try {
          // Oura's revoke endpoint accepts the access token in the body.
          const headers = tokenAuthHeaders()
          const body = formEncode({ access_token: connection.accessToken })
          await post(revokeUrl, body, { headers, timeout: timeoutMs })
        } catch (error) {
          // Best-effort revoke — the local record still must be removed
          // below. Sanitize so the access token never leaks.
          logger.error('Oura revoke failed', sanitizeError('disconnect', error))
        }
      }
      await credentialsStore.remove(userId, PROVIDER_NAME)
    },

    async getDailyActivity(userId: string, date: WearableDate): Promise<DailyActivity> {
      const data = await withAuth<OuraDailyActivityResponse>(
        'getDailyActivity',
        userId,
        (accessToken) =>
          get<OuraDailyActivityResponse>(
            `${apiBaseUrl}/usercollection/daily_activity?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}`,
            authedRequestOptions(accessToken),
          ),
      )
      const entry = (data.data ?? []).find((d) => d.day === date) ?? data.data?.[0]
      return fromOuraActivity(date, entry)
    },

    async getDailySleep(userId: string, date: WearableDate): Promise<SleepSession[]> {
      const data = await withAuth<OuraSleepResponse>('getDailySleep', userId, (accessToken) =>
        get<OuraSleepResponse>(
          `${apiBaseUrl}/usercollection/sleep?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}`,
          authedRequestOptions(accessToken),
        ),
      )
      return fromOuraSleep(date, data)
    },

    async getDailyHeartRate(userId: string, date: WearableDate): Promise<HeartRateSummary> {
      // Oura's heart-rate endpoint takes ISO-8601 datetimes, not calendar
      // days. We bucket the requested calendar day in UTC; hosts that need
      // local-day buckets can wire their own range.
      const startDatetime = `${date}T00:00:00+00:00`
      const endDatetime = `${date}T23:59:59+00:00`
      const data = await withAuth<OuraHeartRateResponse>(
        'getDailyHeartRate',
        userId,
        (accessToken) =>
          get<OuraHeartRateResponse>(
            `${apiBaseUrl}/usercollection/heartrate?start_datetime=${encodeURIComponent(startDatetime)}&end_datetime=${encodeURIComponent(endDatetime)}`,
            authedRequestOptions(accessToken),
          ),
      )
      return fromOuraHeartRate(date, data)
    },

    async getWeight(_userId: string, _range: WearableDateRange): Promise<WeightEntry[]> {
      // Oura does NOT track body weight — there is no equivalent of
      // Fitbit's `body/log/weight` endpoint. Returning an empty array
      // preserves the WearableProvider contract; consumers can detect
      // the absence by checking `result.length === 0` and falling back
      // to a different bond (e.g. `@molecule/api-wearable-fitbit` or
      // `-withings`) for weight readings.
      void _userId
      void _range
      return []
    },
  }
}
