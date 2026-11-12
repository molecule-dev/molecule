import { once } from 'node:events'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { runPlaywrightFeedback } from '../playwright-feedback.js'
import { nativeFeedbackFailures } from '../playwright-feedback-reporter.js'
import { shellQuote } from '../utilities.js'

it('reports a native browser loop timeout even when it has no locator', async () => {
  const root = await mkdtemp(join(tmpdir(), 'feedback-loop-'))
  const server = createServer((_req, res) => res.end('<main><p>Pending inventory</p></main>'))
  try {
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const port = (server.address() as { port: number }).port
    const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
    await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(
      join(root, 'playwright.config.mjs'),
      `export default {testDir:'.',timeout:800,use:{baseURL:'http://127.0.0.1:${port}'}}`,
    )
    const path = join(root, 'inventory.spec.ts')
    const content = `import {test} from '@playwright/test';
test('inventory settles', async ({page}) => {
  await page.goto('/inventory');
  while (true) await page.waitForTimeout(50);
});`
    await writeFile(path, content)
    const command = `node ${shellQuote(cli)} test --config playwright.config.mjs inventory.spec.ts`
    const result = await runPlaywrightFeedback(
      createLocalBackend(root),
      { path, content, command, cwd: root },
      [join(root, 'src/Inventory.tsx')],
      1,
      { command: (flags) => `${command} ${flags.join(' ')}`, scratchRoot: join(root, 'feedback') },
    )
    expect(result.status).toBe('failed')
    expect(result.nativeStats).toMatchObject({ expected: 0, unexpected: 1, skipped: 0 })
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatchObject({
      spec: path,
      line: 4,
      locator: 'page.waitForTimeout',
    })
    expect(result.failures[0].rendered).toContain('Pending inventory')
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(root, { recursive: true, force: true })
  }
}, 20_000)

it('preserves an ordinary browser-close failure as the native error', () => {
  const event =
    JSON.stringify({
      spec: 'inventory.spec.ts',
      line: 10,
      error: 'Error: page.waitForTimeout: Target page, context or browser has been closed',
      rendered: '- generic: Inventory',
    }) + '\n'
  expect(nativeFeedbackFailures(event, [])).toMatchObject([
    {
      error: 'Error: page.waitForTimeout: Target page, context or browser has been closed',
      locator: 'Error: page.waitForTimeout: Target page, context or browser has been closed',
    },
  ])
})

it('preserves native failed-test errors without a UI diagnosis', () => {
  for (const error of [
    'Test timeout of 800ms exceeded.',
    'beforeAll hook timeout of 800ms exceeded.',
    'Error: browserType.launch: browser executable missing',
  ]) {
    const event = JSON.stringify({ spec: 'inventory.spec.ts', line: 10, error }) + '\n'
    expect(nativeFeedbackFailures(event, [])).toMatchObject([{ error, locator: error }])
  }
})
