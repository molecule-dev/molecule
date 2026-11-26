import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { PlaywrightWorkerOptions } from '@playwright/test'
import { afterEach, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 60_000 })

const runner = createRequire(import.meta.url).resolve('@playwright/test/cli')
const fixtures = new URL('../../dist/index.js', import.meta.url).href
const core = import.meta.resolve('@molecule/app-e2e')
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// Keep the real runner, fixture resolver and inherited browser fixture. Stub the engine's launch
// and connect calls so preparing the browser is the only code that can invoke the project CLI.
const SPEC_HEADER = `
import { EventEmitter } from 'node:events'
import { appendFileSync } from 'node:fs'
import { setProvider } from ${JSON.stringify(core)}
import { test as base, expect } from ${JSON.stringify(fixtures)}

const record = (event) => appendFileSync(process.env.EVENT_LOG, JSON.stringify(event) + '\\n')
const page = Object.assign(new EventEmitter(), { evaluate: async () => undefined, close: async () => {} })
const browser = {
  _connection: {},
  async close() {},
  async newContext() { return { newPage: async () => page, close: async () => {} } },
}
if (process.env.MOL_E2E_PROVIDER === 'preview') {
  setProvider({ name: 'preview', async connect() { record({ kind: 'preview' }); return page } })
}
const test = base.extend({
  playwright: [async ({ playwright }, use, { workerIndex }) => {
    for (const name of ['chromium', 'firefox', 'webkit']) {
      for (const kind of ['launch', 'connect']) {
        playwright[name][kind] = async () => { record({ kind, name, workerIndex }); return browser }
      }
    }
    await use(playwright)
  }, { scope: 'worker' }],
})
`

const PAGE = `test('page', async ({ page }) => {
  expect(page).toBeDefined(); record({ kind: 'page' })
})`
const REQUEST = `test('request', async ({ request }) => {
  expect(request).toBeDefined(); record({ kind: 'request' })
})`
const SHELL = ['--only-shell', 'chromium']
const CHROMIUM = ['--no-shell', 'chromium']

interface Event {
  kind: string
  args?: string[]
  workerIndex?: number
}

interface RunOptions {
  use?: Partial<PlaywrightWorkerOptions>
  env?: NodeJS.ProcessEnv
  workers?: number
  retries?: number
  filters?: string[]
  externalConfig?: boolean
  cliInProject?: boolean
}

/** Create a suite outside the checkout and run it with a project-local recording installer. */
function run(
  specs: string[],
  {
    use,
    env,
    workers = 1,
    retries = 0,
    filters = [],
    externalConfig = false,
    cliInProject = false,
  }: RunOptions = {},
) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mol-browser-ready-')))
  dirs.push(root)
  const invocation = externalConfig ? join(root, 'app') : root
  const dir = externalConfig ? join(root, 'suite') : root
  const eventsPath = join(dir, 'events.jsonl')
  const cache = join(invocation, 'browser-cache')
  const playable = join(cliInProject ? invocation : dir, 'node_modules/@playwright/test')
  mkdirSync(invocation, { recursive: true })
  mkdirSync(dir, { recursive: true })
  mkdirSync(playable, { recursive: true })
  if (env?.PLAYWRIGHT_BROWSERS_PATH === '0') {
    const playwright = join(playable, 'node_modules/playwright')
    const core = join(playwright, 'node_modules/playwright-core')
    mkdirSync(core, { recursive: true })
    writeFileSync(join(playwright, 'package.json'), '{}')
    writeFileSync(join(core, 'package.json'), '{}')
  }
  writeFileSync(
    join(playable, 'package.json'),
    JSON.stringify({
      version: '1.64.1',
      exports: { './cli': './cli.cjs', './package.json': './package.json' },
    }),
  )
  writeFileSync(
    join(playable, 'cli.cjs'),
    `const { appendFileSync } = require('node:fs')
    appendFileSync(process.env.EVENT_LOG, JSON.stringify({
      kind: 'install', args: process.argv.slice(2), cwd: process.cwd(),
      cache: process.env.PLAYWRIGHT_BROWSERS_PATH, cacheBase: process.env.INIT_CWD,
      proxy: process.env.HTTPS_PROXY,
      node: process.execPath,
    }) + '\\n')
    console.log('Recording download progress')
    setTimeout(() => {
      if (process.env.FAIL_INSTALL !== '1') return
      console.error('Error: CDN unavailable\\n    at mockDownload (cli.cjs:1:1)')
      process.exitCode = 7
    }, 350)`,
  )
  writeFileSync(
    join(dir, 'playwright.config.mjs'),
    `export default ${JSON.stringify({ testDir: '.', reporter: 'list', workers, retries, use })}`,
  )
  specs.forEach((spec, index) =>
    writeFileSync(join(dir, `${index}.spec.mjs`), `${SPEC_HEADER}\n${spec}`),
  )
  const proxy = 'http://127.0.0.1:9'
  const config = externalConfig ? ['--config', join(dir, 'playwright.config.mjs')] : []
  const result = spawnSync(process.execPath, [runner, 'test', ...config, ...filters], {
    cwd: invocation,
    env: {
      ...process.env,
      DEBUG_COLORS: '0',
      FORCE_COLOR: '0',
      MOL_E2E_PROVIDER: 'playwright',
      MOL_E2E_RRWEB: undefined,
      MOL_E2E_SKIP_BROWSER_INSTALL: undefined,
      PW_TEST_CONNECT_WS_ENDPOINT: undefined,
      PWDEBUG: undefined,
      SELENIUM_REMOTE_URL: undefined,
      PLAYWRIGHT_BROWSERS_PATH: externalConfig ? './browser-cache' : cache,
      INIT_CWD: externalConfig ? '.' : undefined,
      HTTPS_PROXY: proxy,
      EVENT_LOG: eventsPath,
      ...env,
    },
    encoding: 'utf8',
    timeout: 25_000,
  })
  if (result.error) throw result.error
  const events: Event[] = existsSync(eventsPath)
    ? readFileSync(eventsPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    : []
  return {
    events,
    dir,
    invocation,
    cache,
    proxy,
    output: result.stdout + result.stderr,
    status: result.status,
  }
}

it('installs with the suite CLI and streams progress before the inherited browser launches', () => {
  const { events, status, output, dir, invocation, proxy } = run([PAGE], { externalConfig: true })
  expect(status, output).toBe(0)
  expect(events.map(({ kind }) => kind)).toEqual(['install', 'launch', 'page'])
  expect(events[0]).toEqual({
    kind: 'install',
    args: ['install', ...SHELL],
    cwd: dir,
    cache: './browser-cache',
    cacheBase: invocation,
    proxy,
    node: process.execPath,
  })
  expect(output).toMatch(
    /Molecule browser setup[^\n]*--only-shell chromium[\s\S]*Recording download progress/,
  )
})

it('uses the invoking project CLI when the suite has an external config', () => {
  const { events, status, output, dir } = run([PAGE], { externalConfig: true, cliInProject: true })
  expect(status, output).toBe(0)
  expect(events.map(({ kind }) => kind)).toEqual(['install', 'launch', 'page'])
  expect(events[0]).toMatchObject({ args: ['install', ...SHELL], cwd: dir })
})

it.each<{
  name: string
  use?: Partial<PlaywrightWorkerOptions>
  env?: NodeJS.ProcessEnv
  args: string[]
}>([
  { name: 'headed', use: { headless: false }, args: CHROMIUM },
  { name: 'headed in launchOptions', use: { launchOptions: { headless: false } }, args: CHROMIUM },
  { name: 'managed chromium channel', use: { channel: 'chromium' }, args: CHROMIUM },
  {
    name: 'managed channel in launchOptions',
    use: { launchOptions: { channel: 'chromium' } },
    args: CHROMIUM,
  },
  { name: 'inspector-forced headed', env: { PWDEBUG: '1' }, args: CHROMIUM },
  { name: 'console debug', env: { PWDEBUG: 'console' }, args: SHELL },
  { name: 'firefox', use: { browserName: 'firefox' }, args: ['firefox'] },
  { name: 'webkit', use: { browserName: 'webkit' }, args: ['webkit'] },
])('installs the effective target for $name', ({ use, env, args }) => {
  const overrides = use ? `test.use(${JSON.stringify(use)})\n` : ''
  const { status, events, output } = run([`${overrides}${PAGE}`], {
    use: { browserName: 'chromium' },
    env,
  })
  expect(status, output).toBe(0)
  expect(events.map(({ kind }) => kind)).toEqual(['install', 'launch', 'page'])
  expect(events[0]?.args).toEqual(['install', ...args])
})

it('uses the project options if the spec supplies no override', () => {
  const { status, events, output } = run([PAGE], { use: { browserName: 'webkit' } })
  expect(status, output).toBe(0)
  expect(events[0]?.args).toEqual(['install', 'webkit'])
})

it('reports the package-local cache when the project nests its Playwright dependencies', () => {
  const { status, events, output, dir } = run([PAGE], {
    env: { PLAYWRIGHT_BROWSERS_PATH: '0', FAIL_INSTALL: '1' },
  })
  expect(status, output).toBe(1)
  expect(events.map(({ kind }) => kind)).toEqual(['install'])
  expect(output).toContain(
    join(
      dir,
      'node_modules/@playwright/test/node_modules/playwright/node_modules/playwright-core/.local-browsers',
    ),
  )
})

it('does not start a browser for a Molecule request-only test', () => {
  const { status, events, output } = run([REQUEST])
  expect(status, output).toBe(0)
  expect(events).toEqual([{ kind: 'request' }])
})

it('uses the preview only for its page test without calling the installer', () => {
  const { status, events, output } = run([`${REQUEST}\n${PAGE}`], {
    env: { MOL_E2E_PROVIDER: 'preview' },
  })
  expect(status, output).toBe(0)
  expect(events.map(({ kind }) => kind)).toEqual(['request', 'preview', 'page'])
})

it('skips alternate launches in the same run that prepares the managed browser', () => {
  const alternate: Partial<PlaywrightWorkerOptions>[] = [
    { connectOptions: { wsEndpoint: 'ws://127.0.0.1:9/' } },
    { launchOptions: { executablePath: '/custom/browser' } },
    { channel: 'chrome' },
    { launchOptions: { channel: 'msedge' } },
    { channel: 'an-unknown-channel' },
  ]
  const { status, events, output } = run([
    PAGE,
    ...alternate.map((options) => `test.use(${JSON.stringify(options)})\n${PAGE}`),
  ])
  expect(status, output).toBe(0)
  expect(events.map(({ kind }) => kind)).toEqual([
    'install',
    'launch',
    'page',
    'connect',
    'page',
    'launch',
    'page',
    'launch',
    'page',
    'launch',
    'page',
    'launch',
    'page',
  ])
})

it.each([
  { env: 'PW_TEST_CONNECT_WS_ENDPOINT', value: 'ws://127.0.0.1:9/', action: 'connect' },
  { env: 'SELENIUM_REMOTE_URL', value: 'http://127.0.0.1:9/', action: 'launch' },
  { env: 'MOL_E2E_SKIP_BROWSER_INSTALL', value: '1', action: 'launch' },
])('skips setup when $env is set', ({ env, value, action }) => {
  const selected = run([PAGE])
  const overridden = run([PAGE], { env: { [env]: value } })
  expect(selected.status, selected.output).toBe(0)
  expect(overridden.status, overridden.output).toBe(0)
  expect(selected.events[0]?.args).toEqual(['install', ...SHELL])
  expect(overridden.events.map(({ kind }) => kind)).toEqual([action, 'page'])
})

it('installs only if the selection includes a browser test', () => {
  const selected = run([PAGE], { filters: ['--grep', 'page$'] })
  const empty = run([PAGE], { filters: ['--grep', 'no-match', '--pass-with-no-tests'] })
  expect(selected.status, selected.output).toBe(0)
  expect(empty.status, empty.output).toBe(0)
  expect(selected.events[0]?.args).toEqual(['install', ...SHELL])
  expect(empty.events).toEqual([])
})

it('shares one successful install with both Playwright workers before either launches', () => {
  const { status, events, output } = run([PAGE, PAGE], { workers: 2 })
  expect(status, output).toBe(0)
  expect(events[0]?.kind).toBe('install')
  expect(events.filter(({ kind }) => kind === 'install')).toHaveLength(1)
  const launches = events.filter(({ kind }) => kind === 'launch')
  expect(new Set(launches.map(({ workerIndex }) => workerIndex)).size).toBe(2)
  expect(events.filter(({ kind }) => kind === 'page')).toHaveLength(2)
})

it('shares one failed install across workers and retries and reports it before any launch', () => {
  const { status, events, output, dir, cache } = run([PAGE, PAGE], {
    workers: 2,
    retries: 1,
    env: { FAIL_INSTALL: '1' },
  })
  expect(status, output).toBe(1)
  expect(events.map(({ kind }) => kind)).toEqual(['install'])
  const errors = output.match(/^\s*Error: MOL_E2E_BROWSER_SETUP_FAILED[^\n]*/gm) ?? []
  expect(errors).toHaveLength(4)
  for (const error of errors) {
    expect(error).toContain('exit code 7')
    expect(error).toContain('Error: CDN unavailable')
    expect(error).not.toContain('mockDownload')
    expect(error).toContain('cli.cjs')
    expect(error).toContain(dir)
    expect(error).toContain(cache)
  }
}, 30_000)
