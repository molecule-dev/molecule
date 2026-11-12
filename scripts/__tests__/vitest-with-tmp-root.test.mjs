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
import process from 'node:process'
import { setImmediate } from 'node:timers'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createRunRoot,
  runVitest,
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

describe('owned runner lifecycle', () => {
  it('removes signal forwarding listeners when its child has finished', async () => {
    const { EventEmitter } = await import('node:events')
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP']
    const before = signals.map((signal) => process.listenerCount(signal))
    const base = scratch()
    await runVitest([], {
      createRoot: () => createRunRoot({ base, env: {} }),
      spawnImpl: () => {
        const child = new EventEmitter()
        child.kill = () => true
        setImmediate(() => child.emit('exit', 0, null))
        return child
      },
    })
    expect(signals.map((signal) => process.listenerCount(signal))).toEqual(before)
  })

  it('stops owned descendants before removing an interrupted native run root', async () => {
    const { spawn } = await import('node:child_process')
    const { pathToFileURL } = await import('node:url')
    const base = scratch()
    const details = join(base, 'children.json')
    const leaf = join(base, 'leaf.cjs')
    const worker = join(base, 'worker.cjs')
    const runner = join(base, 'runner.mjs')
    const module = pathToFileURL(join(import.meta.dirname, '../vitest-with-tmp-root.mjs')).href
    fs.writeFileSync(
      leaf,
      `
      const fs = require('node:fs'), path = require('node:path')
      process.on('SIGINT', () => {})
      process.on('SIGTERM', () => {})
      const write = () => {
        fs.mkdirSync(process.env.TMPDIR, {recursive:true})
        fs.writeFileSync(path.join(process.env.TMPDIR, 'heartbeat'), 'active')
      }
      write(); setInterval(write, 5)
    `,
    )
    fs.writeFileSync(
      worker,
      `
      const fs = require('node:fs'), {spawn} = require('node:child_process')
      const leaf = spawn(process.execPath, [${JSON.stringify(leaf)}], {stdio:'ignore'})
      fs.writeFileSync(${JSON.stringify(details)}, JSON.stringify({leader:process.pid,leaf:leaf.pid,root:process.env.TMPDIR}))
      setInterval(() => {}, 100)
    `,
    )
    fs.writeFileSync(
      runner,
      `
      import {spawn} from 'node:child_process'
      import {createRunRoot,runVitest} from ${JSON.stringify(module)}
      const code = await runVitest([], {
        createRoot: () => createRunRoot({base:${JSON.stringify(base)}}),
        spawnImpl: (_command,_args,options) => spawn(process.execPath,[${JSON.stringify(worker)}],options),
      })
      process.exitCode = code
    `,
    )
    const alive = (pid) => {
      try {
        process.kill(pid, 0)
        return true
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
        return false
      }
    }
    const wait = async (check) => {
      const start = Date.now()
      while (!check()) {
        if (Date.now() - start > 3000)
          throw new Error('Native child did not reach the expected lifecycle state')
        await new Promise((resolve) => setTimeout(resolve, 15))
      }
    }
    let ids
    const parent = spawn(process.execPath, [runner], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    parent.stderr.on('data', (data) => {
      stderr += data
    })
    const exited = new Promise((resolve) =>
      parent.once('exit', (code, signal) => resolve({ code, signal })),
    )
    try {
      await wait(() => fs.existsSync(details))
      ids = JSON.parse(fs.readFileSync(details, 'utf8'))
      await wait(() => fs.existsSync(join(ids.root, 'heartbeat')))
      parent.kill('SIGTERM')
      expect(await exited, stderr).toEqual({ code: 143, signal: null })
      await wait(() => !alive(ids.leaf))
      expect(fs.existsSync(ids.root)).toBe(false)
    } finally {
      if (ids && alive(ids.leaf)) process.kill(ids.leaf, 'SIGKILL')
      if (ids && alive(ids.leader)) process.kill(ids.leader, 'SIGKILL')
      if (parent.exitCode === null && parent.signalCode === null) parent.kill('SIGKILL')
      await exited
      if (ids) await wait(() => !alive(ids.leaf) && !alive(ids.leader))
    }
  }, 15000)
})
