#!/usr/bin/env node
/* global console, process */
/**
 * Guard: every app **feature** package must carry a module-level `@example` in
 * its `src/index.ts`.
 *
 * Why: a feature package's README.md is auto-generated, and the only place a
 * usage example renders is a module-level `@example` in `src/index.ts`. molecule.dev's
 * AI executor reads README.md (`read_molecule_doc`) to learn how to USE a
 * component — without an example it can't see the props/usage and either guesses
 * or falls back to reading source. 118 of 207 feature packages shipped with no
 * example (fixed in bulk); this guard stops the regression for FUTURE packages.
 *
 * Usage:
 *   node scripts/check-feature-jsdocs.mjs           # report
 *   node scripts/check-feature-jsdocs.mjs --check   # exit 1 if any package lacks `@example` (CI)
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

/**
 * Find feature package roots (a dir with package.json + src/index.ts), recursing
 * through category dirs (e.g. data-table/tanstack) but never into a package itself.
 */
function findPackages(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
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

/**
 * A framework package's examples translate the way its components must: through the
 * binding's `useTranslation()`. The static `t` from `@molecule/app-i18n` reads the locale
 * once, so a component that renders with it keeps the old language after a switch, and
 * eslint refuses it in component code; an example that teaches it is copied into apps.
 */
const FRAMEWORK_BINDING = {
  react: '@molecule/app-react',
  vue: '@molecule/app-vue',
  solid: '@molecule/app-solid',
  svelte: '@molecule/app-svelte',
  angular: '@molecule/app-angular',
}
const STATIC_T_IN_DOC = /^\s*\*\s*import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'@molecule\/app-i18n'/

/**
 * Every source file under a directory (no tests, no build output).
 *
 * @param dir - The directory.
 * @returns The files' paths.
 */
function sourceFiles(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '__tests__' || e.name === 'node_modules') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(p))
    else if (/\.(ts|tsx|svelte)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p)
  }
  return out
}

const staticT = []
for (const p of pkgs) {
  const framework = Object.keys(FRAMEWORK_BINDING).find((f) => p.endsWith(`-${f}`))
  if (!framework) continue
  for (const file of sourceFiles(join(p, 'src'))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (STATIC_T_IN_DOC.test(line)) {
          staticT.push(`${relative(ROOT, file)}:${i + 1} (${FRAMEWORK_BINDING[framework]})`)
        }
      })
  }
}

if (staticT.length > 0) {
  console.error(
    `✗ ${staticT.length} example(s) in framework feature packages import the static \`t\` from @molecule/app-i18n`,
  )
  console.error(
    "  A component that renders with it keeps the old language after a locale switch. In the example, import `useTranslation` from the package's framework binding (named below) and call `const { t } = useTranslation()` inside the component:",
  )
  for (const s of staticT) console.error(`  - ${s}`)
}

if (missing.length > 0) {
  console.error(
    `✗ ${missing.length}/${pkgs.length} app feature package(s) lack a module-level @example in src/index.ts`,
  )
  console.error(
    '  Their README.md will have no usage example, so the AI executor cannot learn the component API.',
  )
  console.error(
    '  Add an `@example` block to the `/** ... @module */` JSDoc in src/index.ts, then run',
  )
  console.error('  `mlcl sync-docs --generate -p <package>`. Offenders:')
  for (const m of missing) console.error(`  - ${m}`)
}

if (missing.length > 0 || staticT.length > 0) process.exit(CHECK ? 1 : 0)

console.log(
  `✓ all ${pkgs.length} app feature packages have a module-level @example, and no framework package's example renders the static t`,
)
