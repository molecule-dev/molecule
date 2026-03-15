#!/usr/bin/env node
/**
 * Verify that every peerDependency is also listed in devDependencies.
 *
 * Without this, packages build locally (peer resolved from workspace root)
 * but fail in CI which installs each package standalone. Runs as part of
 * the pre-commit hook alongside check:lockfile.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGES_DIR = join(import.meta.dirname, '..', 'packages')

/** @molecule/* packages are workspace-linked — always available, no devDep needed. */
const isMoleculePackage = (name) => name.startsWith('@molecule/')

/** React Native native modules can't be installed from npm in a non-RN context.
 *  These packages are only built/tested with the RN toolchain. */
const SKIP_PACKAGES = new Set([
  'react-native',
  '@react-native-clipboard/clipboard',
  '@react-native-community/netinfo',
  '@react-native-async-storage/async-storage',
  '@react-navigation/native',
  'react-native-safe-area-context',
  'expo-notifications',
  'expo-splash-screen',
])

let errors = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === 'node_modules' || entry === 'dist') continue
    if (statSync(full).isDirectory()) {
      const pkgPath = join(full, 'package.json')
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        const peers = pkg.peerDependencies || {}
        const devDeps = pkg.devDependencies || {}

        for (const [name] of Object.entries(peers)) {
          if (isMoleculePackage(name)) continue
          if (SKIP_PACKAGES.has(name)) continue
          if (!(name in devDeps)) {
            console.error(
              `ERROR: ${pkg.name} has peerDependency "${name}" but it's missing from devDependencies.`,
            )
            console.error(`  Add it: npm install ${name} --save-dev --workspace=${full.replace(PACKAGES_DIR + '/', 'packages/')}`)
            errors++
          }
        }
      } catch {
        // No package.json or parse error — recurse deeper
        walk(full)
        continue
      }
    }
  }
}

walk(PACKAGES_DIR)

if (errors > 0) {
  console.error(`\n${errors} peer dependency issue(s) found. CI will fail without these.`)
  process.exit(1)
} else {
  console.log('Peer deps OK — all external peerDependencies have matching devDependencies.')
}
