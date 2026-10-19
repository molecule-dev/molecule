/**
 * `npm test` runs Vitest through the runner that confines its scratch.
 *
 * Vitest writes every SSR transform of a run into `os.tmpdir()` and removes
 * that tree only on a graceful close, so runs ended by `timeout`/SIGKILL left
 * 100–500 MB behind each time (19 directories, 2.4 GB, on 2026-10-19). Its
 * scratch path is fixed before any config file loads, so only a runner that
 * sets `TMPDIR` before starting the CLI can confine it. The first test fails
 * if the script wiring is removed; the rest prove the runner itself.
 */
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createRunRoot,
  sweepStaleRuns,
  VITEST_TMP_PREFIX,
  vitestBin,
} from '../vitest-with-tmp-root.mjs'

/** Scratch trees created by a test, removed afterwards. */
const roots = []

/**
 * A fresh scratch directory to act as `/tmp`.
 *
 * @returns Its path.
 */
function scratch() {
  const root = fs.mkdtempSync(join(tmpdir(), 'vitest-tmp-runner-test-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('the wiring', () => {
  const repo = join(import.meta.dirname, '../..')

  it('runs npm test through the confined-root runner', () => {
    const manifest = JSON.parse(fs.readFileSync(join(repo, 'package.json'), 'utf8'))
    expect(manifest.scripts.test).toBe('node scripts/vitest-with-tmp-root.mjs run')
  })

  it('resolves a real Vitest entry for this repo', () => {
    expect(fs.existsSync(vitestBin(repo))).toBe(true)
  })
})

describe('the run root', () => {
  it('is created with the prefix the disk janitor recognizes', () => {
    const base = scratch()
    const env = {}
    const root = createRunRoot({ base, env })
    expect(basename(root).startsWith(VITEST_TMP_PREFIX)).toBe(true)
    expect(env.TMPDIR).toBe(root)
    expect(env.TMP).toBe(root)
    expect(env.TEMP).toBe(root)
  })

  it('sweeps an idle earlier run and keeps a fresh one', () => {
    const base = scratch()
    const stale = join(base, `${VITEST_TMP_PREFIX}stale`)
    const ssr = join(stale, 'id', 'ssr')
    fs.mkdirSync(ssr, { recursive: true })
    const old = new Date(Date.now() - 2 * 60 * 60_000)
    const transform = join(ssr, 'hash')
    fs.writeFileSync(transform, 'x')
    // Idle time is the newest mtime in the tree: age the files and directories.
    for (const path of [transform, ssr, join(stale, 'id'), stale]) fs.utimesSync(path, old, old)
    const fresh = join(base, `${VITEST_TMP_PREFIX}fresh`)
    fs.mkdirSync(fresh)

    expect(sweepStaleRuns({ base })).toEqual([stale])
    expect(fs.existsSync(stale)).toBe(false)
    expect(fs.existsSync(fresh)).toBe(true)
  })
})
