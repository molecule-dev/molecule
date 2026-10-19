#!/usr/bin/env node
/**
 * Run Vitest with its scratch confined to one recognizable root that is
 * removed when the run ends — including when the run fails or is killed.
 *
 * Why: Vitest 4 writes every SSR-transformed module of a run to
 * `join(os.tmpdir(), nanoid())` (`<root>/ssr/<sha1>` — ~1,400 files and
 * 100–500 MB for the api suite; `ModuleFetcher.fetch`, cli-api chunk line
 * ~1022). It removes that tree only from `project.close()` → `clearTmpDir()`,
 * i.e. on a graceful close. Every run ended by `timeout`/SIGKILL left one
 * behind: 19 of them, 2.4 GB, had accumulated by 2026-10-19 10:48Z and the
 * root disk was at 95%.
 *
 * The scratch path is fixed in Vitest's constructor, before any config file is
 * read — so a `vitest.config.ts` cannot redirect it. This runner can: it sets
 * `TMPDIR` in the child's environment before the CLI starts, so the whole tree
 * lands under one `mol-vitest-*` root that a single `rm` takes away.
 *
 * Direct `npx vitest run` invocations (which do not go through `npm test`) are
 * still covered by the disk janitor's 30-minute rule for the same shape
 * (`scripts/lib/x0-disk-janitor.mjs`).
 *
 * Usage: `node ../scripts/vitest-with-tmp-root.mjs run [vitest args…]`
 *
 * The molecule repo carries the same file at `molecule/scripts/` — each repo
 * builds alone in CI, so the copy is deliberate. Change both together.
 *
 * @module scripts/vitest-with-tmp-root
 */

import { spawn } from 'node:child_process'
import console from 'node:console'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** Name prefix of every run root this runner creates. */
export const VITEST_TMP_PREFIX = 'mol-vitest-'

/** A run root idle this long is dead: no transform has been written to it. */
export const VITEST_TMP_MAX_AGE_MS = 30 * 60_000

/** Signals forwarded to the Vitest child, with their conventional exit codes. */
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }

/**
 * The newest mtime anywhere under a path, without following symlinks.
 *
 * The run root's own mtime is set once by `mkdtemp`; activity is in the files
 * Vitest keeps writing (`<id>/ssr/<hash>`), so idle time is read from the tree.
 *
 * @param path - File or directory.
 * @returns Milliseconds since the epoch; 0 when nothing is readable.
 */
export function newestMtimeMs(path) {
  let newest = 0
  const stack = [path]
  while (stack.length > 0) {
    const current = stack.pop()
    let stat
    try {
      stat = fs.lstatSync(current)
    } catch (_error) {
      continue // vanished under a concurrent sweep — nothing to date
    }
    if (stat.mtimeMs > newest) newest = stat.mtimeMs
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue
    let names
    try {
      names = fs.readdirSync(current)
    } catch (_error) {
      continue
    }
    for (const name of names) stack.push(join(current, name))
  }
  return newest
}

/**
 * Remove run roots from killed earlier runs that have been idle past the cutoff.
 *
 * Only {@link VITEST_TMP_PREFIX} entries are touched: the prefix-less
 * `<nanoid>/ssr/` trees Vitest itself names are the disk janitor's, never a
 * test run's (a concurrent run may still be using one).
 *
 * @param [options] - All optional; the defaults are the real system.
 * @param [options.base] - Directory the run roots live in.
 * @param [options.now] - Clock, for tests.
 * @param [options.maxAgeMs] - Idle cutoff.
 * @param [options.uid] - Owner whose roots may go.
 * @param [options.remove] - Remover, for tests.
 * @returns The roots removed.
 */
export function sweepStaleRuns(options = {}) {
  const {
    base = tmpdir(),
    now = Date.now(),
    maxAgeMs = VITEST_TMP_MAX_AGE_MS,
    uid = process.getuid?.() ?? -1,
    remove = (path) => fs.rmSync(path, { recursive: true, force: true }),
  } = options
  const removed = []
  let names
  try {
    names = fs.readdirSync(base)
  } catch (_error) {
    return removed // unreadable base: leave everything alone, never crash a run
  }
  for (const name of names) {
    if (!name.startsWith(VITEST_TMP_PREFIX)) continue
    const path = join(base, name)
    let stat
    try {
      stat = fs.lstatSync(path)
    } catch (_error) {
      continue
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue
    if (typeof stat.uid === 'number' && stat.uid !== uid) continue
    if (now - newestMtimeMs(path) <= maxAgeMs) continue
    try {
      remove(path)
      removed.push(path)
    } catch (_error) {
      // A concurrent run swept it first, or it is not ours to remove.
    }
  }
  return removed
}

/**
 * Create this run's root and point the temp variables at it.
 *
 * @param [options] - All optional; the defaults are the real system.
 * @param [options.base] - Parent directory for the run root.
 * @param [options.now] - Clock, for tests.
 * @param [options.env] - Environment to set.
 * @returns The run root.
 */
export function createRunRoot(options = {}) {
  const { base = tmpdir(), now = Date.now(), env = process.env } = options
  sweepStaleRuns({ base, now, uid: process.getuid?.() ?? -1 })
  const root = fs.mkdtempSync(join(base, VITEST_TMP_PREFIX))
  env.TMPDIR = root
  env.TMP = root
  env.TEMP = root
  return root
}

/**
 * The `vitest.mjs` entry of the Vitest installed for a directory.
 *
 * @param [cwd] - Directory whose module graph resolves `vitest`.
 * @returns Absolute path to the CLI entry.
 */
export function vitestBin(cwd = process.cwd()) {
  const requireFromCwd = createRequire(join(cwd, 'noop.cjs'))
  const manifest = requireFromCwd.resolve('vitest/package.json')
  return join(dirname(manifest), 'vitest.mjs')
}

/**
 * Run Vitest with its scratch confined to a fresh run root.
 *
 * @param [args] - Vitest CLI arguments (`['run', …]`).
 * @param [options] - All optional; the defaults are the real system.
 * @param [options.cwd] - The project to run in.
 * @param [options.spawnImpl] - Spawner, for tests.
 * @param [options.createRoot] - Root creator, for tests.
 * @param [options.trapSignals] - Forward SIGINT/SIGTERM to the child.
 * @param [options.remove] - Remover, for tests.
 * @returns The exit code the parent should use.
 */
export function runVitest(args = [], options = {}) {
  const {
    cwd = process.cwd(),
    spawnImpl = spawn,
    createRoot = createRunRoot,
    trapSignals = true,
    remove = (path) => fs.rmSync(path, { recursive: true, force: true }),
  } = options
  const root = createRoot()

  return new Promise((resolve) => {
    let child
    try {
      child = spawnImpl(process.execPath, [vitestBin(cwd), ...args], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env },
      })
    } catch (error) {
      remove(root)
      console.error(`[vitest-tmp-root] could not start Vitest: ${error.message}`)
      resolve(1)
      return
    }

    const forward = (signal) => () => {
      // Let Vitest close down; the root goes in the exit path below either way.
      child.kill(signal)
    }
    if (trapSignals) {
      for (const signal of Object.keys(SIGNAL_EXIT_CODES)) process.once(signal, forward(signal))
    }

    const finish = (code) => {
      remove(root)
      resolve(code)
    }
    child.on('error', (error) => {
      console.error(`[vitest-tmp-root] Vitest failed to run: ${error.message}`)
      finish(1)
    })
    child.on('exit', (code, signal) => {
      finish(signal ? (SIGNAL_EXIT_CODES[signal] ?? 1) : (code ?? 1))
    })
  })
}

// `npm test` runs this file directly; the exported helpers above exist so the
// behaviour can be tested without starting a real suite.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runVitest(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  })
}
