#!/usr/bin/env node
/**
 * Ensure every publishable `@molecule` package ships its generated docs.
 *
 * WHY: `files: ["dist"]` excluded the generated README.md, so the first
 * 903-package publish went out with NO documentation of any kind — npm's own
 * package pages read "This package does not have a README", and `node_modules`
 * carried nothing for an AI (or a human) to read. README.md exists precisely
 * so each package is understandable without its source; shipping without it
 * defeats the entire generation pipeline.
 *
 * This adds `README.md` to `files` while PRESERVING whatever
 * else a package already lists (`fonts`, `setup`, `templates`, `base.css`,
 * `src/__setup__` are all real and load-bearing). 16 packages already listed
 * the old MOLECULE.md — that entry is removed here, since the file is gone.
 *
 * `files` changes only take effect in a NEW version, so this must be paired with
 * a version bump; it cannot retro-fix anything already published at 1.0.0.
 *
 * Dry run by default — prints every change and writes nothing:
 *   node scripts/sync-package-files.mjs
 *   node scripts/sync-package-files.mjs --write
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')
const REQUIRED = ['README.md']

/**
 * Every publishable `@molecule` package directory.
 *
 * @returns Array of package directories.
 */
function discover() {
  const dirs = []
  const walk = (dir, depth) => {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
        if (pkg.name?.startsWith('@molecule/') && !pkg.private) {
          dirs.push(dir)
          return
        }
      } catch (_error) {
        // Unreadable manifest — keep descending.
      }
    }
    if (!depth) return
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const child = join(dir, entry)
      try {
        if (statSync(child).isDirectory()) walk(child, depth - 1)
      } catch (_error) {
        // Vanished mid-walk.
      }
    }
  }
  walk(join(ROOT, 'packages'), 4)
  return dirs
}

let changed = 0
let alreadyOk = 0
let missingDocs = []

for (const dir of discover()) {
  const manifestPath = join(dir, 'package.json')
  const raw = readFileSync(manifestPath, 'utf8')
  const pkg = JSON.parse(raw)
  const files = Array.isArray(pkg.files) ? [...pkg.files] : ['dist']

  // A package listing a doc it does not have would ship a broken promise; npm
  // silently omits missing entries, so flag it rather than pretend it worked.
  for (const doc of REQUIRED) {
    if (!existsSync(join(dir, doc))) missingDocs.push(`${pkg.name}: ${doc} not on disk`)
  }

  // 16 packages listed the retired MOLECULE.md. Leaving a dead entry is not
  // merely untidy: npm silently omits files that do not exist, so it would read
  // as "we ship a doc" while shipping nothing.
  const stale = files.filter((f) => f === 'MOLECULE.md')
  const kept = files.filter((f) => f !== 'MOLECULE.md')
  const additions = REQUIRED.filter((doc) => !kept.includes(doc))

  if (additions.length === 0 && stale.length === 0) {
    alreadyOk++
    continue
  }
  changed++
  const removal = stale.length ? ` - ${JSON.stringify(stale)}` : ''
  console.log(`${pkg.name}: ${JSON.stringify(files)} + ${JSON.stringify(additions)}${removal}`)

  if (WRITE) {
    pkg.files = [...kept, ...additions]
    // Preserve the file's exact trailing-newline convention.
    const trailing = raw.endsWith('\n') ? '\n' : ''
    writeFileSync(manifestPath, JSON.stringify(pkg, null, 2) + trailing)
  }
}

console.log(
  `\n${changed} package(s) ${WRITE ? 'updated' : 'would change'}, ${alreadyOk} already correct`,
)
if (missingDocs.length) {
  console.log(`\n⚠ ${missingDocs.length} missing doc file(s) — regenerate before publishing:`)
  missingDocs.slice(0, 10).forEach((m) => console.log(`  ${m}`))
  if (missingDocs.length > 10) console.log(`  …and ${missingDocs.length - 10} more`)
}
if (!WRITE) console.log('\nDry run — nothing written. Re-run with --write to apply.')
