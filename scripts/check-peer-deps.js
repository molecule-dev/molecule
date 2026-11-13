#!/usr/bin/env node
/**
 * Verify every external peerDependency against the devDependency it is tested with.
 *
 * Two rules, for each peer that is not a `@molecule/*` package:
 * - it is also listed in devDependencies. Without this, packages build locally
 *   (peer resolved from workspace root) but fail in CI, which installs each
 *   package standalone.
 * - that devDependency's version satisfies the peer range. The devDependency is
 *   the version the package's own build and tests run against, so a range that
 *   excludes it tells npm the package cannot run with the one version it is known
 *   to run with. A consumer who installs that version (a scaffold pins what the
 *   registry pins) is refused by a strict-peer install, and a consumer kept on an
 *   older version gets one the package was never tested with. Found 2026-11-13:
 *   `@molecule/app-angular` declared `@angular/core` `22.0.0` while testing with
 *   22.2.3, the version every Angular scaffold installs, and
 *   `@molecule/app-routing-vue-router` declared `vue-router` `^4.3.0` while
 *   testing with 5.4.0.
 *
 * Runs as part of the pre-commit hook alongside check:lockfile.
 */

import console from 'node:console'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import semver from 'semver'

const PACKAGES_DIR = join(import.meta.dirname, '..', 'packages')

/** `@molecule/*` packages are workspace-linked — always available, no devDep needed. */
const isMoleculePackage = (name) => name.startsWith('@molecule/')

/**
 * React Native / Expo native modules can't be installed from npm in a non-RN
 * context. These packages are only built/tested with the RN toolchain.
 */
const SKIP_PACKAGES = new Set([
  'react-native',
  '@react-native-clipboard/clipboard',
  '@react-native-community/netinfo',
  '@react-native-async-storage/async-storage',
  '@react-navigation/native',
  'react-native-safe-area-context',
  'expo-notifications',
  'expo-constants',
  'expo-splash-screen',
])

/**
 * The peer-dependency problems of one package manifest.
 *
 * @param pkg - A parsed package.json.
 * @param workspace - The package's directory relative to the repo root, for the fix line.
 * @returns One message per problem, each naming the fix; empty when the manifest is fine.
 */
export function peerDependencyProblems(pkg, workspace) {
  const problems = []
  const devDeps = pkg.devDependencies || {}
  for (const [name, range] of Object.entries(pkg.peerDependencies || {})) {
    if (isMoleculePackage(name)) continue
    if (SKIP_PACKAGES.has(name)) continue
    if (!(name in devDeps)) {
      problems.push(
        `${pkg.name} has peerDependency "${name}" but it's missing from devDependencies.\n` +
          `  Add it: npm install ${name} --save-dev --workspace=${workspace}`,
      )
      continue
    }
    const tested = devDeps[name]
    if (semver.valid(tested) && semver.validRange(range) && !semver.satisfies(tested, range)) {
      problems.push(
        `${pkg.name} is tested with ${name}@${tested} but its peerDependency range "${range}" ` +
          `excludes that version.\n` +
          `  Widen the range in ${workspace}/package.json to include it (e.g. "${range} || ^${semver.major(tested)}.0.0"), ` +
          `or test against a version the range allows.`,
      )
    }
  }
  return problems
}

/**
 * Recursively check every package.json under a directory.
 *
 * @param dir - Directory to walk.
 * @returns Every problem found under it.
 */
function walk(dir) {
  const problems = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === 'node_modules' || entry === 'dist') continue
    if (statSync(full).isDirectory()) {
      const pkgPath = join(full, 'package.json')
      let pkg
      try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      } catch (_error) {
        // No package.json here (or it does not parse) — this is a grouping
        // directory, so recurse deeper instead of reporting.
        problems.push(...walk(full))
        continue
      }
      problems.push(...peerDependencyProblems(pkg, full.replace(PACKAGES_DIR + '/', 'packages/')))
    }
  }
  return problems
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = walk(PACKAGES_DIR)
  for (const problem of problems) console.error(`ERROR: ${problem}`)
  if (problems.length > 0) {
    console.error(
      `\n${problems.length} peer dependency issue(s) found. CI will fail without these.`,
    )
    process.exit(1)
  } else {
    console.log(
      'Peer deps OK — every external peerDependency has a matching devDependency inside its range.',
    )
  }
}
