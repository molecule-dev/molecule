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
  // Stand-in processes run until their test ends: a fixed one-second lifetime could end before a
  // busy host started the run that had to see them. Stop any still running, then collect exits.
  await Promise.all(
    children.splice(0).map((c) => {
      if (c.exitCode !== null || c.signalCode !== null) return undefined
      const closed = new Promise<void>((done) => c.once('close', () => done()))
      c.kill('SIGKILL')
      return closed
    }),
  )
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })))
}, 20_000)

describe('foreground work owns the clock', () => {
  it('re-runs only a known failure while writes keep arriving', async () => {
    const known = { ...spec, path: '/app/e2e/profile.spec.ts' }
    const visits: string[] = []
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec, known] }),
      run: async (s, _files, revision) => {
        visits.push(s.path)
        if (visits.length < 6) watcher.changed(['/app/src/Profile.tsx'])
        return { ...passed(revision), spec: s.path, status: 'failed', failures: [] }
      },
    })
    controllers.push(watcher)
    watcher.record([{ ...passed(0), spec: known.path, status: 'failed' }], 0)
    watcher.changed(['/app/src/Profile.tsx'])
    // Each write interrupts the checkpoint and discards its partial answer; every checkpoint
    // still re-verifies only the known failure.
    for (let n = 1; n <= 6; n++) await watcher.check({ failedOnly: true })
    expect(visits).toEqual(Array(6).fill(known.path))
    expect(watcher.failingSpecs()).toEqual([known.path])
  })

  it('still interrupts an explicit checkpoint on a source edit', async () => {
    const signals: AbortSignal[] = []
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec] }),
      run: async (_s, _f, revision, _emit, signal) => {
        signals.push(signal)
        await new Promise<void>((done) =>
          signal.addEventListener('abort', () => done(), { once: true }),
        )
        return cancelled(revision)
      },
    })
    // A completed host run established these failures before the source write.
    watcher.record(
      [spec].map(({ path }) => ({
        spec: path,
        revision: 0,
        durationMs: 1,
        status: 'failed',
        failures: [],
      })),
      0,
    )

    controllers.push(watcher)
    const result = watcher.check()
    await vi.waitFor(() => expect(signals).toHaveLength(1))
    watcher.changed(['/app/src/Catalog.tsx'])
    expect(signals[0].aborted).toBe(true)
    expect(await result).toEqual([])
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
/**
 * How long a run may take to start. These runs take the idle CPU class, so on a host whose CPUs
 * are all busy they start only when a CPU frees up: 3 s was too short at load 70 on 14 CPUs
 * (2026-11-16). What the tests time is the run's exit after a cancel, never its start.
 */
const START_WAIT_MS = 30_000
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
    { timeout: START_WAIT_MS },
  )
  return value
}

it(
  'aborts the real native process group, removes its private reports, and returns without the test timeout',
  async () => {
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
    // Well before the loop's own 6 s, including the time its killed processes take to exit.
    expect(performance.now() - time).toBeLessThan(2500)
    // The run returns only once its processes are gone: no waiting here.
    expect(await alive(owned.pid)).toBe(false)
    expect(await alive(owned.child)).toBe(false)
    expect(owned.nice).toBe(19)
    expect(owned.internal).toBe('1')
    expect(owned.idle).toBe(true)
    expect(owned.io).toBe('idle')
  },
  START_WAIT_MS + 10_000,
)

it(
  'returns only after its killed processes exit, even on a CPU that normal work saturates',
  async () => {
    const f = await fixture(),
      abort = new AbortController()
    // One CPU this test may use, for the run and for a loop that saturates it.
    const cpu = /Cpus_allowed_list:\s*(\d+)/.exec(await readFile('/proc/self/status', 'utf8'))?.[1]
    if (!cpu) throw new Error('no allowed CPU in /proc/self/status')
    // A browser run is busy, not asleep: a sleeping process is woken by the kill and can exit at
    // once, so the run's processes compute until they are killed. One process can still happen to
    // be scheduled at once; five together make every one of them dying quickly vanishingly rare
    // (all five were gone within 150 ms in none of 12 measured trials, and within 0.75 s in all).
    const program = join(f.root, 'spin.cjs')
    await writeFile(
      program,
      `const fs=require('node:fs'),cp=require('node:child_process');
const children=[1,2,3,4].map(()=>cp.spawn(process.execPath,['-e','for(;;){}'],{stdio:'ignore'}).pid);
fs.writeFileSync('started.json',JSON.stringify({pid:process.pid,child:children[0],children}));
for(;;){}`,
    )
    // Its output goes elsewhere, as a browser's does (Playwright pipes Chromium's): a process holding
    // the supervisor's inherited stdio would keep the host's wait open by itself.
    const command = `taskset -c ${cpu} ${shellQuote(process.execPath)} ${shellQuote(program)} </dev/null >/dev/null 2>&1`
    const run = runPlaywrightFeedback(createLocalBackend(f.root), f.spec, [], 1, {
      command: () => command,
      signal: abort.signal,
      scratchRoot: join(f.root, 'scratch'),
    })
    const owned = await started(f.root)
    const children: number[] = JSON.parse(
      await readFile(join(f.root, 'started.json'), 'utf8'),
    ).children
    // The run's processes are on the idle CPU class. Beside a normal-priority loop on their CPU they
    // get almost no time, so a SIGKILLed one stays runnable for hundreds of milliseconds before it
    // can exit (measured 0.7 s with one loop, 4.6 s with four). A supervisor that exited at once
    // told the host the run was gone while it still held its port and memory.
    const busy = spawn('taskset', ['-c', cpu, process.execPath, '-e', 'for(;;){}'], {
      stdio: 'ignore',
    })
    try {
      await new Promise((done) => setTimeout(done, 300))
      abort.abort()
      // A supervisor that does not wait returns within ~100 ms, while the loop still starves its
      // killed processes. Ending the loop a second later bounds how long a waiting one takes.
      const release = setTimeout(() => busy.kill('SIGKILL'), 1000)
      try {
        expect((await run).status).toBe('cancelled')
      } finally {
        clearTimeout(release)
      }
      expect(await Promise.all([owned.pid, ...children].map(alive))).not.toContain(true)
    } finally {
      busy.kill('SIGKILL')
    }
  },
  START_WAIT_MS + 20_000,
)

it(
  'yields to an independent native Playwright command without stopping or refusing that explicit run',
  async () => {
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
      expect(performance.now() - time).toBeLessThan(2500)
      expect(await alive(owned.pid)).toBe(false)
      expect(await alive(owned.child)).toBe(false)
      expect(await finished).toBe(0)
      expect(output).toContain('1 passed')
    } finally {
      abort.abort()
      await run
    }
  },
  START_WAIT_MS + 15_000,
)

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
    await writeFile(cli, 'setInterval(()=>{},1000)')
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
    `process.title='npm run build';require('node:fs').writeFileSync('explicit-ready','yes');setInterval(()=>{},1000)`,
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
  await writeFile(cli, 'setInterval(()=>{},1000)')
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
      `process.title=${JSON.stringify(client)};require('node:fs').writeFileSync('client-ready','yes');setInterval(()=>{},1000)`,
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
