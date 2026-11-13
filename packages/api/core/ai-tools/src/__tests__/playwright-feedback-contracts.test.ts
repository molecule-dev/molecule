import { once } from 'node:events'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type { FeedbackSpec, PlaywrightFeedbackResult } from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

let root: string
let server: ReturnType<typeof createServer>
let broken = true
let specs: FeedbackSpec[]
let backend: ReturnType<typeof createLocalBackend>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'feedback-contracts-'))
  server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html')
    response.end(`<main>
      <h1>Equipment directory</h1>
      <ul>${Array.from({ length: broken ? 9 : 7 }, (_, i) => `<li>Sensor ${i}</li>`).join('')}</ul>
      <img alt="Operator" src="${broken ? 'data:image/svg+xml,%3Csvg/%3E' : '/operator.svg'}">
      <button>Subscribe</button>${broken ? '<button>Subscribe</button>' : ''}
      ${broken ? '<button' : '<span role="button" tabindex="0"'} aria-label="Remove reading"><i style="display:inline-block;width:20px;height:20px" onclick="this.parentElement.parentElement.querySelector('output').textContent='Removed'">×</i>${broken ? '</button>' : '</span>'}
      <output>Present</output>
      <aside aria-label="Alternate design"><ol><li>One</li><li>Two</li></ol>
        <img alt="Custom operator" src="data:image/svg+xml,%3Csvg/%3E">
        <button>Subscribe</button><section aria-label="Secondary action"><button>Subscribe</button></section>
        <button aria-label="Remove alternate">Remove</button>
      </aside>
    </main>`)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = (server.address() as { port: number }).port
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
  await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
  await mkdir(join(root, 'e2e'))
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  await writeFile(
    join(root, 'playwright.config.mjs'),
    `export default {testDir:'./e2e',workers:1,retries:0,timeout:5000,expect:{timeout:300},use:{baseURL:'http://127.0.0.1:${port}',actionTimeout:300}}`,
  )
  const files = [
    [
      'contract.spec.ts',
      `test.beforeEach(async({page})=>{await page.goto('/')});
test('configured page size',async({page})=>{expect(await page.locator('main > ul > li').count()).toBeLessThanOrEqual(7)});
test('configured fallback asset',async({page})=>{expect(await page.getByAltText('Operator',{exact:true}).getAttribute('src')).toContain('/operator.svg')});
test('unique action in the contracted region',async({page})=>{await expect(page.locator('main > button').filter({hasText:'Subscribe'})).toBeVisible()});
test('contracted element receives the action',async({page})=>{await page.locator('main > span[role="button"] > i').click();await expect(page.locator('output')).toHaveText('Removed')});`,
    ],
    [
      'alternate.spec.ts',
      `test('app choices are governed by its own assertions',async({page})=>{
await page.goto('/');const region=page.getByRole('complementary',{name:'Alternate design'});
await expect(region.getByRole('listitem')).toHaveCount(2);
await expect(region.getByAltText('Custom operator')).toHaveAttribute('src',/^data:image/);
await expect(region.getByRole('region',{name:'Secondary action'}).getByRole('button',{name:'Subscribe'})).toBeVisible();
await expect(region.getByRole('button',{name:'Remove alternate'})).toBeVisible();
});`,
    ],
  ]
  specs = await Promise.all(
    files.map(async ([name, body]) => {
      const content = "import {test,expect} from '@playwright/test';\n" + body
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
  backend = createLocalBackend(root)
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await rm(root, { recursive: true, force: true })
})

it('reports numeric, asset, duplicate and element-contract failures from the real runner', async () => {
  broken = true
  const result = await runPlaywrightFeedback(
    backend,
    specs[0],
    ['/equipment/src/Directory.tsx'],
    1,
    {
      command: (flags) => `${specs[0].command} ${flags.join(' ')}`,
    },
  )
  expect(result.status).toBe('failed')
  expect(result.nativeStats).toMatchObject({ expected: 0, unexpected: 4 })
  expect(result.failures).toHaveLength(4)
  expect(result.failures.map((failure) => failure.error).join('\n')).toContain('Received:    9')
  expect(result.failures.map((failure) => failure.error).join('\n')).toContain('/operator.svg')
  expect(result.failures.map((failure) => failure.error).join('\n')).toContain(
    'strict mode violation',
  )
  expect(result.failures.map((failure) => failure.locator).join('\n')).toContain(
    'span[role="button"]',
  )
  expect(result.failures.every((failure) => failure.line > 0)).toBe(true)
  expect(
    result.failures.every((failure) => failure.sourceFiles[0] === '/equipment/src/Directory.tsx'),
  ).toBe(true)
}, 25_000)

it('resumes an unvisited native file after repairing known failures and accepts alternate app designs silently', async () => {
  broken = true
  const results: PlaywrightFeedbackResult[] = []
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs }),
    run: (spec, files, revision, emit, signal, mode) =>
      runPlaywrightFeedback(backend, spec, files, revision, {
        command: (flags) => `${spec.command} ${flags.join(' ')}`,
        emit,
        signal,
        foreground: mode === 'foreground',
      }),
    onResult: (result) => results.push(result),
  })
  try {
    expect((await controller.check()).map((result) => result.status)).toEqual(['failed'])
    results.length = 0
    broken = false
    controller.changed(['/equipment/src/Directory.tsx'])
    const release = await controller.pause()
    try {
      expect((await controller.check({ failedOnly: true })).map((result) => result.status)).toEqual(
        ['passed'],
      )
    } finally {
      release()
    }
    await controller.settled()
    expect(results.map((result) => result.status)).toEqual(['passed', 'passed'])
    expect(results.map((result) => result.nativeStats?.expected)).toEqual([4, 1])
    expect(controller.takeFailures()).toEqual([])
  } finally {
    await controller.close()
  }
}, 30_000)
