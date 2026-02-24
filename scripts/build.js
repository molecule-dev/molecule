#!/usr/bin/env node
/* global console, process */

/**
 * Topological build script for molecule packages.
 *
 * Resolves inter-package dependencies and builds in the correct order,
 * running packages within each depth level concurrently.
 * Skips packages whose dist/ is already newer than src/.
 */

import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'

const MAX_CONCURRENCY = availableParallelism()

const packages = new Map()

/**
 * Recursively scan directories for molecule packages with build scripts.
 *
 * @param dir - Directory to scan.
 * @param depth - Current recursion depth.
 */
function scan(dir, depth) {
  if (depth > 6) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  if (entries.some((e) => e.name === 'package.json')) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
      if (pkg.name?.startsWith('@molecule/') && pkg.scripts?.build) {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }
        const molDeps = Object.keys(allDeps).filter((d) => d.startsWith('@molecule/'))
        packages.set(pkg.name, { path: dir, deps: molDeps })
      }
    } catch {
      // skip
    }
  }

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      !entry.name.startsWith('.') &&
      entry.name !== 'node_modules' &&
      entry.name !== 'dist'
    ) {
      scan(join(dir, entry.name), depth + 1)
    }
  }
}

/**
 * Get the newest mtime of any file in a directory, recursively.
 *
 * @param dir - Directory to check.
 * @returns Newest mtime in ms, or 0 if directory doesn't exist.
 */
function newestMtime(dir) {
  if (!existsSync(dir)) return 0
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full))
    } else {
      newest = Math.max(newest, statSync(full).mtimeMs)
    }
  }
  return newest
}

/**
 * Check whether a package's dist/ is up-to-date relative to its src/.
 *
 * @param pkgDir - Package root directory.
 * @returns True if dist is newer than src (can skip build).
 */
function isUpToDate(pkgDir) {
  const distDir = join(pkgDir, 'dist')
  const srcDir = join(pkgDir, 'src')
  const tsconfigFile = join(pkgDir, 'tsconfig.json')
  if (!existsSync(distDir)) return false
  const distTime = newestMtime(distDir)
  if (distTime === 0) return false
  const srcTime = newestMtime(srcDir)
  const tsconfigTime = existsSync(tsconfigFile) ? statSync(tsconfigFile).mtimeMs : 0
  return distTime > Math.max(srcTime, tsconfigTime)
}

/**
 * Build a single package using its configured build command (tsc, ngc, etc.).
 *
 * @param name - Package name.
 * @param pkgDir - Package root directory.
 * @returns Promise that resolves on success, rejects on failure.
 */
function buildOne(name, pkgDir) {
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'))
  const cmd = pkg.scripts?.build || 'tsc'
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [cmd], {
      cwd: pkgDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const output = [stdout, stderr].filter(Boolean).join('\n')
        reject(new Error(`${name} failed:\n${output}`))
      }
    })
  })
}

/**
 * Calculate the dependency depth of a package.
 *
 * @param name - Package name.
 * @param visited - Already-visited packages (cycle guard).
 * @returns Depth level.
 */
function getDepth(name, visited = new Set()) {
  if (visited.has(name)) return 0
  visited.add(name)
  const info = packages.get(name)
  if (!info) return 0
  const internalDeps = info.deps.filter((d) => packages.has(d))
  if (internalDeps.length === 0) return 0
  return 1 + Math.max(...internalDeps.map((d) => getDepth(d, new Set(visited))))
}

/**
 * Run an array of async task factories with a concurrency limit.
 *
 * @param tasks - Array of zero-arg functions that return promises.
 * @param limit - Max concurrent tasks.
 * @returns Promise that resolves when all tasks complete.
 */
async function runWithConcurrency(tasks, limit) {
  const results = []
  let index = 0
  let firstError = null

  /** Process tasks from the shared queue. */
  async function worker() {
    while (index < tasks.length && !firstError) {
      const i = index++
      try {
        results[i] = await tasks[i]()
      } catch (err) {
        firstError = err
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()))
  if (firstError) throw firstError
  return results
}

scan('packages', 0)

const levels = new Map()
for (const name of packages.keys()) {
  const depth = getDepth(name)
  if (!levels.has(depth)) levels.set(depth, [])
  levels.get(depth).push(name)
}

const sortedDepths = [...levels.keys()].sort((a, b) => a - b)
const totalPackages = packages.size
let skipped = 0

console.log(`Building ${totalPackages} packages in ${sortedDepths.length} levels...\n`)

for (const depth of sortedDepths) {
  const names = levels.get(depth)
  const toBuild = []
  const toSkip = []

  for (const name of names) {
    const info = packages.get(name)
    if (isUpToDate(info.path)) {
      toSkip.push(name)
    } else {
      toBuild.push(name)
    }
  }

  skipped += toSkip.length
  const skipMsg = toSkip.length > 0 ? ` (${toSkip.length} up-to-date)` : ''
  console.log(`Level ${depth}: ${toBuild.length} to build, ${names.length} total${skipMsg}`)

  if (toBuild.length === 0) continue

  try {
    await runWithConcurrency(
      toBuild.map((name) => () => {
        const info = packages.get(name)
        return buildOne(name, info.path)
      }),
      MAX_CONCURRENCY,
    )
  } catch (err) {
    console.error(`\n${err.message}`)
    process.exit(1)
  }
}

const built = totalPackages - skipped
console.log(`\nDone. ${built} built, ${skipped} skipped (up-to-date). ${totalPackages} total.`)
