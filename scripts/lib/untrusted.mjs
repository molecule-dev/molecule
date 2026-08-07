/**
 * Which packages CI cannot publish because they were never trusted.
 *
 * Shared by `check-publishable.mjs` (reports) and `trust-new-packages.mjs`
 * (fixes) so the two can never disagree about what counts as untrusted — a
 * checker that flags a package the fixer does not fix is worse than neither.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to the molecule repo root. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Path to the ledger written by scripts/trust-publish-setup.mjs. */
export const TRUST_STATE_PATH = join(ROOT, '.trust-state.json')

/**
 * Collects every publishable package in the monorepo.
 *
 * Walks to arbitrary depth on purpose. A fixed three-or-four-segment glob under
 * `packages/` misses the react-native bonds, which sit one level deeper under
 * `packages/app/native/<capability>/react-native/` — and a scan that skipped
 * exactly those seven was how this repo talked itself into believing OIDC could
 * not create packages that do not exist yet.
 *
 * @param dir - Directory to walk. Defaults to `packages/`.
 * @param found - Accumulator.
 * @returns Package `{ name, version, dir }` records, dir relative to the repo root.
 */
export const collectPackages = (dir = join(ROOT, 'packages'), found = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    const manifest = join(full, 'package.json')
    if (existsSync(manifest)) {
      try {
        const json = JSON.parse(readFileSync(manifest, 'utf8'))
        if (json.name?.startsWith('@molecule/') && !json.private) {
          found.push({ name: json.name, version: json.version, dir: relative(ROOT, full) })
          // Deliberately NOT `continue`: a package directory can contain more
          // packages. `packages/api/testing/` is @molecule/api-testing AND the
          // parent of @molecule/api-mock-server, so stopping here hid mock-server
          // from every caller — it never appeared as untrusted and would never
          // have been trusted. Same shape as the glob that missed the seven
          // react-native bonds: the walk stopped one level above the answer.
        }
      } catch (_error) {
        // Intentionally ignored: an unparseable manifest is a different gate's
        // problem — lint and build both fail on it — and reporting it here would
        // only duplicate that noise in an unrelated command's output.
      }
    }
    collectPackages(full, found)
  }
  return found
}

/**
 * Reads the trust ledger.
 *
 * @returns The set of package names recorded as trusted.
 */
export const readTrustLedger = () =>
  new Set(existsSync(TRUST_STATE_PATH) ? JSON.parse(readFileSync(TRUST_STATE_PATH, 'utf8')) : [])

/**
 * Lists packages present in the repo but absent from the trust ledger.
 *
 * @returns Untrusted packages, sorted by name.
 */
export const untrustedPackages = () => {
  const trusted = readTrustLedger()
  return collectPackages()
    .filter((pkg) => !trusted.has(pkg.name))
    .sort((a, b) => a.name.localeCompare(b.name))
}
