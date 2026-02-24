#!/usr/bin/env node
/* global console, process */

/**
 * Generates a self-contained package-lock.json for molecule.
 *
 * Problem: When molecule lives inside an outer npm workspace, running
 * `npm install --package-lock-only` produces a lock file that omits
 * transitive dependencies already provided by the outer workspace.
 * In CI (where molecule builds standalone), those deps are missing.
 *
 * Solution: Copy the project structure to a temp directory (outside any
 * workspace), generate the lock file there, and copy it back. The result
 * is a fully self-contained lock file that works with `npm ci`.
 *
 * Usage: node scripts/sync-lockfile.js
 */

import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')

console.log('Generating self-contained package-lock.json...\n')

// Create temp directory
const tmp = mkdtempSync(join(tmpdir(), 'molecule-lockfile-'))

try {
  // Copy root package.json and .npmrc
  cpSync(join(ROOT, 'package.json'), join(tmp, 'package.json'))
  if (existsSync(join(ROOT, '.npmrc'))) {
    cpSync(join(ROOT, '.npmrc'), join(tmp, '.npmrc'))
  }

  // Copy all workspace package.json files (maintaining directory structure)
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  const workspacePatterns = pkg.workspaces || []

  /** @param {string} dir @param {number} depth */
  function findPackageJsons(dir, depth) {
    if (depth > 6) return []
    const results = []
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return results
    }

    const hasPkgJson = entries.some((e) => e.name === 'package.json')
    if (hasPkgJson) {
      results.push(dir)
    }

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules' &&
        entry.name !== 'dist'
      ) {
        results.push(...findPackageJsons(join(dir, entry.name), depth + 1))
      }
    }
    return results
  }

  // Find all workspace package directories
  const packageDirs = findPackageJsons(join(ROOT, 'packages'), 0)
  let copied = 0

  for (const dir of packageDirs) {
    const rel = dir.slice(ROOT.length + 1)
    const pkgJsonPath = join(dir, 'package.json')

    try {
      const content = readFileSync(pkgJsonPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (!parsed.name?.startsWith('@molecule/')) continue

      // Create directory structure and copy package.json
      const destDir = join(tmp, rel)
      const destFile = join(destDir, 'package.json')
      cpSync(pkgJsonPath, destFile, { recursive: true })
      copied++
    } catch {
      // skip
    }
  }

  console.log(`Copied ${copied} workspace package.json files to temp directory.`)

  // Generate lock file in isolation
  console.log('Running npm install --package-lock-only (this may take a moment)...\n')
  execSync('npm install --package-lock-only --ignore-scripts', {
    cwd: tmp,
    stdio: 'inherit',
    env: { ...process.env },
  })

  // Copy lock file back
  cpSync(join(tmp, 'package-lock.json'), join(ROOT, 'package-lock.json'))
  console.log('\npackage-lock.json updated successfully.')
} finally {
  // Clean up temp directory
  rmSync(tmp, { recursive: true, force: true })
}
