#!/usr/bin/env node
/* global console, process */
/**
 * Guard: every app **feature** package must carry a module-level `@example` in
 * its `src/index.ts`.
 *
 * Why: a feature package's MOLECULE.md is auto-generated, and the only place a
 * usage example renders is a module-level `@example` in `src/index.ts`. molecule.dev's
 * AI executor reads MOLECULE.md (`read_molecule_doc`) to learn how to USE a
 * component — without an example it can't see the props/usage and either guesses
 * or falls back to reading source. 118 of 207 feature packages shipped with no
 * example (fixed in bulk); this guard stops the regression for FUTURE packages.
 *
 * Usage:
 *   node scripts/check-feature-jsdocs.mjs           # report
 *   node scripts/check-feature-jsdocs.mjs --check   # exit 1 if any package lacks @example (CI)
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FEATURES = join(ROOT, 'packages', 'app', 'features')
const CHECK = process.argv.includes('--check')
const SKIP_DIRS = new Set(['node_modules', 'dist', 'src', '__tests__', '.turbo'])

/** Find feature package roots (a dir with package.json + src/index.ts), recursing
 *  through category dirs (e.g. data-table/tanstack) but never into a package itself. */
function findPackages(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    if (existsSync(join(p, 'package.json')) && existsSync(join(p, 'src', 'index.ts'))) {
      out.push(p)
    } else {
      out.push(...findPackages(p))
    }
  }
  return out
}

if (!existsSync(FEATURES)) {
  console.log('check-feature-jsdocs: no packages/app/features dir — skipping')
  process.exit(0)
}

const pkgs = findPackages(FEATURES)
const missing = []
for (const p of pkgs) {
  const idx = readFileSync(join(p, 'src', 'index.ts'), 'utf8')
  if (!/@example/.test(idx)) missing.push(relative(ROOT, p))
}

if (missing.length > 0) {
  console.error(
    `✗ ${missing.length}/${pkgs.length} app feature package(s) lack a module-level @example in src/index.ts`,
  )
  console.error(
    '  Their MOLECULE.md will have no usage example, so the AI executor cannot learn the component API.',
  )
  console.error(
    '  Add an `@example` block to the `/** ... @module */` JSDoc in src/index.ts, then run',
  )
  console.error('  `mlcl sync-docs --generate -p <package>`. Offenders:')
  for (const m of missing) console.error(`  - ${m}`)
  process.exit(CHECK ? 1 : 0)
}

console.log(`✓ all ${pkgs.length} app feature packages have a module-level @example`)
