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
 * A framework counterpart (`@molecule/app-<x>-vue`, `-solid`, `-svelte`,
 * `-angular`) must also describe itself in its own framework's terms: 36 of them
 * were generated with their React package's description ("React breadcrumb
 * navigation component" on the Vue package), which mlcl search and the registry
 * then served as the Vue package's summary. --fix cannot write a description, so
 * that one stays an error until it is rewritten. So does a package with no description at all
 * (176 had none: the registry carried theirs, npm showed nothing).
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

import { isMainModule } from './lib/is-main.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = process.argv.includes('--fix')
const LICENSE = 'Apache-2.0'
const ROOT_LICENSE = join(ROOT, 'LICENSE')
const homepageFor = (name) =>
  `https://www.molecule.dev/packages/${name.replace(/^@molecule\//, '')}`

/** Each framework a counterpart package can be for, as its description names it. */
const FRAMEWORK_NAMES = {
  react: 'React',
  vue: 'Vue',
  solid: 'Solid',
  svelte: 'Svelte',
  angular: 'Angular',
}

/**
 * The description problems of a publishable package: it has none (npm then shows the package
 * without one, and `npm search` cannot match it), or it is a framework counterpart whose
 * description names another framework ({@link frameworkDescriptionProblems}).
 *
 * @param pkg - A parsed package.json.
 * @returns One message per problem (empty when none).
 */
export function descriptionProblems(pkg) {
  if (typeof pkg.description !== 'string' || !pkg.description.trim())
    return ['no description: npm shows the package without one and npm search cannot match it']
  return frameworkDescriptionProblems(pkg)
}

/**
 * The description problems of a framework counterpart package: each other framework its
 * description names (React's own packages are the source, and a package with no framework
 * suffix may name any framework). JSX is React's and Solid's idiom, so it is foreign elsewhere.
 *
 * @param pkg - A parsed package.json.
 * @returns One message per foreign framework the description names (empty when none).
 */
export function frameworkDescriptionProblems(pkg) {
  const match = /^@molecule\/app-.+-(vue|solid|svelte|angular)$/.exec(pkg.name ?? '')
  if (!match) return []
  const own = match[1]
  const ownName = FRAMEWORK_NAMES[own]
  const foreign = Object.entries(FRAMEWORK_NAMES)
    .filter(([key]) => key !== own)
    .map(([, name]) => name)
  if (own !== 'solid') foreign.push('JSX')
  return foreign
    .filter((name) => new RegExp(`\\b${name}\\b`).test(pkg.description ?? ''))
    .map(
      (name) =>
        `description names ${name}, but this is the ${ownName} package: describe it in ${ownName}'s terms (${JSON.stringify(pkg.description)})`,
    )
}

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
  const descriptionGaps = descriptionProblems(pkg)
  if (descriptionGaps.length) problems.push({ name: pkg.name, rel, gaps: descriptionGaps })
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

/**
 * Prints the problems found and exits 1.
 *
 * @param heading - What the problems have in common.
 * @param fix - How to fix them.
 */
function refuse(heading, fix) {
  console.error(`✗ ${problems.length} of ${checked} publishable package(s) ${heading}:\n`)
  for (const p of problems.slice(0, 15)) {
    console.error(`  ${p.name}  (${p.rel})`)
    for (const g of p.gaps) console.error(`    - ${g}`)
  }
  if (problems.length > 15) console.error(`  …and ${problems.length - 15} more`)
  console.error(`\n${fix}`)
  process.exit(1)
}

if (isMainModule(import.meta.url)) {
  walk(join(ROOT, 'packages'))

  if (FIX) {
    console.log(
      `✓ package metadata: ${fixed} fixed, ${checked - fixed} already complete (${checked} total)`,
    )
    // Only a description is left: --fix cannot write one.
    if (problems.length)
      refuse(
        "have no description or describe themselves in another framework's terms",
        "Write each missing description, and rewrite each one in its own framework's terms (React → Vue, React Router → Vue router), then rerun.",
      )
    process.exit(0)
  }
  if (problems.length)
    refuse(
      'are missing publish metadata or a description that fits them',
      'npm rejects a publish without license, homepage, LICENSE and files[README.md]: node scripts/check-package-metadata.mjs --fix. ' +
        "A description is written by hand: one line saying what the package is, in its own framework's terms.",
    )
  console.log(
    `✓ license, homepage, LICENSE file, files[README.md] and a fitting description on all ${checked} publishable package(s)`,
  )
}
