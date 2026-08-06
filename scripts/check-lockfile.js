#!/usr/bin/env node
/* global console, process */

/**
 * Validates that package-lock.json is self-contained.
 *
 * When the lock file is generated inside an outer npm workspace, transitive
 * dependencies can be silently omitted because the outer workspace already
 * provides them. In CI (where molecule builds standalone), those deps are
 * missing and TypeScript compilation fails.
 *
 * This script checks that every nested dependency's own dependencies are
 * resolvable within the lock file. Run it before pushing lock file changes.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const lock = JSON.parse(readFileSync('package-lock.json', 'utf-8'))
const packages = lock.packages || {}

/**
 * Check whether a dependency is resolvable from a given nested location.
 *
 * Walks up the path checking for node_modules entries at each level,
 * then checks root node_modules — mirroring Node's resolution algorithm.
 *
 * @param dep - Dependency name to resolve.
 * @param fromPath - Lock file path of the package requiring this dep.
 * @returns True if the dependency is resolvable.
 */
function isResolvable(dep, fromPath) {
  // Check root node_modules
  if (packages[`node_modules/${dep}`]) return true

  // Check nested: walk up from the requiring package's location
  const segments = fromPath.split('/')
  for (let i = segments.length; i > 0; i--) {
    const prefix = segments.slice(0, i).join('/')
    if (packages[`${prefix}/node_modules/${dep}`]) return true
  }

  return false
}

let missing = 0

/**
 * Every workspace package must have a lock-file entry, and at the version its
 * package.json declares.
 *
 * This is the half `npm ci` enforces and the transitive walk below does NOT:
 * a NEW package (or a version bump) leaves the lock file without its entry, and
 * `npm ci` refuses with "Missing: `@molecule/x@1.0.0` from lock file". Every
 * molecule CI run failed at that first step from 2026-03-28 to 2026-08-03 —
 * build, lint and security alike, because all three start with `npm ci` — while
 * this script kept printing "Lock file OK". A gate that reassures you about the
 * exact thing that is broken is worse than no gate.
 */
function checkWorkspaceEntries() {
  const roots = readFileSync('package.json', 'utf-8')
  const globs = JSON.parse(roots).workspaces || []
  const dirs = new Set()
  for (const g of globs) {
    const base = g.replace(/\/\*+$/, '')
    if (!existsSync(base)) continue
    const stack = [base]
    while (stack.length) {
      const dir = stack.pop()
      if (existsSync(join(dir, 'package.json'))) {
        dirs.add(dir)
        continue
      }
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== 'node_modules') stack.push(join(dir, e.name))
      }
    }
  }
  for (const dir of [...dirs].sort()) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    const entry = packages[dir]
    if (!entry) {
      console.error(`Missing: ${pkg.name}@${pkg.version} from lock file (${dir})`)
      missing++
    } else if (pkg.version && entry.version && pkg.version !== entry.version) {
      console.error(
        `Version mismatch: ${pkg.name} is ${pkg.version} but the lock file has ${entry.version} (${dir})`,
      )
      missing++
    }
  }
}

checkWorkspaceEntries()

for (const [path, info] of Object.entries(packages)) {
  // Only check nested node_modules entries (workspace packages' local deps)
  if (!path.startsWith('packages/') || !path.includes('/node_modules/')) continue

  const deps = info.dependencies || {}
  for (const dep of Object.keys(deps)) {
    if (!isResolvable(dep, path)) {
      const pkgName = path.split('/node_modules/').pop()
      console.error(`Missing: ${dep} (required by ${pkgName} at ${path})`)
      missing++
    }
  }
}

if (missing > 0) {
  console.error(
    `\n${missing} problem(s) in package-lock.json — \`npm ci\` will refuse to install,`,
    '\nwhich fails EVERY CI job (they all start with it).',
    '\nA missing workspace entry means the lock file predates a new package or a',
    'version bump: regenerate it with `npm install --package-lock-only` (from THIS',
    'repo, not the outer workspace) and commit the result.',
    '\nA missing transitive dep means the lock file was generated inside the outer',
    'workspace, which already provided it: add it as an explicit devDependency in',
    'the affected package, then regenerate.',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// The check above answers "is every dependency RESOLVABLE within the lock?" —
// which is not the question `npm ci` asks. `npm ci` asks "is the lock IN SYNC
// with every package.json?", and those differ: a lock can be perfectly
// self-consistent while missing a package added since it was written.
//
// That gap is not hypothetical. On 2026-08-06 this script printed
// "Lock file OK — all transitive dependencies resolvable." against the exact
// file `npm ci` was rejecting with:
//
//   npm error Missing: @molecule/api-code-sandbox-flyio@1.0.1 from lock file
//
// Both molecule CI and Release had been red for hours as a result — and Release
// dying at step 1 means NOTHING can ever publish. The same shape (a green gate
// in front of a red pipeline) had already cost this repo four months of
// unrun lint.
//
// So do not reimplement npm's sync rules here; ask npm. It is the authority on
// its own lock format, and a bespoke reimplementation would drift from it
// exactly the way the check above did.
const { spawnSync } = await import('node:child_process')

const dryRun = spawnSync('npm', ['ci', '--dry-run', '--no-audit', '--no-fund'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (dryRun.error) {
  // "I could not look" is not "I looked and it is fine".
  console.error(
    `\nCould not run \`npm ci --dry-run\` to verify lock sync: ${dryRun.error.message}`,
    '\nRefusing to report the lock file OK on a check that did not run.',
  )
  process.exit(1)
}

if (dryRun.status !== 0) {
  const detail = `${dryRun.stderr || ''}${dryRun.stdout || ''}`
    .split('\n')
    .filter((line) => /Missing:|Invalid:|can only install|EUSAGE/.test(line))
    .slice(0, 12)
    .join('\n')
  console.error(
    '\npackage-lock.json is OUT OF SYNC with package.json — `npm ci` refuses to install,',
    '\nso every CI job fails at its first step and Release can never publish.\n',
    `\n${detail || dryRun.stderr?.trim() || 'npm exited ' + dryRun.status}\n`,
    '\nFix: `npm install --package-lock-only` from THIS repo (not the outer',
    'workspace) and commit package-lock.json.',
  )
  process.exit(1)
}

console.log('Lock file OK — dependencies resolvable and in sync with package.json.')
