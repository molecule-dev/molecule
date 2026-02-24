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

import { readFileSync } from 'node:fs'

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
    `\n${missing} transitive dep(s) missing from package-lock.json.`,
    '\nThis happens when the lock file is generated inside an outer workspace.',
    '\nFix: add missing deps as explicit devDependencies in the affected package,',
    'then regenerate the lock file.',
  )
  process.exit(1)
} else {
  console.log('Lock file OK — all transitive dependencies resolvable.')
}
