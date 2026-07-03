/**
 * OpenExchangeRates implementation of {@link FxRatesProvider}.
 *
 * Wraps the JSON endpoints under `https://openexchangerates.org/api/`:
 *
 * - `latest.json?app_id=...&base=USD` — current pivot rates.
 * - `historical/YYYY-MM-DD.json?app_id=...&base=USD` — dated pivot rates.
 * - `currencies.json` — supported ISO 4217 codes (no key required).
 *
 * Free-tier accounts are locked to `base=USD`; cross-rate requests pivot
 * through USD (`USD->X = rates[X]`, `X->Y = rates[Y] / rates[X]`). Paid
 * plans (`Developer`/`Enterprise`/`Unlimited`) may pass an arbitrary `base`
 * via {@link OpenExchangeFxRatesConfig.base}.
 *
 * Snapshots are cached in memory for a configurable TTL (default 1h) and,
 * when the `'cache'` bond is registered, written through to it as well.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { get as getBond, isBonded } from '@molecule/api-bond'
import type {
  CurrencyCode,
  FxDailyRates,
  FxRatesOptions,
  FxRatesProvider,
} from '@molecule/api-fx-rates'

import type { OpenExchangeFxRatesConfig, OpenExchangeSnapshot } from './types.js'

/** Default OpenExchangeRates API base URL. */
const DEFAULT_BASE_URL = 'https://openexchangerates.org/api'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default in-memory snapshot cache TTL: 1 hour. */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000

/** Default pivot. Free-tier accounts MUST leave this as `'USD'`. */
const DEFAULT_BASE: CurrencyCode = 'USD'

/** Cache-key prefix used for both the in-memory map and the optional `'cache'` bond. */
const CACHE_KEY_PREFIX = 'molecule:fx-rates:openexchange:'

/**
 * Minimal `'cache'` bond surface used by this provider. We intentionally
 * avoid importing the cache core types so this bond keeps its peer-dep
 * surface small (only `@molecule/api-fx-rates` and `@molecule/api-bond`).
 */
interface MinimalCacheBond {
  /**
   * Reads a value from the cache by key.
   *
   * @param key - The cache key.
   * @returns The cached value, or `undefined` if missing or expired.
   */
  get<T>(key: string): Promise<T | undefined>

  /**
   * Writes a value to the cache.
   *
   * @param key - The cache key.
   * @param value - The value to cache.
   * @param options - Optional cache write options.
   * @param options.ttl - Time-to-live in seconds.
   * @returns A promise that resolves when the value has been stored.
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>
}

/**
 * Internal entry shape for the in-memory snapshot cache.
 */
interface SnapshotCacheEntry {
  /** Snapshot value. */
  snapshot: OpenExchangeSnapshot
  /** Wall-clock millisecond timestamp at which the entry expires. */
  expiresAt: number
}

/**
 * Internal entry shape for the in-memory currencies-list cache.
 */
interface CurrenciesCacheEntry {
  /** Sorted ISO 4217 codes returned by `currencies.json`. */
  codes: CurrencyCode[]
  /** Wall-clock millisecond timestamp at which the entry expires. */
  expiresAt: number
}

/**
 * Wire shape returned by `latest.json` and `historical/YYYY-MM-DD.json`.
 *
 * @see https://docs.openexchangerates.org/reference/latest-json
 */
interface LatestResponseBody {
  /** UNIX seconds — when the rates were generated upstream. */
  timestamp: number
  /** Pivot currency the response is quoted against (e.g. `'USD'`). */
  base: string
  /** Map from currency code to rate. */
  rates: Record<string, number>
}

/**
 * Wire shape returned by `currencies.json`.
 *
 * @see https://docs.openexchangerates.org/reference/currencies-json
 */
type CurrenciesResponseBody = Record<string, string>

/**
 * Strips `app_id` and other secret-bearing query parameters from a URL so
 * upstream errors can be surfaced without leaking credentials.
 *
 * @param url - The URL that was being requested.
 * @returns The URL with secret parameters removed.
 */
const sanitizeUrlForError = (url: string): string => {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('app_id')
    return parsed.toString()
  } catch (_error) {
    // If `url` isn't a valid URL, fall back to a path-only string by
    // dropping any query string entirely. The parse error carries no
    // actionable information — the URL itself is the diagnostic.
    const queryIndex = url.indexOf('?')
    return queryIndex >= 0 ? url.slice(0, queryIndex) : url
  }
}

/**
 * Looks up the optional `'cache'` bond if one is registered. Returns
 * `undefined` if the bond infra is not configured to expect `'cache'` or
 * no provider is bonded — both are non-fatal for this provider.
 *
 * @returns The bonded cache, or `undefined`.
 */
const tryGetCacheBond = (): MinimalCacheBond | undefined => {
  try {
    if (!isBonded('cache')) {
      return undefined
    }
    return getBond<MinimalCacheBond>('cache')
  } catch (_error) {
    // Bond infrastructure may not be registered in all environments; a
    // missing cache bond is non-fatal for the FX provider.
    return undefined
  }
}

/**
 * Coerces an UNIX-seconds timestamp into a UTC `Date`.
 *
 * @param timestamp - UNIX seconds.
 * @returns A `Date` at the corresponding UTC instant.
 */
const fromUnixSeconds = (timestamp: number): Date => new Date(timestamp * 1000)

/**
 * Converts a {@link LatestResponseBody} into our normalised
 * {@link OpenExchangeSnapshot}, ensuring the pivot itself is present with
 * rate `1`.
 *
 * @param body - Parsed JSON body.
 * @returns Normalised snapshot.
 */
export const snapshotFromBody = (body: LatestResponseBody): OpenExchangeSnapshot => {
  const base = String(body.base)
  const rates: Record<CurrencyCode, number> = { ...body.rates, [base]: 1 }
  return {
    asOf: fromUnixSeconds(Number(body.timestamp)),
    base,
    rates,
  }
}

/**
 * Computes the conversion rate `1 unit of from = rate units of to` from a
 * pivot snapshot. Both sides may equal the pivot.
 *
 * @param snapshot - The dated snapshot to read.
 * @param from - Source currency.
 * @param to - Target currency.
 * @returns The conversion ratio as a plain number.
 * @throws {Error} If either currency is missing from the snapshot.
 */
export const computeRate = (
  snapshot: OpenExchangeSnapshot,
  from: CurrencyCode,
  to: CurrencyCode,
): number => {
  if (from === to) {
    return 1
  }
  const fromRate = snapshot.rates[from]
  const toRate = snapshot.rates[to]
  if (fromRate === undefined) {
    throw new Error(`OpenExchange snapshot does not include source currency: ${from}`)
  }
  if (toRate === undefined) {
    throw new Error(`OpenExchange snapshot does not include target currency: ${to}`)
  }
  // Pivot-quoted: 1 from = (toRate / fromRate) to.
  return toRate / fromRate
}

/**
 * Converts a `Date` (or `undefined` for "latest") to the `YYYY-MM-DD` key
 * the historical endpoint expects, using UTC.
 *
 * @param date - Optional date.
 * @returns `'latest'` if `date` is omitted, otherwise the UTC date string.
 */
const asOfKey = (date: Date | undefined): string => {
  if (!date) {
    return 'latest'
  }
  return date.toISOString().slice(0, 10)
}

/**
 * Creates an OpenExchangeRates FX-rates provider.
 *
 * @param config - Provider configuration. `appId` may be omitted to fall
 *   back to `process.env['OPENEXCHANGE_APP_ID']`.
 * @returns An {@link FxRatesProvider} backed by OpenExchangeRates.
 */
export const createProvider = (config: OpenExchangeFxRatesConfig = {}): FxRatesProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const base = config.base ?? DEFAULT_BASE
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS

  /** Per-provider in-memory snapshot cache (keyed by asOf key). */
  const memCache = new Map<string, SnapshotCacheEntry>()

  /** Per-provider in-memory currencies-list cache. */
  let currenciesCache: CurrenciesCacheEntry | undefined

  /**
   * Resolves the effective `app_id`. Throws a sanitized error if neither
   * the explicit config field nor the env var is set.
   *
   * @returns The resolved app_id.
   * @throws {Error} If no app_id can be resolved.
   */
  const resolveAppId = (): string => {
    const appId = config.appId ?? process.env['OPENEXCHANGE_APP_ID']
    if (!appId) {
      throw new Error(
        'OpenExchangeRates provider is missing app_id (set OPENEXCHANGE_APP_ID or pass config.appId)',
      )
    }
    return appId
  }

  /**
   * Performs a GET request against an OpenExchange endpoint and returns the
   * parsed JSON body. Errors NEVER include the `app_id`.
   *
   * @param path - Path appended to the base URL.
   * @param params - Query parameters (excluding `app_id`).
   * @returns The parsed JSON body.
   * @throws {Error} If the upstream returns a non-OK status or aborts.
   */
  const fetchJson = async <T>(path: string, params: Record<string, string>): Promise<T> => {
    const url = new URL(`${baseUrl}/${path}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    url.searchParams.set('app_id', resolveAppId())

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(
          `OpenExchange request to ${sanitizeUrlForError(url.toString())} failed with status ${String(response.status)}`,
        )
      }
      return (await response.json()) as T
    } catch (error) {
      // Re-throw with a sanitized message if anything in the message looks
      // like it could carry an app_id (defence in depth — fetch errors
      // generally don't, but timeouts/aborts may include the URL).
      if (error instanceof Error && error.message.includes('app_id=')) {
        throw new Error(
          `OpenExchange request to ${sanitizeUrlForError(url.toString())} failed: ${sanitizeUrlForError(error.message)}`,
          { cause: error },
        )
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Reads a snapshot from the in-memory cache, ignoring expired entries.
   *
   * @param key - Cache key.
   * @returns The cached snapshot, or `undefined` if missing or expired.
   */
  const memGet = (key: string): OpenExchangeSnapshot | undefined => {
    const entry = memCache.get(key)
    if (!entry) {
      return undefined
    }
    if (entry.expiresAt <= Date.now()) {
      memCache.delete(key)
      return undefined
    }
    return entry.snapshot
  }

  /**
   * Writes a snapshot to the in-memory cache and (when the `'cache'` bond is
   * registered) the bonded cache provider too.
   *
   * @param key - Cache key.
   * @param snapshot - The snapshot to cache.
   * @returns A promise that resolves once both caches are updated.
   */
  const cacheSet = async (key: string, snapshot: OpenExchangeSnapshot): Promise<void> => {
    if (cacheTtlMs > 0) {
      memCache.set(key, { snapshot, expiresAt: Date.now() + cacheTtlMs })
    }
    const cacheBond = tryGetCacheBond()
    if (cacheBond) {
      try {
        await cacheBond.set(`${CACHE_KEY_PREFIX}${key}`, snapshot, {
          ttl: Math.max(1, Math.floor(cacheTtlMs / 1000)),
        })
      } catch (_error) {
        // Cache write-throughs are best-effort: a failure must not bubble
        // up and break a successful FX-rate lookup.
      }
    }
  }

  /**
   * Reads a snapshot from in-memory cache first, then the optional `'cache'`
   * bond. Returns `undefined` if neither has it.
   *
   * @param key - Cache key.
   * @returns The cached snapshot, or `undefined`.
   */
  const cacheGet = async (key: string): Promise<OpenExchangeSnapshot | undefined> => {
    const local = memGet(key)
    if (local) {
      return local
    }
    const cacheBond = tryGetCacheBond()
    if (!cacheBond) {
      return undefined
    }
    try {
      const remote = await cacheBond.get<OpenExchangeSnapshot>(`${CACHE_KEY_PREFIX}${key}`)
      if (remote) {
        // Re-hydrate `asOf` — most cache providers serialise `Date` to a
        // string, so coerce on the way back in.
        const rehydrated: OpenExchangeSnapshot = {
          asOf: remote.asOf instanceof Date ? remote.asOf : new Date(remote.asOf),
          base: remote.base,
          rates: remote.rates,
        }
        if (cacheTtlMs > 0) {
          memCache.set(key, { snapshot: rehydrated, expiresAt: Date.now() + cacheTtlMs })
        }
        return rehydrated
      }
    } catch (_error) {
      // Cache read failures are best-effort; fall through to upstream fetch.
    }
    return undefined
  }

  /**
   * Fetches the latest pivot snapshot, using the cache when fresh.
   *
   * @returns The newest available snapshot.
   */
  const getLatestSnapshot = async (): Promise<OpenExchangeSnapshot> => {
    const cached = await cacheGet('latest')
    if (cached) {
      return cached
    }
    const body = await fetchJson<LatestResponseBody>('latest.json', { base })
    const snapshot = snapshotFromBody(body)
    await cacheSet('latest', snapshot)
    // Index by snapshot date too so an `asOf` lookup that happens to match
    // the upstream's "latest" publication day reuses this fetch.
    await cacheSet(asOfKey(snapshot.asOf), snapshot)
    return snapshot
  }

  /**
   * Fetches a historical snapshot for the requested `asOf` date.
   *
   * @param asOf - Target date.
   * @returns The dated snapshot.
   */
  const getHistoricalSnapshot = async (asOf: Date): Promise<OpenExchangeSnapshot> => {
    const key = asOfKey(asOf)
    const cached = await cacheGet(key)
    if (cached) {
      return cached
    }
    const body = await fetchJson<LatestResponseBody>(`historical/${key}.json`, { base })
    const snapshot = snapshotFromBody(body)
    await cacheSet(key, snapshot)
    return snapshot
  }

  /**
   * Resolves a snapshot for the optional `asOf` parameter, picking the
   * `latest.json` endpoint when `asOf` is omitted and `historical/...json`
   * otherwise.
   *
   * @param options - Optional `{ asOf }` from the caller.
   * @returns The resolved snapshot.
   */
  const resolveSnapshot = async (options?: FxRatesOptions): Promise<OpenExchangeSnapshot> => {
    if (!options?.asOf) {
      return getLatestSnapshot()
    }
    return getHistoricalSnapshot(options.asOf)
  }

  /**
   * Builds the public `FxDailyRates` shape from an internal snapshot.
   *
   * @param snapshot - The dated snapshot.
   * @returns The normalised daily rates.
   */
  const toDailyRates = (snapshot: OpenExchangeSnapshot): FxDailyRates => ({
    pivot: snapshot.base,
    asOf: snapshot.asOf,
    rates: snapshot.rates,
  })

  /**
   * Fetches the supported-currencies list, caching it for the configured
   * TTL. `currencies.json` is keyless on the upstream but we still send the
   * `app_id` for usage attribution.
   *
   * @returns Sorted ISO 4217 codes.
   */
  const fetchSupportedCurrencies = async (): Promise<CurrencyCode[]> => {
    if (currenciesCache && currenciesCache.expiresAt > Date.now()) {
      return currenciesCache.codes
    }
    const body = await fetchJson<CurrenciesResponseBody>('currencies.json', {})
    const codes = Object.keys(body).sort()
    if (cacheTtlMs > 0) {
      currenciesCache = { codes, expiresAt: Date.now() + cacheTtlMs }
    }
    return codes
  }

  return {
    async getRate(from: CurrencyCode, to: CurrencyCode, options?: FxRatesOptions): Promise<number> {
      const snapshot = await resolveSnapshot(options)
      return computeRate(snapshot, from, to)
    },

    async getDailyRates(options?: FxRatesOptions): Promise<FxDailyRates> {
      const snapshot = await resolveSnapshot(options)
      return toDailyRates(snapshot)
    },

    async convert(
      amountMinor: number,
      from: CurrencyCode,
      to: CurrencyCode,
      options?: FxRatesOptions,
    ): Promise<number> {
      const snapshot = await resolveSnapshot(options)
      const rate = computeRate(snapshot, from, to)
      // Caller passes integer minor units in `from`; we round the converted
      // value to the nearest integer minor unit in `to` so the contract
      // (integer in, integer out) is honoured. Currencies with different
      // minor-unit scales (e.g. JPY: 0 decimals vs USD: 2) are the caller's
      // responsibility — we don't second-guess scale here.
      return Math.round(amountMinor * rate)
    },

    async listSupportedCurrencies(): Promise<CurrencyCode[]> {
      return fetchSupportedCurrencies()
    },
  }
}

/** Default provider instance, lazily initialised on first use. */
let _provider: FxRatesProvider | null = null

/**
 * Default OpenExchangeRates FX-rates provider, lazily constructed on first
 * access.
 *
 * Reads `OPENEXCHANGE_APP_ID` (required) and the optional
 * `OPENEXCHANGE_FX_BASE_URL` from the environment. The `app_id` value is
 * never echoed back in error messages.
 */
export const provider: FxRatesProvider = new Proxy({} as FxRatesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPENEXCHANGE_FX_BASE_URL']
          ? { baseUrl: process.env['OPENEXCHANGE_FX_BASE_URL'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPENEXCHANGE_FX_BASE_URL']
          ? { baseUrl: process.env['OPENEXCHANGE_FX_BASE_URL'] }
          : {}),
      })
    }
    return Reflect.set(_provider, prop, value)
  },
})
