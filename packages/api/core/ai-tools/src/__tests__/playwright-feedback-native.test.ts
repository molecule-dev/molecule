import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type { FeedbackSpec, PlaywrightFeedbackResult } from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const require = createRequire(import.meta.url)
let root: string
let broken = true
let server: ReturnType<typeof createServer>
let specs: FeedbackSpec[]
let cli: string
let backend: ReturnType<typeof createLocalBackend>
const controllers: Array<ReturnType<typeof createPlaywrightFeedback>> = []

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'native-feedback-'))
  // The supplied tests run against a real browser and real HTTP server. The
  // app state (including the edit route) is exercised by the supplied flow.
  server = createServer((req, res) => {
    if (req.url === '/slow') {
      setTimeout(() => res.end('done'), 400)
      return
    }
    const edit = req.url === '/notes/edit'
    res.setHeader('Content-Type', 'text/html')
    res.end(
      `<main><h1>Field notebook</h1><section>${broken ? '<div>' : '<p>'}A long observation${broken ? '</div>' : '</p>'}</section><button>${broken && edit ? 'Update entry' : 'Publish entry'}</button><button class="${broken ? 'selected' : 'unselected'}">Save item</button><article class="item"><a class="owner">Reader</a>${broken ? '<a class="owner">Reader</a>' : ''}</article><aside><a href="/catalog">${broken ? 'See some items' : 'Browse the catalog'}</a></aside></main>`,
    )
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = (server.address() as { port: number }).port
  cli = require.resolve('@playwright/test/cli')
  const modules = dirname(dirname(dirname(cli)))
  await symlink(modules, join(root, 'node_modules'), 'dir')
  await mkdir(join(root, 'e2e'))
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  // The supplied suite's own budgets. Background feedback runs at low CPU priority, so a correct
  // app's click can wait well over half a second for a stable frame while the rest of this package's
  // tests run: a 600 ms budget failed "gives a corrected app no note" in a full run (1 of 1852)
  // and passed alone. Two seconds keeps the broken cases quick.
  await writeFile(
    join(root, 'playwright.config.mjs'),
    `export default {testDir:'./e2e',workers:1,retries:0,timeout:5000,expect:{timeout:2000},use:{baseURL:'http://127.0.0.1:${port}',actionTimeout:2000}}`,
  )
  const bodies = [
    [
      'body.spec.ts',
      "test('body is a paragraph', async ({page}) => { await page.goto('/notes'); await expect(page.locator('p').filter({hasText:'A long observation'})).toBeVisible() }); test('later work still runs', async ({request}) => { expect((await request.get('/slow')).ok()).toBe(true) })",
    ],
    [
      'edit.spec.ts',
      "test('edit uses the asserted submit label', async ({page}) => { await page.goto('/notes/edit'); await page.click('button:has-text(\"Publish entry\")') })",
    ],
    [
      'button.spec.ts',
      "test('button state matches its selector',async({page})=>{await page.goto('/notes');await page.locator('button.unselected:has-text(\"Save item\")').click()})",
    ],
    [
      'owner.spec.ts',
      "test('owner read is strict',async({page})=>{await page.goto('/notes');expect(await page.locator('.item').first().locator('.owner').textContent()).toBe('Reader')})",
    ],
    [
      'empty.spec.ts',
      "test('empty state copy matches',async({page})=>{await page.goto('/notes');await expect(page.getByRole('link',{name:'Browse the catalog'})).toBeVisible()})",
    ],
  ]
  specs = await Promise.all(
    bodies.map(async ([name, body]) => {
      const file = join(root, 'e2e', name),
        content = "import {test,expect} from '@playwright/test';\n" + body
      await writeFile(file, content)
      return {
        path: file,
        content,
        cwd: root,
        command: `node ${shellQuote(cli)} test --config playwright.config.mjs ${shellQuote(name)}`,
      }
    }),
  )
  backend = createLocalBackend(root)
})
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await rm(root, { recursive: true, force: true })
})
afterEach(async () => {
  await Promise.all(controllers.splice(0).map((c) => c.close()))
}, 130_000)

describe('native supplied-suite feedback before deploy', () => {
  it('reports the real filtered-p locator, rendered body and component without waiting for a deploy', async () => {
    broken = true
    const early: PlaywrightFeedbackResult[] = []
    let exited = false,
      deliveredBeforeExit = false
    const observing = {
      ...backend,
      run: async (...args: Parameters<typeof backend.run>) => {
        const result = await backend.run(...args)
        if (args[0].includes('MOL_TEST_FEEDBACK_EVENTS=')) exited = true
        return result
      },
    }
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [specs[0]] }),
      run: (spec, files, revision, emit) =>
        runPlaywrightFeedback(observing, spec, files, revision, {
          command: (flags) => `${spec.command} ${flags.join(' ')}`,
          pollMs: 20,
          emit,
        }),
      onFailures: (r) => {
        early.push(r)
        deliveredBeforeExit ||= !exited
      },
    })
    controllers.push(watcher)
    watcher.changed([join(root, 'src/NoteBody.tsx')])
    expect(watcher.takeFailures()).toEqual([])
    await watcher.settled()
    expect(early.length).toBeGreaterThan(0)
    expect(deliveredBeforeExit).toBe(true)
    expect(early).toHaveLength(1)
    const failure = early[0].failures[0]
    expect(failure.locator).toContain("locator('p').filter({ hasText: 'A long observation' })")
    expect(failure.spec).toContain('body.spec.ts')
    expect(failure.line).toBe(2)
    expect(failure.rendered).toContain('A long observation')
    expect(failure.sourceFiles).toEqual([join(root, 'src/NoteBody.tsx')])
    await watcher.close()
  }, 20_000)
  it.each([
    [2, 'button.unselected', 'Save item'],
    [3, '.owner', 'Reader'],
    [4, 'Browse the catalog', 'See some items'],
  ])(
    'reports state, strict duplicates and exact empty copy from native file %i',
    async (index, locator, rendered) => {
      broken = true
      const spec = specs[index as number]
      const result = await runPlaywrightFeedback(
        backend,
        spec,
        [join(root, 'src/Notebook.tsx')],
        1,
        { command: (flags) => `${spec.command} ${flags.join(' ')}` },
      )
      expect(result.status).toBe('failed')
      expect(result.failures[0].locator).toContain(locator)
      expect(result.failures[0].rendered).toContain(rendered)
    },
    20_000,
  )
  // A previous background run that is still being torn down must not cancel the next one; real foreground
  // Playwright work in the project still does. Both use a process whose command line reads as the Playwright CLI.
  it.each([
    [
      'a lingering background feedback run',
      'failed',
      { MOL_TEST_FEEDBACK_EVENTS: '/nonexistent/events' },
    ],
    ['foreground Playwright work', 'cancelled', {}],
  ] as const)(
    'with %s in the project, the native run reports %s',
    async (_label, status, marker) => {
      broken = true
      const fake = join(root, 'lingering', 'node_modules', '@playwright', 'test')
      await mkdir(fake, { recursive: true })
      const ready = join(root, 'lingering', `ready-${status}`)
      await writeFile(
        join(fake, 'cli.js'),
        `require('node:fs').writeFileSync(${JSON.stringify(ready)}, ''); setInterval(() => {}, 1000)\n`,
      )
      const { MOL_TEST_FEEDBACK_EVENTS: _inherited, ...env } = process.env
      const lingering = spawn(process.execPath, [join(fake, 'cli.js'), 'test'], {
        cwd: root,
        env: { ...env, ...marker },
        stdio: 'ignore',
      })
      try {
        for (let i = 0; i < 200 && !existsSync(ready); i++)
          await new Promise((r) => setTimeout(r, 25))
        expect(existsSync(ready)).toBe(true)
        const result = await runPlaywrightFeedback(
          backend,
          specs[3],
          [join(root, 'src/Notebook.tsx')],
          1,
          { command: (flags) => `${specs[3].command} ${flags.join(' ')}` },
        )
        expect(result.status).toBe(status)
        if (status === 'failed') expect(result.failures[0].locator).toContain('.owner')
      } finally {
        lingering.kill('SIGKILL')
        await once(lingering, 'exit')
      }
    },
    20_000,
  )
  // What a process RUNS decides whether a background run stops beside it: a type-check or lint changes nothing
  // the run reads, while a build or a package install does. npm shows its command as the process title, so
  // `npm run --silent typecheck` reads `npm run typecheck` in /proc, which is the title used here.
  it.each([
    ['npm run typecheck', 'failed'],
    ['npm run lint', 'failed'],
    ['npm run build', 'cancelled'],
    ['npm install', 'cancelled'],
    ['npm ci', 'cancelled'],
  ] as const)(
    'with `%s` running in the project, the background run reports %s',
    async (title, status) => {
      broken = true
      const ready = join(root, 'lingering', `title-${title.replace(/\W+/g, '-')}`)
      await mkdir(dirname(ready), { recursive: true })
      const { MOL_TEST_FEEDBACK_EVENTS: _inherited, ...env } = process.env
      const titled = spawn(
        process.execPath,
        [
          '-e',
          `process.title = ${JSON.stringify(title)}; require('node:fs').writeFileSync(${JSON.stringify(ready)}, ''); setInterval(() => {}, 1000)`,
        ],
        { cwd: root, env, stdio: 'ignore' },
      )
      try {
        for (let i = 0; i < 200 && !existsSync(ready); i++)
          await new Promise((r) => setTimeout(r, 25))
        expect(existsSync(ready)).toBe(true)
        const result = await runPlaywrightFeedback(
          backend,
          specs[3],
          [join(root, 'src/Notebook.tsx')],
          1,
          { command: (flags) => `${specs[3].command} ${flags.join(' ')}` },
        )
        expect(result.status).toBe(status)
        if (status === 'failed') expect(result.failures[0].locator).toContain('.owner')
      } finally {
        titled.kill('SIGKILL')
        await once(titled, 'exit')
      }
    },
    20_000,
  )
  // A background run beside a foreground command is the one the kernel kills when memory runs out; an explicit
  // checkpoint is the agent's own run and keeps the score it was started with.
  it.each([
    ['background', '1000', false],
    ['explicit checkpoint', readFileSync('/proc/self/oom_score_adj', 'utf8').trim(), true],
  ] as const)(
    'the %s run carries OOM score %s into its test workers',
    async (label, score, foreground) => {
      const out = join(root, `oom-score-${label.replace(/\W+/g, '-')}`)
      const file = join(root, 'e2e', `score-${foreground ? 'foreground' : 'background'}.spec.ts`)
      const content =
        "import {test} from '@playwright/test'; import {readFileSync, writeFileSync} from 'node:fs';\n" +
        `test('records its score', () => { writeFileSync(${JSON.stringify(out)}, readFileSync('/proc/self/oom_score_adj', 'utf8').trim()) })`
      await writeFile(file, content)
      try {
        const name = file.slice(join(root, 'e2e').length + 1)
        const result = await runPlaywrightFeedback(
          backend,
          {
            path: file,
            content,
            cwd: root,
            command: `node ${shellQuote(cli)} test --config playwright.config.mjs ${shellQuote(name)}`,
          },
          [join(root, 'src/Notebook.tsx')],
          1,
          {
            command: (flags) =>
              `node ${shellQuote(cli)} test --config playwright.config.mjs ${shellQuote(name)} ${flags.join(' ')}`,
            foreground,
          },
        )
        expect(result.status).toBe('passed')
        expect(readFileSync(out, 'utf8')).toBe(score)
      } finally {
        await rm(file, { force: true })
        await rm(out, { force: true })
      }
    },
    20_000,
  )
  it('detects a label that exists only in the branch the edit test does not drive', async () => {
    broken = true
    const result = await runPlaywrightFeedback(
      backend,
      specs[1],
      [join(root, 'src/Editor.tsx')],
      1,
      { command: (flags) => `${specs[1].command} ${flags.join(' ')}` },
    )
    expect(result.status).toBe('failed')
    expect(result.failures[0].locator).toContain('Publish entry')
    expect(result.failures[0].rendered).toContain('Update entry')
  }, 20_000)
  it('gives a corrected app no note while running the same supplied tests', async () => {
    broken = false
    const results: PlaywrightFeedbackResult[] = []
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs }),
      run: (spec, files, revision, emit) =>
        runPlaywrightFeedback(backend, spec, files, revision, {
          command: (flags) => `${spec.command} ${flags.join(' ')}`,
          pollMs: 20,
          emit,
        }),
      onResult: (result) => results.push(result),
    })
    controllers.push(watcher)
    watcher.changed([join(root, 'src/NoteBody.tsx')])
    await watcher.settled()
    expect(watcher.takeFailures()).toEqual([])
    await watcher.close()
    expect(results.map((r) => r.status)).toEqual(Array(specs.length).fill('passed'))
    expect(results.reduce((sum, r) => sum + (r.nativeStats?.expected ?? 0), 0)).toBe(6)
    // Five independent low-priority native runner startups share CPU with the
    // package's other tests. Their own assertion budgets remain unchanged.
  }, 60_000)
  it('reports a spec whose every test skips itself in this mode as skipped, and walks past it', async () => {
    const file = join(root, 'e2e', 'mocked-mode.spec.ts')
    await writeFile(
      file,
      "import {test,expect} from '@playwright/test';\n" +
        "test.beforeEach(({}, testInfo) => { testInfo.skip(!process.env.MOCKED_API, 'mocked-API mode only') });\n" +
        "test('shows the mocked error', async ({page}) => { await page.goto('/notes'); await expect(page.getByText('Mocked')).toBeVisible() });\n" +
        "test('shows the mocked retry', async ({page}) => { await page.goto('/notes') })\n",
    )
    const skipping: FeedbackSpec = {
      path: file,
      content: '',
      cwd: root,
      command: `node ${shellQuote(cli)} test --config playwright.config.mjs mocked-mode.spec.ts`,
    }
    broken = true
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [skipping, specs[0]] }),
      run: (spec, files, revision, emit, signal, mode) =>
        runPlaywrightFeedback(backend, spec, files, revision, {
          command: (flags) => `${spec.command} ${flags.join(' ')}`,
          emit,
          signal,
          foreground: mode === 'foreground',
        }),
    })
    controllers.push(watcher)
    const results = await watcher.check()
    expect(results.map((r) => r.status)).toEqual(['skipped', 'failed'])
    expect(results[0]).toMatchObject({
      nativeStats: { expected: 0, unexpected: 0, skipped: 2 },
      reason: 'every selected test skipped itself (2 skipped)',
    })
    expect(watcher.failingSpecs()).toEqual([specs[0].path])
  }, 60_000)
})
