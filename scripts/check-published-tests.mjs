#!/usr/bin/env node
/**
 * Refuse a publishable package whose build would put its tests in the tarball.
 *
 * Test files live under `src/**\/__tests__/` and nowhere else. `tsc` and `ngc` compile
 * everything their tsconfig includes, so a package whose tsconfig does not exclude
 * `src/**\/__tests__/**` writes `dist/__tests__/*.test.js` and npm ships it: on
 * 2026-11-16, 193 published packages carried their compiled tests that way
 * (`@molecule/api-locales-ai@1.0.3` held `dist/__tests__/index.test.js`). `svelte-package`
 * copies `src/` as it is, so a Svelte package keeps its tests out with `files` negations
 * instead (`!dist/**\/__tests__`).
 *
 * The pre-commit changeset gate counts on this: a change under `__tests__/` needs no
 * changeset because it is never published.
 *
 * What it checks, for every non-private package with a file under `src/**\/__tests__/`:
 * - a `tsc` or `ngc` build (`-p <file>` or the package's `tsconfig.json`) excludes
 *   `src/**\/__tests__/**`, `**\/__tests__/**` or `**\/__tests__`;
 * - a `svelte-package` build lists `!dist/**\/__tests__` in `files`;
 * - any other build tool is reported, so the rule for it gets written here.
 * It also refuses a test file outside a `__tests__/` directory, since nothing excludes those.
 *
 *   node scripts/check-published-tests.mjs           # exit 1 with every finding
 *   node scripts/check-published-tests.mjs --fix     # add the tsconfig exclude where it is missing
 */
import { execFileSync, spawnSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { isMainModule } from './lib/is-main.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** The tsconfig exclude that keeps a package's tests out of its build. */
export const TEST_EXCLUDE = 'src/**/__tests__/**'
const EXCLUDES = new Set([TEST_EXCLUDE, '**/__tests__/**', '**/__tests__'])
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/
const BUILD_DIRS = new Set(['node_modules', 'dist', '.svelte-kit', '.turbo'])

/**
 * Parse a tsconfig, which may carry comments and trailing commas.
 *
 * @param text - The file's text.
 * @returns The parsed object.
 */
const parseTsconfig = (text) =>
  JSON.parse(
    text
      .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_match, string) => string ?? '')
      .replace(/,(\s*[}\]])/g, '$1'),
  )

/**
 * A tsconfig's text with the test exclude added, in the file's own formatting: appended to
 * an existing `exclude` array, or as a new last property in the fleet's usual form.
 *
 * @param text - The tsconfig's text.
 * @returns The new text.
 */
export function withTestExclude(text) {
  const existing = /("exclude"\s*:\s*\[)([^\]]*)(\])/.exec(text)
  let next
  if (existing) {
    const items = existing[2]
    const kept = items.replace(/\s*$/, '')
    const added = items.includes('\n')
      ? `${kept},\n${/\n([ \t]*)"/.exec(items)?.[1] ?? '    '}"${TEST_EXCLUDE}"${items.slice(kept.length)}`
      : `${kept}, "${TEST_EXCLUDE}"`
    next =
      text.slice(0, existing.index) +
      existing[1] +
      added +
      existing[3] +
      text.slice(existing.index + existing[0].length)
  } else {
    const close = text.lastIndexOf('}')
    next = `${text.slice(0, close).replace(/\s*$/, '')},\n  "exclude": ["node_modules", "dist", "${TEST_EXCLUDE}"]\n}\n`
  }
  if (!(parseTsconfig(next).exclude ?? []).includes(TEST_EXCLUDE))
    throw new Error('withTestExclude: the exclude did not land')
  return next
}

/**
 * The findings for a set of package directories.
 *
 * @param root - The repo root.
 * @param files - Every tracked path, relative to the root.
 * @returns `{ dir, problem, fix? }` for each package that would publish its tests, and
 *   `{ file, problem }` for each test file outside a `__tests__` directory.
 */
export function findPublishedTests(root, files) {
  const findings = []
  const testDirs = new Set()
  for (const file of files) {
    const nested = /^(packages\/.+?)\/src\/(?:.*\/)?__tests__\//.exec(file)
    if (nested) testDirs.add(nested[1])
    else if (/^packages\/.+?\/src\//.test(file) && TEST_FILE.test(file))
      findings.push({
        file,
        problem: 'a test file outside a __tests__/ directory, which no build excludes',
      })
  }
  for (const dir of [...testDirs].sort()) {
    const manifestPath = join(root, dir, 'package.json')
    if (!existsSync(manifestPath)) continue
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (manifest.private) continue
    const build = manifest.scripts?.build ?? ''
    const steps = build.split('&&').map((step) => step.trim().split(/\s+/))
    const compile = steps.find(([tool]) => tool === 'tsc' || tool === 'ngc')
    if (steps.some(([tool]) => tool === 'svelte-package')) {
      if (!(manifest.files ?? []).some((entry) => /^!dist\/\*\*\/__tests__\/?$/.test(entry)))
        findings.push({
          dir,
          problem: 'svelte-package copies src/ as it is; add "!dist/**/__tests__" to files',
        })
      continue
    }
    if (!compile) {
      findings.push({
        dir,
        problem: `unknown build (${build || 'no build script'}): say here how it keeps tests out`,
      })
      continue
    }
    const at = compile.findIndex((arg) => arg === '-p' || arg === '--project')
    const project = at >= 0 && compile[at + 1] ? compile[at + 1] : 'tsconfig.json'
    const tsconfigPath = join(root, dir, project)
    if (!existsSync(tsconfigPath)) {
      findings.push({ dir, problem: `${project} is missing` })
      continue
    }
    const tsconfig = parseTsconfig(readFileSync(tsconfigPath, 'utf8'))
    if (!(tsconfig.exclude ?? []).some((pattern) => EXCLUDES.has(pattern)))
      findings.push({
        dir,
        problem: `${project} does not exclude ${TEST_EXCLUDE}, so ${compile[0]} compiles the tests into dist`,
        fix: tsconfigPath,
      })
  }
  return findings
}

/**
 * Every file under `packages/` outside build and install directories. In a checkout, this lists
 * the tracked files and the untracked ones git does
 * not ignore (a new package is checked, and `--fix` reaches it, before it is staged), or every
 * file of an export (the pre-commit hook runs this from an export of the index, which has no
 * `.git`).
 *
 * @param root - The repo root, or the export's.
 * @returns Paths relative to the root.
 */
export function listFiles(root) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' })
  if (top.status === 0 && top.stdout.trim() === root)
    return execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'packages'],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 1 << 28,
      },
    )
      .split('\0')
      .filter(
        (file) =>
          file &&
          !file
            .split('/')
            .slice(0, -1)
            .some((dir) => BUILD_DIRS.has(dir)),
      )
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!BUILD_DIRS.has(entry.name)) walk(`${dir}/${entry.name}`)
      } else files.push(`${dir}/${entry.name}`)
    }
  }
  if (existsSync(join(root, 'packages'))) walk('packages')
  return files
}

const isMain = isMainModule(import.meta.url)
if (isMain) {
  const files = listFiles(realpathSync(ROOT))
  const findings = findPublishedTests(ROOT, files)
  if (process.argv.includes('--fix') || process.argv.includes('--fix-dry-run')) {
    const dry = process.argv.includes('--fix-dry-run')
    for (const { fix } of findings.filter((finding) => finding.fix)) {
      const next = withTestExclude(readFileSync(fix, 'utf8'))
      if (!dry) writeFileSync(fix, next)
      console.log(
        `${dry ? 'would fix' : 'fixed'} ${fix.slice(ROOT.length + 1)}: exclude ${JSON.stringify(parseTsconfig(next).exclude)}`,
      )
    }
    process.exit(0)
  }
  for (const finding of findings)
    console.log(`✗ ${finding.dir ?? finding.file}: ${finding.problem}`)
  if (findings.length) {
    console.log(
      `\n${findings.length} package(s) or file(s) would publish tests. \`node scripts/check-published-tests.mjs --fix\` adds the tsconfig exclude.`,
    )
    process.exit(1)
  }
  console.log('No publishable package ships its tests.')
}
