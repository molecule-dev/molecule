#!/usr/bin/env node
/**
 * Every publishable `@molecule` package carries the metadata npm and the
 * product front door need: an Apache-2.0 `license` field, a LICENSE copy in
 * the package directory (so the tarball carries it), the `homepage` that
 * points at the prerendered package page, and `README.md` in `files`.
 * (`repository` has its own gate, check-package-repository.js, because
 * provenance verification reads it.)
 *
 * WHY THIS GATE EXISTS: `@molecule/app-locales-search-ui` was generated
 * without any of these, cleared every other check, and was rejected at
 * publish with E422 (provenance could not be verified against an empty
 * repository) — the first thing that read the fields was the registry. A
 * brand-new package is exactly the case a generator gets wrong, and nothing
 * else looks at these fields until publish day.
 *
 *   node scripts/check-package-metadata.mjs          # verify (exit 1 on any gap)
 *   node scripts/check-package-metadata.mjs --fix    # write the canonical values, copy LICENSE
 */
import console from 'node:console'
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = process.argv.includes('--fix')
const LICENSE = 'Apache-2.0'
const ROOT_LICENSE = join(ROOT, 'LICENSE')
const homepageFor = (name) =>
  `https://www.molecule.dev/packages/${name.replace(/^@molecule\//, '')}`

const problems = []
let checked = 0
let fixed = 0

/**
 * Checks (or fixes) one publishable manifest.
 *
 * @param dir - The package directory.
 * @param pkg - Its parsed package.json.
 */
function checkPackage(dir, pkg) {
  const rel = relative(ROOT, dir)
  const gaps = []
  if (pkg.license !== LICENSE)
    gaps.push(`license is ${JSON.stringify(pkg.license)}, want "${LICENSE}"`)
  const homepage = homepageFor(pkg.name)
  if (pkg.homepage !== homepage)
    gaps.push(`homepage is ${JSON.stringify(pkg.homepage)}, want "${homepage}"`)
  if (!Array.isArray(pkg.files) || !pkg.files.includes('README.md'))
    gaps.push('files does not include README.md')
  if (!existsSync(join(dir, 'LICENSE'))) gaps.push('no LICENSE file in the package directory')
  if (!gaps.length) return
  if (!FIX) {
    problems.push({ name: pkg.name, rel, gaps })
    return
  }
  const out = {}
  for (const [key, value] of Object.entries(pkg)) {
    if (key === 'license') {
      out.license = LICENSE
      continue
    }
    if (key === 'homepage') {
      out.homepage = homepage
      continue
    }
    out[key] = value
    // A new field goes right after `description`, where the fleet keeps it.
    if (key === 'description' && !('homepage' in pkg)) out.homepage = homepage
  }
  if (!('homepage' in out)) out.homepage = homepage
  if (!('license' in out)) out.license = LICENSE
  out.files = Array.isArray(out.files)
    ? [...new Set([...out.files, 'README.md'])]
    : ['dist', 'README.md']
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(out, null, 2)}\n`)
  if (!existsSync(join(dir, 'LICENSE'))) copyFileSync(ROOT_LICENSE, join(dir, 'LICENSE'))
  fixed++
}

/**
 * Walks the package tree.
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
      checkPackage(dir, pkg)
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
  console.log(
    `✓ package metadata: ${fixed} fixed, ${checked - fixed} already complete (${checked} total)`,
  )
  process.exit(0)
}
if (problems.length) {
  console.error(
    `✗ ${problems.length} of ${checked} publishable package(s) are missing publish metadata:\n`,
  )
  for (const p of problems.slice(0, 15)) {
    console.error(`  ${p.name}  (${p.rel})`)
    for (const g of p.gaps) console.error(`    - ${g}`)
  }
  if (problems.length > 15) console.error(`  …and ${problems.length - 15} more`)
  console.error(
    `\nnpm rejects a publish without these. Fix: node scripts/check-package-metadata.mjs --fix`,
  )
  process.exit(1)
}
console.log(
  `✓ license, homepage, LICENSE file and files[README.md] present on all ${checked} publishable package(s)`,
)
