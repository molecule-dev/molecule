#!/usr/bin/env node
/* global console, process */
/**
 * Guard: every `t('key', …)` a package renders must exist in its companion
 * locale bond's `en.ts`, and bond keys must not rot into orphans.
 *
 * Why: molecule renders all user-facing text through
 * `t(key, values, { defaultValue })`, with the real translations living in a
 * companion `@molecule/{stack}-locales-{name}` bond (79 languages). When a new
 * string ships as an inline `defaultValue` only and the key is never added to
 * the bond, English speakers see the default but EVERY other locale is stuck on
 * English for that surface — the MVP audit's `cross-cutting-i18n` finding. The
 * inverse also accrues: keys deleted/renamed in code but left in the bond pile
 * up as dead weight (e.g. the removed `ide.device.label`). Pure-unit/API tests
 * never caught either, because the inline `defaultValue` masks the gap in
 * English. This guard cross-references real `t()` usage against the bonds.
 *
 * What it checks (statically, zero network):
 *   - MISSING (enforced): a literal `t('ns.key')` whose namespace `ns` is owned
 *     by exactly one locale bond, but the key is absent from that bond's en.ts.
 *     Literal keys are unambiguous, so this direction is false-positive free.
 *   - ORPHAN (report-only): an en.ts key referenced by no literal `t()`, no
 *     `key:`/`labelKey:` config value, and no dynamic ``t(`ns.${x}`)`` prefix.
 *     Dynamic key construction + cross-repo (molecule-dev) usage make this
 *     direction heuristic, so it is reported but never fails CI.
 *
 * A baseline (`scripts/i18n-parity-baseline.json`) records the known-missing
 * debt so `--check` fails ONLY on NEW gaps (a regression), letting the historical
 * backlog be paid down incrementally without turning the gate red today. The
 * baseline doubles as the authoritative list of remaining per-bond i18n debt.
 *
 * Usage:
 *   node scripts/check-i18n-parity.js                 # full report
 *   node scripts/check-i18n-parity.js --check         # exit 1 on NEW missing keys (CI)
 *   node scripts/check-i18n-parity.js --update-baseline
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'scripts', 'i18n-parity-baseline.json')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '__tests__'])

/**
 * Recursively collect `.ts`/`.tsx` source files under a dir, skipping build
 * output, tests, and the locale bonds themselves (those are data, not usage).
 */
function collectSourceFiles(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // Unreadable/non-existent dir (e.g. a stack with no locales) — nothing to
    // scan here; returning what we have is the correct, intentional noop.
    return out
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = join(dir, e.name)
      if (p.includes('/locales/')) continue
      collectSourceFiles(p, out)
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') && !e.name.includes('.test.')) {
      out.push(join(dir, e.name))
    }
  }
  return out
}

/**
 * Read the keys defined in a bond's `en.ts` (line-anchored so `//` comments are
 * ignored).
 */
function readEnKeys(enPath) {
  const keys = new Set()
  const txt = readFileSync(enPath, 'utf8')
  for (const m of txt.matchAll(/^\s*'([^']+)'\s*:/gm)) keys.add(m[1])
  return keys
}

/** Discover every locale bond and the keys its `en.ts` defines. */
function loadBonds() {
  const bonds = []
  for (const stack of ['app', 'api']) {
    const locDir = join(ROOT, 'packages', stack, 'locales')
    if (!existsSync(locDir)) continue
    for (const name of readdirSync(locDir)) {
      const enPath = join(locDir, name, 'src', 'en.ts')
      if (!existsSync(enPath)) continue
      const keys = readEnKeys(enPath)
      if (keys.size > 0) bonds.push({ id: `${stack}/${name}`, keys })
    }
  }
  return bonds
}

const KEY_RE = /^[a-zA-Z][\w-]*(\.[\w-]+)+$/

/** Scan all package source for translation-key usage signals. */
function loadUsage() {
  const literals = new Set() // keys passed to t('…')
  const referenced = new Set() // literals ∪ key:/labelKey: config string values
  const dynamicPrefixes = new Set() // ``ns.${x}`` template prefixes
  for (const stack of ['app', 'api']) {
    const files = collectSourceFiles(join(ROOT, 'packages', stack))
    for (const f of files) {
      const txt = readFileSync(f, 'utf8')
      for (const m of txt.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
        if (KEY_RE.test(m[1])) {
          literals.add(m[1])
          referenced.add(m[1])
        }
      }
      for (const m of txt.matchAll(/\b(?:labelKey|messageKey|key)\s*:\s*['"]([^'"]+)['"]/g)) {
        if (KEY_RE.test(m[1])) referenced.add(m[1])
      }
      for (const m of txt.matchAll(/`([\w.]*?\.)\$\{/g)) {
        if (m[1].includes('.')) dynamicPrefixes.add(m[1])
      }
    }
  }
  return { literals, referenced, dynamicPrefixes }
}

/** Compute missing (used-but-undefined) and orphan (defined-but-unused) keys. */
export function analyzeParity() {
  const bonds = loadBonds()
  const { literals, referenced, dynamicPrefixes } = loadUsage()

  // namespace (first segment) → set of bonds that define keys under it
  const nsOwners = new Map()
  for (const b of bonds) {
    for (const k of b.keys) {
      const ns = k.split('.')[0]
      if (!nsOwners.has(ns)) nsOwners.set(ns, new Set())
      nsOwners.get(ns).add(b.id)
    }
  }
  const definedByBond = new Map(bonds.map((b) => [b.id, b.keys]))

  // MISSING: literal t() key, namespace owned by exactly one bond, not defined there.
  const missing = []
  for (const k of literals) {
    const owners = nsOwners.get(k.split('.')[0])
    if (!owners || owners.size !== 1) continue
    const bondId = [...owners][0]
    if (!definedByBond.get(bondId).has(k)) missing.push(`${bondId}::${k}`)
  }

  const coveredByDynamic = (k) => {
    for (const p of dynamicPrefixes) if (k.startsWith(p)) return true
    return false
  }

  // ORPHAN: defined key with no literal/config reference and no dynamic prefix.
  const orphans = []
  for (const b of bonds) {
    for (const k of b.keys) {
      if (referenced.has(k) || coveredByDynamic(k)) continue
      orphans.push(`${b.id}::${k}`)
    }
  }

  missing.sort()
  orphans.sort()
  return { missing, orphans }
}

/** Load the accepted-debt baseline (missing keys allowed to remain for now). */
export function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return { missing: [] }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

/** Missing keys present now but NOT in the baseline — i.e. regressions. */
export function newMissing() {
  const { missing } = analyzeParity()
  const allowed = new Set(loadBaseline().missing)
  return missing.filter((m) => !allowed.has(m))
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const mode = process.argv.includes('--check')
    ? 'check'
    : process.argv.includes('--update-baseline')
      ? 'update'
      : 'report'
  const { missing, orphans } = analyzeParity()

  if (mode === 'update') {
    writeFileSync(BASELINE_PATH, `${JSON.stringify({ missing }, null, 2)}\n`)
    console.log(`✓ wrote baseline with ${missing.length} known-missing key(s) → ${BASELINE_PATH}`)
    process.exit(0)
  }

  const regressions = (() => {
    const allowed = new Set(loadBaseline().missing)
    return missing.filter((m) => !allowed.has(m))
  })()

  if (mode === 'check') {
    if (regressions.length === 0) {
      console.log(
        `✓ i18n parity: no NEW missing keys (${missing.length} baselined, ${orphans.length} orphans reported)`,
      )
      process.exit(0)
    }
    console.error(`✗ ${regressions.length} NEW translation key(s) used by code but absent from the`)
    console.error("  owning locale bond. Add each to the bond's en.ts + types.ts and fan out, or")
    console.error("  (if truly app-level) move it to the app's own locale. Offenders:")
    for (const m of regressions) console.error(`  - ${m}`)
    process.exit(1)
  }

  // report
  console.log(`Locale bonds scanned. Missing: ${missing.length} | Orphans: ${orphans.length}`)
  console.log(`Baselined-accepted missing: ${loadBaseline().missing.length}`)
  console.log(`\n=== MISSING (used in code, absent from owning bond's en.ts) ===`)
  const byBond = {}
  for (const m of missing) {
    const [b, k] = m.split('::')
    ;(byBond[b] ??= []).push(k)
  }
  for (const b of Object.keys(byBond).sort()) console.log(`  [${b}] ${byBond[b].join(', ')}`)
  console.log(`\n=== ORPHAN (defined in bond, no literal/dynamic usage — heuristic) ===`)
  const oByBond = {}
  for (const o of orphans) {
    const [b, k] = o.split('::')
    ;(oByBond[b] ??= []).push(k)
  }
  for (const b of Object.keys(oByBond).sort()) console.log(`  [${b}] ${oByBond[b].join(', ')}`)
}
