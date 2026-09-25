/**
 * Finds and downloads Firefox Translations models and the Bergamot runtime.
 *
 * Firefox publishes its models as records in a Mozilla Remote Settings
 * collection; each record is one file (model, lexical shortlist, vocabulary) of
 * one language pair at one version, with a SHA-256 hash. Models are fetched on
 * first use into the cache directory and verified against that hash before they
 * are used. The runtime — `bergamot-translator.wasm` and the `bergamot-translator.js`
 * loader that must match it byte for byte — is pinned to release v0.6.0 by hash.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { BergamotModelFiles, BergamotModelSpec } from './types.js'

/** Firefox's model list. */
export const DEFAULT_RECORDS_URL =
  'https://firefox.settings.services.mozilla.com/v1/buckets/main/collections/translations-models/records'

/** Firefox's model file CDN. */
export const DEFAULT_ATTACHMENTS_URL = 'https://firefox-settings-attachments.cdn.mozilla.net/'

/**
 * The Bergamot runtime this bond is built against. The WASM comes from Firefox's
 * `translations-wasm` collection (record version 3.0, release v0.6.0); the loader
 * is the one Firefox itself ships beside it (`toolkit/components/translations/
 * bergamot-translator/bergamot-translator.js`), pinned to a Firefox commit. Both
 * are MPL-2.0, from github.com/mozilla/translations.
 */
export const BERGAMOT_RUNTIME = {
  release: 'v0.6.0',
  wasm: {
    path: 'main-workspace/translations-wasm/05082c31-aee8-4249-9e01-c1865afd7520.wasm',
    sha256: 'a3a89d9ad0a4ed8f27bf3e403701b23f5709816f6376438503f2fa5b0182c2dc',
    filename: 'bergamot-translator-v0.6.0.wasm',
  },
  glue: {
    url: 'https://raw.githubusercontent.com/mozilla-firefox/firefox/48d55cf7ec80093903e2ef7f58b61a84a22ef716/toolkit/components/translations/bergamot-translator/bergamot-translator.js',
    sha256: 'faff1ef6285b0d26f01787776fd49299dfb756ecb9688aa990c250e66797b47d',
    filename: 'bergamot-translator-v0.6.0.js',
  },
} as const

/**
 * Newest model major version the v0.6.0 runtime can run. 1.x ("tiny") and 2.x
 * ("base" and CJK) models run on it; 3.x models are zstd-compressed and need a
 * newer runtime.
 */
export const MAX_MODEL_MAJOR_VERSION = 2

/**
 * One record of Firefox's model list (the fields this bond reads).
 */
export interface ModelRecord {
  /** File name, e.g. `model.ende.intgemm.alphas.bin`. */
  name: string
  /** Source language. */
  fromLang: string
  /** Target language. */
  toLang: string
  /** Model version, e.g. `2.1` (pre-releases look like `2.1a1`). */
  version: string
  /** `model`, `lex`, `vocab`, `srcvocab`, `trgvocab` or `qualityModel`. */
  fileType: string
  /** Firefox targeting rule, e.g. only Nightly or only Android (see `matchesServer`). */
  filter_expression?: string
  /** Where the file lives and its hash. */
  attachment: {
    /** SHA-256 of the file. */
    hash: string
    /** Size in bytes. */
    size: number
    /** Path relative to the attachments URL. */
    location: string
  }
}

/**
 * The files of one language pair at one version.
 */
export interface ModelSet {
  /** Source language. */
  from: string
  /** Target language. */
  to: string
  /** Version shared by every file. */
  version: string
  /** The record for each file role. */
  files: Partial<Record<keyof BergamotModelFiles, ModelRecord>>
}

/**
 * The Firefox build a server stands in for when reading a record's targeting
 * rule: desktop, release channel. Records meant only for Android or for
 * Nightly/Beta are skipped; records meant for "everything except Android
 * release" are used.
 */
const SERVER_ENV: Record<string, string> = { 'appinfo.OS': 'Linux', channel: 'release' }

/**
 * Evaluates a Remote Settings targeting rule of the forms Firefox's model list
 * uses (`env.x == 'v'`, `!=`, joined by `||` and `&&`) for a server.
 * Anything else is treated as not matching, so an unknown rule never selects a model.
 *
 * @param expression - The record's `filter_expression`.
 * @returns Whether the record applies to a server.
 */
export function matchesServer(expression: string | undefined): boolean {
  if (!expression || expression.trim() === '') return true
  return expression.split('||').some((clause) =>
    clause.split('&&').every((atom) => {
      const match = /^\s*env\.([\w.]+)\s*(==|!=)\s*'([^']*)'\s*$/.exec(atom)
      if (!match) return false
      const value = SERVER_ENV[match[1]]
      if (value === undefined) return false
      return match[2] === '==' ? value === match[3] : value !== match[3]
    }),
  )
}

/** File roles this bond loads (quality-estimation models are not used). */
const ROLES = ['model', 'lex', 'vocab', 'srcvocab', 'trgvocab'] as const

/**
 * Parses a released version (`2.1`) into numbers; pre-releases return null.
 *
 * @param version - A record's version.
 * @returns `[major, minor]`, or null for a pre-release or malformed version.
 */
function parseVersion(version: string): [number, number] | null {
  const match = /^(\d+)\.(\d+)$/.exec(version)
  return match ? [Number(match[1]), Number(match[2])] : null
}

/**
 * Picks the newest complete, released model set for a pair that applies to a server.
 *
 * A set is complete when it has a model, a lexical shortlist, and either one
 * shared vocabulary or a source + target pair. Files are never mixed across
 * versions.
 *
 * @param records - Firefox's model list.
 * @param from - Source language (model-list code).
 * @param to - Target language (model-list code).
 * @returns The set, or null when Firefox publishes no usable model for the pair.
 */
export function selectModelSet(records: ModelRecord[], from: string, to: string): ModelSet | null {
  const byVersion = new Map<string, ModelSet>()
  for (const record of records) {
    if (
      record.fromLang !== from ||
      record.toLang !== to ||
      !matchesServer(record.filter_expression)
    ) {
      continue
    }
    const version = parseVersion(record.version)
    if (!version || version[0] > MAX_MODEL_MAJOR_VERSION) continue
    const role = record.fileType as keyof BergamotModelFiles
    if (!(ROLES as readonly string[]).includes(role)) continue
    const set = byVersion.get(record.version) ?? { from, to, version: record.version, files: {} }
    set.files[role] = record
    byVersion.set(record.version, set)
  }
  const complete = [...byVersion.values()].filter(
    ({ files }) => files.model && files.lex && (files.vocab || (files.srcvocab && files.trgvocab)),
  )
  complete.sort((a, b) => {
    const [a1, a2] = parseVersion(a.version)!
    const [b1, b2] = parseVersion(b.version)!
    return b1 - a1 || b2 - a2
  })
  return complete[0] ?? null
}

/**
 * Every language pair the list has a usable model for.
 *
 * @param records - Firefox's model list.
 * @returns Pairs as `[from, to]`.
 */
export function availablePairs(records: ModelRecord[]): Array<[string, string]> {
  const seen = new Set<string>()
  const pairs: Array<[string, string]> = []
  for (const { fromLang, toLang } of records) {
    const key = `${fromLang}\u0000${toLang}`
    if (seen.has(key)) continue
    seen.add(key)
    if (selectModelSet(records, fromLang, toLang)) pairs.push([fromLang, toLang])
  }
  return pairs
}

/**
 * Downloads a file once, verifies its SHA-256, and moves it into place atomically.
 * A file already on disk is used as is: it only got there through this hash check
 * (downloads land under a temporary name and are renamed once verified).
 *
 * @param fetchImpl - The `fetch` to use.
 * @param url - Where to download from.
 * @param sha256 - Expected hash.
 * @param dest - Final path.
 * @returns `dest`.
 * @throws {Error} When the download fails or the hash does not match.
 */
export async function downloadVerified(
  fetchImpl: typeof fetch,
  url: string,
  sha256: string,
  dest: string,
): Promise<string> {
  const existing = await stat(dest).catch((_error: unknown) => null) // missing file → download it
  if (existing?.isFile() && existing.size > 0) return dest

  const response = await fetchImpl(url)
  if (!response.ok) {
    throw Object.assign(new Error(`Bergamot download failed (${response.status}): ${url}`), {
      status: response.status,
    })
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== sha256) {
    throw new Error(`Bergamot download hash mismatch for ${url}: expected ${sha256}, got ${actual}`)
  }
  await mkdir(dirname(dest), { recursive: true })
  const partial = `${dest}.${process.pid}.${Date.now()}.partial`
  await writeFile(partial, bytes)
  await rename(partial, dest)
  return dest
}

/**
 * Options for {@link ModelStore}.
 */
export interface ModelStoreOptions {
  /** Cache directory. */
  cacheDir: string
  /** Model list URL. */
  recordsUrl: string
  /** Model file base URL. */
  attachmentsUrl: string
  /** How long a cached model list is trusted. */
  recordsMaxAgeMs: number
  /** `fetch` implementation. */
  fetch: typeof fetch
}

/**
 * Model list + download cache, shared by every request of one provider.
 */
export class ModelStore {
  private recordsPromise: Promise<ModelRecord[]> | null = null
  private recordsLoadedAt = 0
  private readonly inFlight = new Map<string, Promise<string>>()

  /**
   * Creates a model store.
   *
   * @param options - Where to cache and download from.
   */
  constructor(private readonly options: ModelStoreOptions) {}

  /**
   * Firefox's model list — from memory, the on-disk copy, or the network.
   *
   * A fresh copy is fetched when the cached one is older than `recordsMaxAgeMs`;
   * if that fetch fails, the older copy on disk is used rather than failing
   * translations that already have their models.
   *
   * @returns The records.
   * @throws {Error} When there is no cached list and the fetch fails.
   */
  async records(): Promise<ModelRecord[]> {
    const fresh = Date.now() - this.recordsLoadedAt < this.options.recordsMaxAgeMs
    if (this.recordsPromise && fresh) return this.recordsPromise
    this.recordsPromise = this.loadRecords().catch((error: unknown) => {
      this.recordsPromise = null
      throw error
    })
    return this.recordsPromise
  }

  /**
   * Downloads (if needed) the files of a model set.
   *
   * @param set - The set from `selectModelSet`.
   * @returns The engine's view of it.
   */
  async ensureModel(set: ModelSet): Promise<BergamotModelSpec> {
    const files: Partial<BergamotModelFiles> = {}
    await Promise.all(
      Object.entries(set.files).map(async ([role, record]) => {
        const dest = join(
          this.options.cacheDir,
          'models',
          `${set.from}-${set.to}`,
          set.version,
          `${record.attachment.hash.slice(0, 16)}-${record.name}`,
        )
        files[role as keyof BergamotModelFiles] = await this.download(
          new URL(record.attachment.location, this.options.attachmentsUrl).toString(),
          record.attachment.hash,
          dest,
        )
      }),
    )
    return {
      key: `${set.from}-${set.to}@${set.version}`,
      from: set.from,
      to: set.to,
      files: files as BergamotModelFiles,
    }
  }

  /**
   * Downloads (if needed) the pinned runtime.
   *
   * @returns Paths of the WASM binary and its loader.
   */
  async ensureRuntime(): Promise<{ wasmPath: string; gluePath: string }> {
    const dir = join(this.options.cacheDir, 'runtime')
    const [wasmPath, gluePath] = await Promise.all([
      this.download(
        new URL(BERGAMOT_RUNTIME.wasm.path, this.options.attachmentsUrl).toString(),
        BERGAMOT_RUNTIME.wasm.sha256,
        join(dir, BERGAMOT_RUNTIME.wasm.filename),
      ),
      this.download(
        BERGAMOT_RUNTIME.glue.url,
        BERGAMOT_RUNTIME.glue.sha256,
        join(dir, BERGAMOT_RUNTIME.glue.filename),
      ),
    ])
    return { wasmPath, gluePath }
  }

  /**
   * One download per destination at a time.
   *
   * @param url - Source URL.
   * @param sha256 - Expected hash.
   * @param dest - Destination path.
   * @returns `dest`.
   */
  private download(url: string, sha256: string, dest: string): Promise<string> {
    const pending = this.inFlight.get(dest)
    if (pending) return pending
    const promise = downloadVerified(this.options.fetch, url, sha256, dest).finally(() =>
      this.inFlight.delete(dest),
    )
    this.inFlight.set(dest, promise)
    return promise
  }

  /**
   * Reads the on-disk list if it is fresh, otherwise fetches it.
   *
   * @returns The records.
   */
  private async loadRecords(): Promise<ModelRecord[]> {
    const file = join(this.options.cacheDir, 'records.json')
    const cached = await readFile(file, 'utf8')
      .then((text) => JSON.parse(text) as { fetchedAt: number; data: ModelRecord[] })
      .catch((_error: unknown) => null) // no (or unreadable) cached list → fetch below
    if (cached && Date.now() - cached.fetchedAt < this.options.recordsMaxAgeMs) {
      this.recordsLoadedAt = cached.fetchedAt
      return cached.data
    }
    try {
      const response = await this.options.fetch(this.options.recordsUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { data } = (await response.json()) as { data: ModelRecord[] }
      await mkdir(this.options.cacheDir, { recursive: true })
      await writeFile(file, JSON.stringify({ fetchedAt: Date.now(), data }))
      this.recordsLoadedAt = Date.now()
      return data
    } catch (error) {
      if (cached) {
        // Stale but usable: a model list outage must not stop pairs that are already cached.
        this.recordsLoadedAt = Date.now()
        return cached.data
      }
      throw new Error(`Bergamot could not load the model list from ${this.options.recordsUrl}`, {
        cause: error,
      })
    }
  }
}
