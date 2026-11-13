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

import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'

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
  /**
   * Finds every directory holding a package.json under `dir`.
   *
   * @param dir - Directory to search.
   * @param depth - Recursion depth so far.
   * @returns The directories found.
   */
  function findPackageJsons(dir, depth) {
    if (depth > 6) return []
    const results = []
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // A directory that vanished or cannot be read holds no package to copy.
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

    let parsed
    try {
      parsed = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    } catch (error) {
      // An unreadable manifest is not a workspace npm can lock either; say which one.
      console.warn(`Skipping ${rel}/package.json: ${error.message}`)
      continue
    }
    if (!parsed.name?.startsWith('@molecule/')) continue

    // Create directory structure and copy package.json
    cpSync(pkgJsonPath, join(tmp, rel, 'package.json'), { recursive: true })
    copied++
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
