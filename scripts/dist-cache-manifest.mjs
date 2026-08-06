#!/usr/bin/env node
/* global console, process, URL */

/**
 * Make the CI dist cache INCREMENTAL without ever declaring stale output fresh.
 *
 * The cache was all-or-nothing: one key hashing every package's `src`,
 * `package.json` and `tsconfig.json`, with `restore-keys` deliberately absent.
 * So a five-file commit — the changesets "version packages" commit is exactly
 * that — missed the cache completely and rebuilt all ~914 packages. A one-line
 * JSDoc edit cost the same.
 *
 * A prefix restore alone is NOT safe, and the workflow comment was right to say
 * so: it brings back dist built from a DIFFERENT commit, and the blanket
 * `find … -exec touch` that followed would then stamp every one of those as
 * fresh, so `scripts/build.js` (which skips a package when its dist mtime beats
 * its src) would ship stale output for packages that actually changed.
 *
 * The fix is not to give up incrementality — it is to stop blanket-touching.
 * This records WHAT each package's sources hashed to when its dist was built,
 * and on restore marks fresh only the packages whose sources still hash the
 * same. Everything else keeps a stale-looking dist and gets rebuilt. That is a
 * content check, not an mtime guess, so a restored dist is trusted only when it
 * provably corresponds to the current sources.
 *
 * Fail-safe by construction: a missing, unreadable or partial manifest marks
 * NOTHING fresh, which rebuilds everything — the old behaviour. It can never
 * fail open.
 *
 * Usage:
 *   node scripts/dist-cache-manifest.mjs --write   # after a successful build
 *   node scripts/dist-cache-manifest.mjs --apply   # after a cache restore
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const PACKAGES = join(ROOT, 'packages')
const MANIFEST = join(ROOT, '.dist-manifest.json')

const MODE = process.argv.includes('--write')
  ? 'write'
  : process.argv.includes('--apply')
    ? 'apply'
    : null

if (!MODE) {
  console.error('Usage: dist-cache-manifest.mjs --write | --apply')
  process.exit(2)
}

/** Every package directory that has a package.json and a src/. */
function findPackages(dir, depth = 0, out = []) {
  if (depth > 6) return out
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // Unreadable directory: nothing to hash here, and an over-rebuild is safe.
    return out
  }
  if (entries.some((e) => e.name === 'package.json') && existsSync(join(dir, 'src'))) {
    out.push(dir)
    return out
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    findPackages(join(dir, entry.name), depth + 1, out)
  }
  return out
}

/** Collect file paths under `dir`, excluding build output and tests. */
function filesIn(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    return out
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) filesIn(full, out)
    else out.push(full)
  }
  return out
}

/**
 * Content hash of everything that can change a package's build output.
 *
 * Paths are included alongside contents so a rename cannot hash identically to
 * the original, and `__tests__` is included because it is part of src and a
 * cheap hash is worth more than a precise one here — over-rebuilding is safe.
 *
 * @param pkgDir - The package directory.
 * @returns A hex digest, or null when the package has nothing to hash.
 */
function hashPackage(pkgDir) {
  const inputs = [
    ...filesIn(join(pkgDir, 'src')),
    join(pkgDir, 'package.json'),
    join(pkgDir, 'tsconfig.json'),
  ]
  const hash = createHash('sha256')
  let counted = 0
  for (const file of inputs) {
    let content
    try {
      content = readFileSync(file)
    } catch (_error) {
      continue
    }
    hash.update(relative(ROOT, file))
    hash.update(content)
    counted++
  }
  return counted > 0 ? hash.digest('hex') : null
}

const packages = findPackages(PACKAGES)

if (MODE === 'write') {
  const manifest = {}
  for (const pkgDir of packages) {
    const digest = hashPackage(pkgDir)
    if (digest) manifest[relative(ROOT, pkgDir)] = digest
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 0)}\n`)
  console.log(`dist manifest written: ${Object.keys(manifest).length} package(s)`)
  process.exit(0)
}

// --apply
if (!existsSync(MANIFEST)) {
  console.log('no dist manifest in the restored cache — rebuilding everything (fail-safe).')
  process.exit(0)
}

let manifest
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
} catch (error) {
  console.log(`dist manifest unreadable (${error.message}) — rebuilding everything (fail-safe).`)
  process.exit(0)
}

const now = new Date()
let fresh = 0
let rebuild = 0

for (const pkgDir of packages) {
  const key = relative(ROOT, pkgDir)
  const recorded = manifest[key]
  const current = hashPackage(pkgDir)
  const dist = join(pkgDir, 'dist')

  if (!recorded || !current || recorded !== current || !existsSync(dist)) {
    // Leave dist alone. Its mtime is the checkout time at newest, and src was
    // just checked out too — build.js re-checks and rebuilds. Never touch here:
    // touching is precisely how stale output would be declared fresh.
    rebuild++
    continue
  }

  // Sources are byte-identical to what produced this dist, so it is genuinely
  // current. Stamp it newer than src so build.js skips the package.
  for (const file of filesIn(dist)) {
    try {
      utimesSync(file, now, now)
    } catch (_error) {
      /* a file we cannot stamp simply gets rebuilt */
    }
  }
  try {
    utimesSync(dist, now, now)
  } catch (_error) {
    /* directory stamp is best-effort; the files above are what build.js reads */
  }
  fresh++
}

console.log(
  `dist cache applied: ${fresh} package(s) reused (sources unchanged), ${rebuild} to rebuild.`,
)
