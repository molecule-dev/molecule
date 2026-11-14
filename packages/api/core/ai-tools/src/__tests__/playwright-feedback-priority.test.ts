import { type ChildProcess, spawn } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type { FeedbackSpec, PlaywrightFeedbackResult } from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const spec: FeedbackSpec = {
  path: '/app/e2e/catalog.spec.ts',
  content: '',
  command: '',
  cwd: '/app',
}
const passed = (revision: number): PlaywrightFeedbackResult => ({
  spec: spec.path,
  revision,
  status: 'passed',
  durationMs: 0,
  failures: [],
})
const cancelled = (revision: number): PlaywrightFeedbackResult => ({
  ...passed(revision),
  status: 'cancelled',
})
const controllers: ReturnType<typeof createPlaywrightFeedback>[] = []
const roots: string[] = []
const children: ChildProcess[] = []
const alive = async (pid: number): Promise<boolean> => {
  try {
    return !(await readFile(`/proc/${pid}/stat`, 'utf8')).includes(') Z ')
  } catch (_error) {
    return false
  }
}
afterEach(async () => {
  await Promise.all(controllers.splice(0).map((c) => c.close()))
  // Independent explicit processes are bounded native test runs; collect their exits.
  await Promise.all(
    children
      .splice(0)
      .map((c) =>
        c.exitCode !== null
          ? undefined
          : new Promise<void>((done) => c.once('close', () => done())),
      ),
  )
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })))
}, 20_000)

describe('foreground work owns the clock', () => {
  it('cancels the active revision before granting nested foreground leases and restarts only after both release', async () => {
    let runs = 0,
      active = 0
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec] }),
      debounceMs: 5,
      run: async (_s, _f, revision, _emit, signal) => {
        runs++
        active++
        if (runs === 1)
          await new Promise<void>((done) =>
            signal.addEventListener('abort', () => done(), { once: true }),
          )
        active--
        return signal.aborted ? cancelled(revision) : passed(revision)
      },
    })
    controllers.push(watcher)
    watcher.changed(['/app/src/Catalog.tsx'])
    await vi.waitFor(() => expect(active).toBe(1))
    const [releaseA, releaseB] = await Promise.all([watcher.pause(), watcher.pause()])
    expect(active).toBe(0)
    await watcher.settled()
    releaseA()
    releaseA()
    await watcher.settled()
    expect(runs).toBe(1)
    releaseB()
    await watcher.settled()
    expect(runs).toBe(2)
    expect(watcher.takeFailures()).toEqual([])
  })

  it('lets a running spec finish through a source edit, keeps its failure known unreported, and reruns it', async () => {
    const signals: AbortSignal[] = []
    let finish!: () => void
    const onFailures = vi.fn()
    const stale: PlaywrightFeedbackResult = {
      ...passed(1),
      status: 'failed',
      failures: [{ spec: spec.path, line: 8, error: 'stale', locator: 'stale', sourceFiles: [] }],
    }
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec] }),
      debounceMs: 5,
      onFailures,
      run: async (_s, _f, revision, emit, signal) => {
        signals.push(signal)
        if (revision !== 1) return { ...stale, revision }
        await new Promise<void>((done) => (finish = done))
        emit(stale)
        return stale
      },
    })
    controllers.push(watcher)
    watcher.changed(['/app/src/Catalog.tsx'])
    await vi.waitFor(() => expect(signals).toHaveLength(1))
    watcher.changed(['/app/src/Catalog.tsx'])
    expect(signals[0].aborted).toBe(false)
    finish()
    await vi.waitFor(() => expect(signals).toHaveLength(2))
    await watcher.settled()
    // The first run described revision 1 only: never reported, but the spec is a known failure.
    expect(onFailures).toHaveBeenCalledTimes(1)
    expect(onFailures.mock.calls[0]?.[0]).toMatchObject({ revision: 2 })
    expect(watcher.failingSpecs()).toEqual([spec.path])
  })

  it('finishes and rotates through every spec while a write lands during each run', async () => {
    const specs = ['account', 'catalog', 'profile'].map((name) => ({
      ...spec,
      path: `/app/e2e/${name}.spec.ts`,
    }))
    const visits: string[] = []
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs }),
      debounceMs: 1,
      run: async (s, _f, revision) => {
        visits.push(s.path)
        // The agent keeps writing: a save arrives while every spec runs.
        if (visits.length < 6) watcher.changed(['/app/src/Profile.tsx'])
        return s.path.includes('profile')
          ? {
              ...passed(revision),
              spec: s.path,
              status: 'failed',
              failures: [
                { spec: s.path, line: 4, error: 'not found', locator: '.bio', sourceFiles: [] },
              ],
            }
          : { ...passed(revision), spec: s.path }
      },
    })
    controllers.push(watcher)
    watcher.changed(['/app/src/Profile.tsx'])
    await vi.waitFor(() => expect(visits.length).toBeGreaterThanOrEqual(6))
    await watcher.settled()
    // Least recently run first, so the third file is reached under continuous writes.
    expect(visits.slice(0, 3)).toEqual(specs.map((s) => s.path))
    expect(watcher.failingSpecs()).toEqual(['/app/e2e/profile.spec.ts'])
    // The rotation continues in turn: a known failure does not take every pass from the others.
    expect(visits.slice(3, 6)).toEqual(specs.map((s) => s.path))
  })

  it('still interrupts an explicit checkpoint on a source edit', async () => {
    const signals: AbortSignal[] = []
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec] }),
      debounceMs: 5,
      run: async (_s, _f, revision, _emit, signal, mode) => {
        if (mode !== 'foreground') return passed(revision)
        signals.push(signal)
        await new Promise<void>((done) =>
          signal.addEventListener('abort', () => done(), { once: true }),
        )
        return cancelled(revision)
      },
    })
    controllers.push(watcher)
    const result = watcher.check()
    await vi.waitFor(() => expect(signals).toHaveLength(1))
    watcher.changed(['/app/src/Catalog.tsx'])
    expect(signals[0].aborted).toBe(true)
    expect(await result).toEqual([])
  })

  it('does not wait for an in-flight metadata load or start native work while paused', async () => {
    let complete!: (value: { sources: []; specs: FeedbackSpec[] }) => void
    const load = vi.fn(
      () =>
        new Promise<{ sources: []; specs: FeedbackSpec[] }>((done) => {
          complete = done
        }),
    )
    const run = vi.fn()
    const watcher = createPlaywrightFeedback({ load, run, debounceMs: 5 })
    controllers.push(watcher)
    watcher.changed(['/app/src/Catalog.tsx'])
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce())
    const release = await watcher.pause()
    complete({ sources: [], specs: [spec] })
    await watcher.settled()
    expect(run).not.toHaveBeenCalled()
    await watcher.close()
    release()
  })
})

async function fixture(): Promise<{ root: string; spec: FeedbackSpec }> {
  const root = await mkdtemp(join(tmpdir(), 'feedback-priority-'))
  roots.push(root)
  return { root, spec: { ...spec, path: join(root, 'catalog.spec.ts'), cwd: root } }
}
async function loop(root: string): Promise<string> {
  const program = join(root, 'loop.cjs')
  await writeFile(
    program,
    `const fs=require('node:fs'),cp=require('node:child_process'),os=require('node:os');
const child=cp.spawn(process.execPath,['-e','setTimeout(()=>{},6000)'],{stdio:'ignore'});
fs.writeFileSync('started.json',JSON.stringify({pid:process.pid,child:child.pid,nice:os.getPriority(0),internal:process.env.MOL_TEST_INTERNAL,idle:cp.spawnSync('chrt',['-p',String(process.pid)],{encoding:'utf8'}).stdout.includes('SCHED_IDLE'),io:cp.spawnSync('ionice',['-p',String(process.pid)],{encoding:'utf8'}).stdout.trim()}));
setTimeout(()=>{},6000);`,
  )
  return `${shellQuote(process.execPath)} ${shellQuote(program)}`
}
async function started(root: string): Promise<{
  pid: number
  child: number
  nice: number
  internal: string
  idle: boolean
  io: string
}> {
  let value!: {
    pid: number
    child: number
    nice: number
    internal: string
    idle: boolean
    io: string
  }
  await vi.waitFor(
    async () => {
      value = JSON.parse(await readFile(join(root, 'started.json'), 'utf8'))
      expect(value.pid).toBeGreaterThan(0)
    },
    { timeout: 3000 },
  )
  return value
}

it('aborts the real native process group, removes its private reports, and returns without the test timeout', async () => {
  const f = await fixture(),
    abort = new AbortController()
  const command = await loop(f.root)
  const run = runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
    command: () => command,
    signal: abort.signal,
    scratchRoot: join(f.root, 'scratch'),
  })
  const owned = await started(f.root)
  const time = performance.now()
  abort.abort()
  expect((await run).status).toBe('cancelled')
  expect(performance.now() - time).toBeLessThan(1500)
  await vi.waitFor(async () => {
    expect(await alive(owned.pid)).toBe(false)
    expect(await alive(owned.child)).toBe(false)
  })
  expect(owned.nice).toBe(19)
  expect(owned.internal).toBe('1')
  expect(owned.idle).toBe(true)
  expect(owned.io).toBe('idle')
}, 10_000)

it('yields to an independent native Playwright command without stopping or refusing that explicit run', async () => {
  const f = await fixture(),
    abort = new AbortController()
  const command = await loop(f.root)
  const run = runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
    command: () => command,
    signal: abort.signal,
    scratchRoot: join(f.root, 'scratch'),
  })
  const owned = await started(f.root)
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  await symlink(dirname(dirname(dirname(cli))), join(f.root, 'node_modules'), 'dir')
  await writeFile(join(f.root, 'package.json'), '{"type":"module"}')
  await writeFile(
    join(f.root, 'playwright.config.mjs'),
    `export default {testDir:'.',workers:1,timeout:5000}`,
  )
  await writeFile(
    f.spec.path,
    `import {test,expect} from '@playwright/test';test('explicit catalog',async()=>{await new Promise(r=>setTimeout(r,300));expect(2+2).toBe(4)})`,
  )
  const explicit = spawn(process.execPath, [cli, 'test', '--config', 'playwright.config.mjs'], {
    cwd: f.root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(explicit)
  let output = ''
  explicit.stdout?.on('data', (text) => {
    output += text
  })
  explicit.stderr?.on('data', (text) => {
    output += text
  })
  const finished = new Promise<number | null>((done) => explicit.once('close', done))
  const time = performance.now()
  try {
    expect((await run).status).toBe('cancelled')
    expect(performance.now() - time).toBeLessThan(1500)
    await vi.waitFor(async () => {
      expect(await alive(owned.pid)).toBe(false)
      expect(await alive(owned.child)).toBe(false)
    })
    expect(await finished).toBe(0)
    expect(output).toContain('1 passed')
  } finally {
    abort.abort()
    await run
  }
}, 15_000)

it.each([
  ['playwright/cli.js', 'test'],
  ['tools/cli.js', 'build'],
  ['tools/cli.js', 'deploy'],
])(
  'does not start a browser while independent %s %s work is already active',
  async (entry, action) => {
    const f = await fixture()
    await mkdir(dirname(join(f.root, entry)), { recursive: true })
    const cli = join(f.root, entry)
    await writeFile(cli, 'setTimeout(()=>{},1000)')
    const explicit = spawn(process.execPath, [cli, action], { cwd: f.root, stdio: 'ignore' })
    children.push(explicit)
    const command = await loop(f.root)
    const result = await runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
      command: () => command,
    })
    expect(result.status).toBe('cancelled')
    expect(result.reason).toEqual(expect.stringMatching(/^yielded to .+ \(pid \d+\)$/))
    await expect(readFile(join(f.root, 'started.json'))).rejects.toThrow(/ENOENT/)
  },
)

it('cleans up Chromium descendants even when the browser creates its own process group', async () => {
  const f = await fixture(),
    abort = new AbortController()
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  await symlink(dirname(dirname(dirname(cli))), join(f.root, 'node_modules'), 'dir')
  await writeFile(join(f.root, 'package.json'), '{"type":"module"}')
  await writeFile(
    join(f.root, 'playwright.config.mjs'),
    `export default {testDir:'.',workers:1,timeout:60000}`,
  )
  // The run is cancelled once the browser is up, so the long wait only has to outlast a slow
  // browser start on a loaded host (6 s was not enough at three times the CPU count).
  await writeFile(
    f.spec.path,
    `import {test} from '@playwright/test';import{writeFileSync}from'node:fs';test('open catalog',async({page})=>{await page.setContent('<p>Catalog</p>');writeFileSync('browser-ready','yes');await page.waitForTimeout(50000)})`,
  )
  const command = `${shellQuote(process.execPath)} ${shellQuote(cli)} test --config playwright.config.mjs`
  const run = runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
    command: (flags) => `${command} ${flags.join(' ')}`,
    signal: abort.signal,
  })
  try {
    await vi.waitFor(
      async () => expect(await readFile(join(f.root, 'browser-ready'), 'utf8')).toBe('yes'),
      { timeout: 40_000 },
    )
    const pids: number[] = []
    for (const pid of await readdir('/proc')) {
      if (!/^\d+$/.test(pid)) continue
      try {
        if ((await readlink(`/proc/${pid}/cwd`)) === f.root) pids.push(Number(pid))
      } catch (_error) {
        /* exited */
      }
    }
    expect(pids.length).toBeGreaterThan(3)
    abort.abort()
    expect((await run).status).toBe('cancelled')
    await vi.waitFor(async () => expect(await Promise.all(pids.map(alive))).not.toContain(true))
  } finally {
    abort.abort()
    await run
  }
}, 60_000)

it('recognizes npm process titles before the package script launches its native runner', async () => {
  const f = await fixture()
  const script = join(f.root, 'package-manager.cjs')
  await writeFile(
    script,
    `process.title='npm run build';require('node:fs').writeFileSync('explicit-ready','yes');setTimeout(()=>{},1000)`,
  )
  children.push(spawn(process.execPath, [script], { cwd: f.root, stdio: 'ignore' }))
  await vi.waitFor(async () =>
    expect(await readFile(join(f.root, 'explicit-ready'), 'utf8')).toBe('yes'),
  )
  const command = await loop(f.root)
  const result = await runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
    command: () => command,
  })
  expect(result.status).toBe('cancelled')
  await expect(readFile(join(f.root, 'started.json'))).rejects.toThrow(/ENOENT/)
})

it('ignores a native run in a different project and leaves a passing diagnosis silent', async () => {
  const f = await fixture(),
    other = await fixture()
  await mkdir(join(other.root, 'playwright'))
  const cli = join(other.root, 'playwright/cli.js')
  await writeFile(cli, 'setTimeout(()=>{},1000)')
  children.push(spawn(process.execPath, [cli, 'test'], { cwd: other.root, stdio: 'ignore' }))
  const command = `${shellQuote(process.execPath)} -e ${shellQuote(`require('node:fs').writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,JSON.stringify({suites:[],stats:{expected:1,unexpected:0,flaky:0,skipped:0,duration:1}}))`)}`
  const result = await runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
    command: () => command,
  })
  expect(result.status).toBe('passed')
  expect(result.failures).toEqual([])
  await expect(readFile(join(f.root, '.mol/test-feedback'))).rejects.toThrow(/ENOENT/)
})

it.each(['hurl', 'curl'])(
  'keeps a browser diagnosis running beside a light %s HTTP client',
  async (client) => {
    const f = await fixture()
    const entry = join(f.root, client + '.cjs')
    await writeFile(
      entry,
      `process.title=${JSON.stringify(client)};require('node:fs').writeFileSync('client-ready','yes');setTimeout(()=>{},1500)`,
    )
    children.push(spawn(process.execPath, [entry], { cwd: f.root, stdio: 'ignore' }))
    await vi.waitFor(async () =>
      expect(await readFile(join(f.root, 'client-ready'), 'utf8')).toBe('yes'),
    )
    const command = `${shellQuote(process.execPath)} -e ${shellQuote(`require('node:fs').writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,JSON.stringify({suites:[],stats:{expected:1,unexpected:0,flaky:0,skipped:0,duration:1}}))`)}`
    const result = await runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
      command: () => command,
    })
    expect(result.status).toBe('passed')
    expect(result.failures).toEqual([])
  },
)
