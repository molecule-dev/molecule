/**
 * ECB implementation of {@link FxRatesProvider}.
 *
 * Wraps the European Central Bank's public reference-rate XML feeds
 * (`eurofxref-daily.xml` and `eurofxref-hist-90d.xml`), which are keyless,
 * free, and EUR-pivoted. Cross-rates are computed by pivoting through EUR
 * (e.g. `USD->GBP = rates[GBP] / rates[USD]`). Snapshots are cached in
 * memory for a configurable TTL (default 1h) and, when the `'cache'` bond
 * is registered, written through to the bonded cache as well.
 *
 * @module
 */

import { get as getBond, isBonded } from '@molecule/api-bond'
import { XMLParser } from 'fast-xml-parser'

import type {
  CurrencyCode,
  FxDailyRates,
  FxRatesOptions,
  FxRatesProvider,
} from '@molecule/api-fx-rates'

import type { EcbDailySnapshot, EcbFxRatesConfig } from './types.js'

/** Default ECB stats endpoint base URL. */
const DEFAULT_BASE_URL = 'https://www.ecb.europa.eu/stats/eurofxref'

/** Default daily-feed XML filename. */
const DEFAULT_DAILY_PATH = 'eurofxref-daily.xml'

/** Default 90-day-history XML filename. */
const DEFAULT_HISTORICAL_PATH = 'eurofxref-hist-90d.xml'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default in-memory snapshot cache TTL: 1 hour. */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000

/** Cache-key prefix used for both the in-memory map and the optional `'cache'` bond. */
const CACHE_KEY_PREFIX = 'molecule:fx-rates:ecb:'

/** ECB pivot currency. */
const PIVOT: CurrencyCode = 'EUR'

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
   * @param options - Optional `{ ttl }` in seconds.
   * @returns A promise that resolves when the value has been stored.
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>
}

/**
 * Internal entry shape for the in-memory snapshot cache.
 */
interface CacheEntry {
  /** Snapshot value. */
  snapshot: EcbDailySnapshot
  /** Wall-clock millisecond timestamp at which the entry expires. */
  expiresAt: number
}

/**
 * Shape returned by `fast-xml-parser` for a single `<Cube currency='X' rate='Y'/>`
 * leaf node, given our parser config (`@_` attribute prefix, parsed numeric
 * attributes).
 */
interface RateLeaf {
  /** Three-letter ISO 4217 currency code (e.g. `'USD'`). */
  '@_currency': string
  /** Conversion ratio: `1 EUR = rate units of currency`. */
  '@_rate': number
}

/**
 * Shape returned for a single dated `<Cube time='YYYY-MM-DD'>...</Cube>` node.
 */
interface DatedCube {
  /** Publication date in `YYYY-MM-DD` form. */
  '@_time': string
  /** One or more rate leaves. fast-xml-parser may unwrap a single leaf to a non-array. */
  Cube: RateLeaf | RateLeaf[]
}

/**
 * Shape of the parsed envelope. fast-xml-parser may unwrap single-element
 * arrays so the dated cube can be either a single object or an array.
 */
interface EnvelopeRoot {
  Envelope: {
    Cube: {
      Cube: DatedCube | DatedCube[]
    }
  }
}

/**
 * XML parser configured for the ECB feed shape.
 */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseAttributeValue: true,
})

/**
 * Parses the YYYY-MM-DD `time` attribute on a dated `<Cube>` into a UTC Date
 * (midnight UTC on the publication day). Throws if the value is malformed.
 *
 * @param time - The `time` attribute value (e.g. `'2026-04-30'`).
 * @returns A `Date` at UTC midnight on the publication day.
 */
const parseEcbDate = (time: string): Date => {
  // Constructing via `${time}T00:00:00Z` yields a deterministic UTC midnight
  // independent of the runtime timezone — important so `asOf.toISOString()
  // .slice(0, 10)` round-trips back to the same ECB date string.
  const parsed = new Date(`${time}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`ECB feed contained an invalid date: ${time}`)
  }
  return parsed
}

/**
 * Normalises a `Cube` field that fast-xml-parser may have unwrapped from
 * a single-element array to a single object.
 *
 * @param value - Either an object or an array of objects.
 * @returns The value coerced to an array.
 */
const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

/**
 * Builds an {@link EcbDailySnapshot} from a single dated `<Cube>` node.
 *
 * @param dated - The parsed dated cube.
 * @returns Normalised snapshot with `EUR: 1` always present.
 */
const snapshotFromDatedCube = (dated: DatedCube): EcbDailySnapshot => {
  const rates: Record<string, number> = { [PIVOT]: 1 }
  for (const leaf of toArray(dated.Cube)) {
    const code = String(leaf['@_currency'])
    const rate = Number(leaf['@_rate'])
    if (!code || Number.isNaN(rate)) {
      continue
    }
    rates[code] = rate
  }
  return {
    asOf: parseEcbDate(String(dated['@_time'])),
    rates,
  }
}

/**
 * Parses the body of an ECB XML feed (daily or historical) into an array of
 * snapshots, sorted newest-first.
 *
 * @param xml - Raw XML body fetched from the ECB endpoint.
 * @returns Snapshots sorted newest-first.
 * @throws {Error} If the XML does not contain at least one dated cube.
 */
export const parseEcbXml = (xml: string): EcbDailySnapshot[] => {
  const parsed = xmlParser.parse(xml) as EnvelopeRoot
  const cubes = parsed?.Envelope?.Cube?.Cube
  if (!cubes) {
    throw new Error('ECB XML did not contain any dated <Cube> nodes')
  }
  const snapshots = toArray(cubes).map(snapshotFromDatedCube)
  // Sort newest-first by epoch ms so callers can pick `[0]` for "latest".
  snapshots.sort((a, b) => b.asOf.getTime() - a.asOf.getTime())
  return snapshots
}

/**
 * Performs a GET request against an ECB endpoint and returns the response
 * body as a string.
 *
 * @param url - Fully-qualified URL.
 * @param timeout - Request timeout in milliseconds.
 * @returns The response body as a UTF-8 string.
 * @throws {Error} If the upstream returns a non-OK status.
 */
const fetchXml = async (url: string, timeout: number): Promise<string> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/xml, text/xml' },
    })
    if (!response.ok) {
      throw new Error(`ECB feed request failed with status ${String(response.status)}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Converts a `Date` (or `undefined` for "latest") to the `YYYY-MM-DD` key
 * the ECB feed publishes, using UTC so it round-trips against
 * {@link parseEcbDate}.
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
  } catch {
    return undefined
  }
}

/**
 * Computes the conversion rate `1 unit of from = rate units of to` from a
 * EUR-pivot snapshot. Both sides may equal the pivot.
 *
 * @param snapshot - The dated snapshot to read.
 * @param from - Source currency.
 * @param to - Target currency.
 * @returns The conversion ratio as a plain number.
 * @throws {Error} If either currency is missing from the snapshot.
 */
export const computeRate = (
  snapshot: EcbDailySnapshot,
  from: CurrencyCode,
  to: CurrencyCode,
): number => {
  if (from === to) {
    return 1
  }
  const fromRate = snapshot.rates[from]
  const toRate = snapshot.rates[to]
  if (fromRate === undefined) {
    throw new Error(`ECB snapshot does not include source currency: ${from}`)
  }
  if (toRate === undefined) {
    throw new Error(`ECB snapshot does not include target currency: ${to}`)
  }
  // EUR-pivoted: 1 from = (toRate / fromRate) to
  return toRate / fromRate
}

/**
 * Creates an ECB FX-rates provider.
 *
 * @param config - Provider configuration. All fields are optional.
 * @returns An {@link FxRatesProvider} backed by the ECB reference-rate feeds.
 */
export const createProvider = (config: EcbFxRatesConfig = {}): FxRatesProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const dailyPath = config.dailyPath ?? DEFAULT_DAILY_PATH
  const historicalPath = config.historicalPath ?? DEFAULT_HISTORICAL_PATH
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS

  /** Per-provider in-memory snapshot cache. */
  const memCache = new Map<string, CacheEntry>()

  /**
   * Reads a snapshot from the in-memory cache, ignoring expired entries.
   *
   * @param key - Cache key.
   * @returns The cached snapshot, or `undefined` if missing or expired.
   */
  const memGet = (key: string): EcbDailySnapshot | undefined => {
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
  const cacheSet = async (key: string, snapshot: EcbDailySnapshot): Promise<void> => {
    if (cacheTtlMs > 0) {
      memCache.set(key, { snapshot, expiresAt: Date.now() + cacheTtlMs })
    }
    const cacheBond = tryGetCacheBond()
    if (cacheBond) {
      try {
        await cacheBond.set(`${CACHE_KEY_PREFIX}${key}`, snapshot, {
          ttl: Math.max(1, Math.floor(cacheTtlMs / 1000)),
        })
      } catch {
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
  const cacheGet = async (key: string): Promise<EcbDailySnapshot | undefined> => {
    const local = memGet(key)
    if (local) {
      return local
    }
    const cacheBond = tryGetCacheBond()
    if (!cacheBond) {
      return undefined
    }
    try {
      const remote = await cacheBond.get<EcbDailySnapshot>(`${CACHE_KEY_PREFIX}${key}`)
      if (remote) {
        // Re-hydrate `asOf` — most cache providers serialise `Date` to a
        // string, so coerce on the way back in.
        const rehydrated: EcbDailySnapshot = {
          asOf: remote.asOf instanceof Date ? remote.asOf : new Date(remote.asOf),
          rates: remote.rates,
        }
        if (cacheTtlMs > 0) {
          memCache.set(key, { snapshot: rehydrated, expiresAt: Date.now() + cacheTtlMs })
        }
        return rehydrated
      }
    } catch {
      // Cache read failures are best-effort; fall through to upstream fetch.
    }
    return undefined
  }

  /**
   * Fetches the latest daily snapshot, using the cache when fresh.
   *
   * @returns The newest available snapshot.
   */
  const getLatestSnapshot = async (): Promise<EcbDailySnapshot> => {
    const cached = await cacheGet('latest')
    if (cached) {
      return cached
    }
    const xml = await fetchXml(`${baseUrl}/${dailyPath}`, timeout)
    const snapshots = parseEcbXml(xml)
    if (snapshots.length === 0) {
      throw new Error('ECB daily feed contained no snapshots')
    }
    const snapshot = snapshots[0]
    await cacheSet('latest', snapshot)
    // Also index by exact date so an `asOf` lookup that happens to match
    // the latest publication day reuses this fetch.
    await cacheSet(asOfKey(snapshot.asOf), snapshot)
    return snapshot
  }

  /**
   * Fetches a historical snapshot for the requested `asOf` date. ECB feeds
   * skip weekends/holidays, so this returns the most recent published
   * snapshot at or before `asOf`.
   *
   * @param asOf - Target date.
   * @returns The dated snapshot, or `undefined` if no snapshot at or before
   *   `asOf` is present in the 90-day history.
   */
  const getHistoricalSnapshot = async (asOf: Date): Promise<EcbDailySnapshot | undefined> => {
    const key = asOfKey(asOf)
    const cached = await cacheGet(key)
    if (cached) {
      return cached
    }
    const xml = await fetchXml(`${baseUrl}/${historicalPath}`, timeout)
    const snapshots = parseEcbXml(xml)
    // Snapshots are newest-first; pick the first whose asOf <= request.
    const target = snapshots.find((s) => s.asOf.getTime() <= asOf.getTime())
    if (!target) {
      return undefined
    }
    // Cache every parsed snapshot under its own date so subsequent dated
    // lookups within the same TTL don't re-fetch the entire history.
    for (const snapshot of snapshots) {
      await cacheSet(asOfKey(snapshot.asOf), snapshot)
    }
    return target
  }

  /**
   * Resolves a snapshot for the optional `asOf` parameter, picking the
   * daily feed when `asOf` is omitted or matches the latest publication day,
   * and falling back to the historical 90-day feed otherwise.
   *
   * @param options - Optional `{ asOf }` from the caller.
   * @returns The resolved snapshot.
   * @throws {Error} If the historical feed has no snapshot at or before
   *   `options.asOf`.
   */
  const resolveSnapshot = async (options?: FxRatesOptions): Promise<EcbDailySnapshot> => {
    if (!options?.asOf) {
      return getLatestSnapshot()
    }
    const requestedKey = asOfKey(options.asOf)
    // If the latest daily snapshot already covers the requested day, prefer
    // it (avoids hitting the larger 90-day endpoint for "today" lookups).
    const latest = await getLatestSnapshot()
    if (asOfKey(latest.asOf) === requestedKey) {
      return latest
    }
    const historical = await getHistoricalSnapshot(options.asOf)
    if (!historical) {
      throw new Error(
        `ECB historical feed has no snapshot at or before ${requestedKey} (90-day window only)`,
      )
    }
    return historical
  }

  /**
   * Builds the public `FxDailyRates` shape from an internal snapshot.
   *
   * @param snapshot - The dated snapshot.
   * @returns The normalised daily rates.
   */
  const toDailyRates = (snapshot: EcbDailySnapshot): FxDailyRates => ({
    pivot: PIVOT,
    asOf: snapshot.asOf,
    rates: snapshot.rates,
  })

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
      const snapshot = await getLatestSnapshot()
      return Object.keys(snapshot.rates).sort()
    },
  }
}

/** Default provider instance, lazily initialised on first use. */
let _provider: FxRatesProvider | null = null

/**
 * Default ECB FX-rates provider, lazily constructed on first access.
 *
 * Reads the optional `ECB_FX_BASE_URL` environment variable to override the
 * endpoint base URL (e.g. for a local mirror in tests). The public ECB
 * endpoints require no key.
 */
export const provider: FxRatesProvider = new Proxy({} as FxRatesProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['ECB_FX_BASE_URL'] ? { baseUrl: process.env['ECB_FX_BASE_URL'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
