#!/usr/bin/env node
/**
 * Every publishable `@molecule` package must declare its repository, correctly.
 *
 * WHY THIS GATE EXISTS: with `NPM_CONFIG_PROVENANCE` on, npm signs a Sigstore
 * bundle naming the source repo and the registry REFUSES the publish unless
 * package.json agrees:
 *
 *   E422 Error verifying sigstore provenance bundle: Failed to validate
 *   repository information: package.json: "repository.url" is "", expected to
 *   match "https://github.com/molecule-dev/molecule" from provenance
 *
 * On 2026-08-05 that failed 548 packages that declared no repository at all, and
 * would have failed ten more with a repository that was WRONG — including
 * `@molecule/app-audio-howler` pointing at github.com/nicholasgriffintn/molecule,
 * a stranger's repository. All ten arrived in a single commit (61e4db045, March)
 * that generated 22 widget packages wrapping third-party libraries, where the
 * metadata was written from memory of the UPSTREAM library instead of molecule.
 * Nothing read the field for four months, so nothing complained.
 *
 * A wrong repository URL is not cosmetic. It is the provenance attestation's
 * claim about where this code came from — the thing a consumer checks to know
 * the package really is built from the source it names.
 *
 *   node scripts/check-package-repository.js          # verify
 *   node scripts/check-package-repository.js --fix    # write the correct value
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = process.argv.includes('--fix')

/** The one canonical repository URL for this monorepo. */
const URL = 'https://github.com/molecule-dev/molecule.git'

const problems = []
let checked = 0
let fixed = 0

/**
 * Walks the package tree, checking (or fixing) each publishable manifest.
 *
 * @param dir - Directory to descend from.
 */
function walk(dir) {
  const manifestPath = join(dir, 'package.json')
  if (existsSync(manifestPath)) {
    let pkg = null
    try {
      pkg = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch (_error) {
      // Unreadable manifest — not ours to validate; keep descending.
    }
    if (pkg?.name?.startsWith('@molecule/') && !pkg.private) {
      checked++
      // `directory` must be the package's REAL path: it is what npmjs.com uses to
      // link a package to its own folder, and four packages had a stale one from
      // a directory move.
      const directory = relative(ROOT, dir).split(sep).join('/')
      const want = { type: 'git', url: URL, directory }
      if (JSON.stringify(pkg.repository) !== JSON.stringify(want)) {
        if (FIX) {
          const out = {}
          let inserted = false
          for (const [key, value] of Object.entries(pkg)) {
            if (key === 'repository') {
              out.repository = want
              inserted = true
              continue
            }
            out[key] = value
            if (!inserted && key === 'license') {
              out.repository = want
              inserted = true
            }
          }
          if (!inserted) out.repository = want
          writeFileSync(manifestPath, `${JSON.stringify(out, null, 2)}\n`)
          fixed++
        } else {
          problems.push({ name: pkg.name, found: pkg.repository, want })
        }
      }
      return
    }
    if (pkg?.name) return
  }
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const child = join(dir, entry)
    try {
      if (statSync(child).isDirectory()) walk(child)
    } catch (_error) {
      // Vanished mid-walk.
    }
  }
}

walk(join(ROOT, 'packages'))

if (FIX) {
  console.log(`✓ repository: ${fixed} fixed, ${checked - fixed} already correct (${checked} total)`)
  process.exit(0)
}
if (problems.length > 0) {
  console.error(
    `✗ ${problems.length} of ${checked} package(s) have a wrong/missing repository field:\n`,
  )
  for (const p of problems.slice(0, 15)) {
    console.error(`  ${p.name}`)
    console.error(`    found: ${JSON.stringify(p.found)}`)
    console.error(`    want:  ${JSON.stringify(p.want)}`)
  }
  if (problems.length > 15) console.error(`  …and ${problems.length - 15} more`)
  console.error(`\nnpm publish will fail these with E422 once provenance is on.`)
  console.error(`Fix: node scripts/check-package-repository.js --fix`)
  process.exit(1)
}
console.log(`✓ repository field correct on all ${checked} publishable package(s)`)
