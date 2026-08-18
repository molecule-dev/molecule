#!/usr/bin/env node
/* global console, process */
/**
 * Print the vitest positional path-filters for the packages AFFECTED by this
 * push/PR — the packages whose sources changed, plus every package that
 * (transitively) depends on one of them — so CI runs those instead of the whole
 * ~914-package fleet's 47k tests on every commit.
 *
 * Output contract (this is consumed as `npm test -- $(node scripts/affected-projects.mjs)`):
 *   - STDOUT: a space-separated list of package dirs to pass to `vitest run`, OR
 *     EMPTY. Empty means "run everything" — `vitest run` with no filter does
 *     exactly that, so empty is the safe default the fallbacks below fall into.
 *   - STDERR: a one-line human summary of the decision (full vs scoped + count).
 *
 * FAIL SAFE — this gate must never become one that cannot fail (AGENTS.md Rule
 * 23), and skipping a test that should have run ships a regression (Rule 18). So
 * it prints EMPTY (→ full run) whenever the scope cannot be trusted:
 *   - the diff base is unknown (new branch, first push, a non-push/PR event),
 *   - a GLOBAL file changed (root test/build config, scripts/, .github/) that
 *     could alter fleet-wide behavior,
 *   - changes exist but map to zero package dirs (e.g. a lockfile-only bump),
 *   - the affected set is a large fraction of the fleet (spinning up hundreds of
 *     path filters is slower than just running all — and it means a core moved).
 * A nightly full run stays as the backstop regardless.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim()

/** Print the human summary to stderr, an empty filter list to stdout, and exit → full run. */
const full = (why) => {
  console.error(`affected: FULL run — ${why}`)
  process.stdout.write('')
  process.exit(0)
}

// Any of these changing can alter how the WHOLE fleet builds or tests, so a
// scoped run could miss a real break. A per-package vitest.config change is NOT
// here — that package is in the diff and runs anyway.
const GLOBAL = [
  /^vitest\.config\.[cm]?[jt]s$/,
  /^vitest\.workspace\.[cm]?[jt]s$/,
  /^tsconfig[^/]*\.json$/,
  /^eslint\.config\.[cm]?js$/,
  /^\.prettierrc/,
  /^\.prettierignore$/,
  /^\.npmrc$/,
  /^package\.json$/, // ROOT package.json — shared scripts/devDeps
  /^scripts\//,
  /^\.github\//,
]

/** Reduce a repo-relative file to its package dir, or null if it isn't a package source. */
const packageDirOf = (file) => {
  if (!file.startsWith('packages/')) return null
  const dir = file
    .replace(/\/src\/.*$/, '')
    .replace(/\/(package\.json|vitest\.config\.[cm]?[jt]s)$/, '')
  return dir === file ? null : dir
}

// ── diff base ───────────────────────────────────────────────────────────────
const event = process.env.GITHUB_EVENT_NAME ?? ''
let base
if (event === 'pull_request') {
  const baseRef = process.env.GITHUB_BASE_REF
  if (!baseRef) full('pull_request with no GITHUB_BASE_REF')
  try {
    base = git('merge-base', `origin/${baseRef}`, 'HEAD')
  } catch (_error) {
    // The base ref is not in the clone (shallow / not fetched) — cannot scope, run all.
    full(`cannot merge-base origin/${baseRef}`)
  }
} else if (event === 'push') {
  const before = process.env.GITHUB_EVENT_BEFORE
  // All-zeros = branch created by this push; no meaningful base.
  if (!before || /^0+$/.test(before)) full('push created the branch (no before-sha)')
  base = before
} else if (event) {
  full(`event "${event}" is not push/PR (scheduled/dispatch → always full)`)
} else {
  // Local invocation for testing: diff against HEAD~1 so it is inspectable.
  try {
    base = git('rev-parse', 'HEAD~1')
  } catch (_error) {
    // No parent commit to diff against — cannot scope, run all.
    full('no HEAD~1 (single-commit history)')
  }
}

let changed
try {
  changed = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean)
} catch (_error) {
  // Base sha unreachable from this clone — cannot scope, run all.
  full(`cannot diff ${base}..HEAD`)
}
if (!changed.length) full('empty diff')
if (changed.some((f) => GLOBAL.some((re) => re.test(f)))) full('a global build/test file changed')

const changedDirs = [...new Set(changed.map(packageDirOf).filter(Boolean))]
// Changes exist but none is a package source (root README, LICENSE, a bare
// package-lock.json bump…) — cannot scope confidently.
if (!changedDirs.length) full('changed files map to no package (cannot scope)')

// ── dependency graph: dir → dirs that depend on it (transitive) ──────────────
const pkgDirs = []
for (const stack of ['api', 'app']) {
  const walk = (rel) => {
    const abs = join(ROOT, rel)
    if (!existsSync(abs)) return
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const child = `${rel}/${e.name}`
      if (existsSync(join(ROOT, child, 'package.json'))) pkgDirs.push(child)
      else walk(child)
    }
  }
  walk(`packages/${stack}`)
}

const nameToDir = new Map()
const dirDeps = new Map() // dir -> Set of @molecule dep names it declares
for (const dir of pkgDirs) {
  const pj = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'))
  if (pj.name) nameToDir.set(pj.name, dir)
  const deps = new Set()
  for (const sec of ['dependencies', 'devDependencies', 'peerDependencies'])
    for (const dep of Object.keys(pj[sec] ?? {})) if (dep.startsWith('@molecule/')) deps.add(dep)
  dirDeps.set(dir, deps)
}
// Invert to dir -> Set of dependent dirs.
const dependentsOf = new Map(pkgDirs.map((d) => [d, new Set()]))
for (const dir of pkgDirs)
  for (const depName of dirDeps.get(dir)) {
    const depDir = nameToDir.get(depName)
    if (depDir) dependentsOf.get(depDir).add(dir)
  }

// BFS the transitive reverse-dependency closure from the changed dirs.
const affected = new Set(changedDirs)
const queue = [...changedDirs]
while (queue.length) {
  const dir = queue.shift()
  for (const dep of dependentsOf.get(dir) ?? [])
    if (!affected.has(dep)) {
      affected.add(dep)
      queue.push(dep)
    }
}

// A core moving pulls in most of the fleet — at that point full is cheaper and
// simpler than hundreds of path filters.
if (affected.size > pkgDirs.length * 0.6)
  full(`${affected.size}/${pkgDirs.length} packages affected (a core moved) — full is cheaper`)

const out = [...affected].sort()
console.error(
  `affected: SCOPED — ${changedDirs.length} changed, ${out.length}/${pkgDirs.length} with dependents`,
)
process.stdout.write(out.join(' '))
