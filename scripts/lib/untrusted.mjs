/**
 * Which packages CI cannot publish because they were never trusted.
 *
 * Shared by `check-publishable.mjs` (reports) and `trust-new-packages.mjs`
 * (fixes) so the two can never disagree about what counts as untrusted — a
 * checker that flags a package the fixer does not fix is worse than neither.
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
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
 * How long a link nothing has published through yet keeps working. npm drops an unused
 * link after about two days; inside this window a re-link only spends 2FA codes (three
 * npm calls per package) to replace a link that still works.
 */
export const FRESH_LINK_MS = 36 * 60 * 60 * 1000

/**
 * When each ledger entry was added: the committer time of the commit that added its line
 * (`git blame`), or now for a line not committed yet. trust:new adds a name's line in the
 * run that links it, so this is when its link was made. A re-link keeps the line, so a
 * re-linked package reads as old as its first link.
 *
 * @param root - Repo root holding `.trust-state.json`.
 * @param run - Runs git and returns its stdout (tests pass a stand-in).
 * @returns Package name -> epoch ms; empty when the ledger or its history is unreadable.
 */
export const ledgerEntryTimes = (
  root = ROOT,
  run = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
) => {
  const times = new Map()
  let porcelain
  try {
    porcelain = run(['blame', '--line-porcelain', '--', '.trust-state.json'])
  } catch (error) {
    // No history (a copy outside git, a shallow clone): every entry reads as old, so the
    // caller re-links as it did before link ages were known.
    console.error(`  could not read when trust links were made (${error.message.split('\n')[0]})`)
    return times
  }
  let time = 0
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('committer-time '))
      time = Number(line.slice('committer-time '.length)) * 1000
    else if (line.startsWith('\t') && time) {
      for (const [, name] of line.matchAll(/"(@molecule\/[^"]+)"/g)) times.set(name, time)
    }
  }
  return times
}

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

/**
 * Asks the registry whether a package exists.
 *
 * npm's trust endpoint requires it — its API docs say "Package MUST exist" — so
 * a name npm has never seen must be published once before it can be trusted.
 *
 * @param name - Package name.
 * @returns True when the registry serves it.
 */
export const existsOnRegistry = async (name) => {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(15_000),
  })
  return res.status !== 404
}

/** Who publishes a version over OIDC, as npm records it in the version's `_npmUser`. */
const OIDC_PUBLISHER = /GitHub Actions|npm-oidc-no-reply/i

/**
 * Packages npm HAS, none of whose versions was published over OIDC — their trust
 * link was never proven, and a link nothing proves stops working while staying
 * listed (the OIDC exchange answers `404 package not found`). The ledger cannot
 * see this: it records that a link was ADDED, not that one ever worked, so 15
 * such packages read as trusted on 2026-10-16 while every release refused them.
 * Public registry data only, no login.
 *
 * @param pkgs - Package records to check (from collectPackages).
 * @returns The unproven ones, sorted by name.
 */
export const unprovenPackages = async (pkgs) => {
  const unproven = []
  for (let i = 0; i < pkgs.length; i += 40) {
    await Promise.all(
      pkgs.slice(i, i + 40).map(async (pkg) => {
        const res = await fetch(`https://registry.npmjs.org/${pkg.name.replace('/', '%2f')}`, {
          signal: AbortSignal.timeout(20_000),
        }).catch((_error) => null)
        // Unreachable or absent: not this check's case (absent names are the ledger's).
        if (!res?.ok) return
        const doc = await res.json().catch((_error) => null)
        const versions = Object.values(doc?.versions ?? {})
        if (!versions.length) return
        const viaOidc = versions.some((v) =>
          OIDC_PUBLISHER.test(`${v?._npmUser?.name ?? ''} ${v?._npmUser?.email ?? ''}`),
        )
        if (!viaOidc) unproven.push(pkg)
      }),
    )
  }
  return unproven.sort((a, b) => a.name.localeCompare(b.name))
}
