import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type { PlaywrightFeedback, PlaywrightFeedbackResult } from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const controllers: PlaywrightFeedback[] = []
const roots: string[] = []
const servers: ReturnType<typeof createServer>[] = []
afterEach(async () => {
  await Promise.all(controllers.splice(0).map((controller) => controller.close()))
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((done) => server.close(() => done()))),
  )
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture(broken: boolean) {
  const root = await mkdtemp(join(tmpdir(), 'feedback-routing-'))
  roots.push(root)
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://local')
    response.setHeader('Content-Type', 'text/html')
    if (
      url.searchParams.get('scope') === 'private' &&
      !url.searchParams.has('signedIn') &&
      !broken
    ) {
      response.writeHead(302, { Location: '/sign-in' })
      response.end()
      return
    }
    const destination = broken || url.searchParams.has('homeAfterSave') ? '/' : '/members/operator'
    response.end(`<main>
      <form action="${destination}" onsubmit="event.preventDefault();history.pushState(null,'',this.action)"><input name="summary" value="Operator"><button>Save</button></form>
      <section aria-label="Empty directory">${broken ? 'Nothing here.' : '<a href="/">Browse all devices</a>'}</section>
      <a href="${broken ? '/category/sensors' : '/'}">All devices</a>
      <nav><a href="/sign-in">Sign in</a></nav><article><a href="/sign-in">Sign in</a></article>
    </main>`)
  })
  servers.push(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const baseURL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
  await mkdir(join(root, 'e2e'))
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  await writeFile(
    join(root, 'playwright.config.mjs'),
    `export default {testDir:'./e2e',workers:1,retries:0,timeout:15000,expect:{timeout:300},use:{baseURL:${JSON.stringify(baseURL)},navigationTimeout:3000}}`,
  )
  const files = [
    [
      'slow.spec.ts',
      `test('long inventory walk',async()=>{require('node:fs').writeFileSync('started','yes');await new Promise(done=>setTimeout(done,10000))});`,
    ],
    [
      'routing.spec.ts',
      `
test('save follows the app record destination',async({page})=>{await page.goto('/preferences');await Promise.all([page.waitForURL(/\\/members\\//,{timeout:500}),page.getByRole('button',{name:'Save'}).click()])});
test('anonymous private selection redirects',async({page})=>{await page.goto('/?scope=private');await expect(page).toHaveURL('/sign-in')});
test('empty private selection offers an alternate list',async({page})=>{await page.goto('/?scope=private&signedIn=1');await expect(page.getByRole('region',{name:'Empty directory'}).getByRole('link',{name:'Browse all devices'})).toBeVisible()});
test('switching lists leaves the old filter and page',async({page})=>{await page.goto('/category/sensors?page=2');await page.getByRole('link',{name:'All devices',exact:true}).click();await expect(page).toHaveURL('/')});
test('counterexample: a configured home destination and contextual sign-in links are valid',async({page})=>{await page.goto('/preferences?homeAfterSave=1');await page.getByRole('button',{name:'Save'}).click();await expect(page).toHaveURL('/');await expect(page.locator('article').getByRole('link',{name:'Sign in'})).toBeVisible()});`,
    ],
  ]
  const specs = await Promise.all(
    files.map(async ([name, body]) => {
      const content =
        "import {test,expect} from '@playwright/test';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);\n" +
        body
      const path = join(root, 'e2e', name)
      await writeFile(path, content)
      return {
        path,
        content,
        cwd: root,
        command: `node ${shellQuote(cli)} test --config playwright.config.mjs ${shellQuote(name)}`,
      }
    }),
  )
  return { root, specs, backend: createLocalBackend(root) }
}

it.each([true, false])(
  'after native cancellation reaches routing contracts (broken app: %s)',
  async (broken) => {
    const f = await fixture(broken)
    const visits: string[] = []
    const results: PlaywrightFeedbackResult[] = []
    const controller = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: f.specs }),
      debounceMs: 1,
      onResult: (result) => results.push(result),
      run: (spec, files, revision, emit, signal) => {
        visits.push(spec.path)
        return runPlaywrightFeedback(f.backend, spec, files, revision, {
          command: (flags) => `${spec.command} ${flags.join(' ')}`,
          scratchRoot: join(f.root, 'feedback'),
          timeoutMs: 15000,
          pollMs: 10,
          signal,
          emit,
        })
      },
    })
    controllers.push(controller)
    controller.changed(['/equipment/src/Preferences.tsx'])
    await vi.waitFor(
      async () => expect(await readFile(join(f.root, 'started'), 'utf8')).toBe('yes'),
      { timeout: 8000 },
    )
    const release = await controller.pause()
    expect(results.map((result) => result.status)).toEqual(['cancelled'])
    expect(controller.takeFailures()).toEqual([])
    release()
    await vi.waitFor(() => expect(visits).toHaveLength(2), { timeout: 5000 })
    // Stop a repeated first file before asserting, so the known-bad control leaves no process.
    if (visits[1] !== f.specs[1].path) await controller.pause()
    expect(visits[1]).toBe(f.specs[1].path)
    await vi.waitFor(
      () => expect(results.some((result) => result.spec === f.specs[1].path)).toBe(true),
      { timeout: 12000 },
    )
    await controller.pause()
    const native = results.find((result) => result.spec === f.specs[1].path)!
    expect(native.status, JSON.stringify(native)).toBe(broken ? 'failed' : 'passed')
    expect(native.nativeStats).toMatchObject({
      expected: broken ? 1 : 5,
      unexpected: broken ? 4 : 0,
      skipped: 0,
    })
    expect(native.failures).toHaveLength(broken ? 4 : 0)
    if (broken) {
      expect(
        native.failures.every((failure) => failure.line > 0 && failure.spec === f.specs[1].path),
      ).toBe(true)
      expect(
        native.failures.every(
          (failure) => failure.sourceFiles[0] === '/equipment/src/Preferences.tsx',
        ),
      ).toBe(true)
      expect(native.failures.map((failure) => failure.error).join('\n')).toContain(
        'page.waitForURL',
      )
    } else {
      expect(controller.takeFailures()).toEqual([])
    }
  },
  30000,
)
