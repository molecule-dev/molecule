import { describe, expect, it, vi } from 'vitest'

import { foregroundBrowserProbe, foregroundServerCommand } from '../index.js'

/** The m257 probe's one binding, enough for the command-level reader. */
const LEAKY =
  "import { chromium } from '@playwright/test'\n" +
  'const browser = await chromium.launch()\n' +
  'const page = await browser.newPage()\n' +
  'console.log(await page.title())\n'

describe('foregroundBrowserProbe', () => {
  it('reads the m257 command verbatim and names the file and binding', async () => {
    // The run's own command: a direct `node <script>` statement, piped through `tail -5`.
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    const probe = await foregroundBrowserProbe(
      'cd /workspace/my-app/app && node /workspace/.mol-scratch/fav-probe.mjs 2>&1 | tail -5',
      readScript,
    )
    expect(probe).toEqual({
      variable: 'browser',
      script: '/workspace/.mol-scratch/fav-probe.mjs',
    })
    expect(readScript).toHaveBeenCalledWith('/workspace/.mol-scratch/fav-probe.mjs')
  })

  it('reads a tsx/ts-node script the same way', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    const probe = await foregroundBrowserProbe(
      'npx tsx --env-file=.env /tmp/probe.ts 2>&1 | tail -15',
      readScript,
    )
    expect(probe?.script).toBe('/tmp/probe.ts')
  })

  it('leaves a backgrounded launch alone', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(
      await foregroundBrowserProbe('node /workspace/.mol-scratch/fav-probe.mjs &', readScript),
    ).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('leaves a Playwright test runner alone (the fixture owns the browser)', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(
      await foregroundBrowserProbe('npx playwright test e2e/favorites.spec.ts', readScript),
    ).toBeNull()
    expect(
      await foregroundBrowserProbe('node node_modules/.bin/playwright test', readScript),
    ).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('leaves a test/fixture file alone even when node runs it directly', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(await foregroundBrowserProbe('node e2e/favorites.spec.ts', readScript)).toBeNull()
    expect(await foregroundBrowserProbe('npx tsx e2e/__tests__/fixture.ts', readScript)).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('never refuses a script the backend cannot read', async () => {
    const readScript = vi.fn().mockRejectedValue(new Error('ENOENT'))
    expect(
      await foregroundBrowserProbe('node /workspace/.mol-scratch/fav-probe.mjs', readScript),
    ).toBeNull()
  })

  it('leaves a clean script and a server script alone', async () => {
    const clean = vi.fn().mockResolvedValue("console.log('done')\n")
    expect(await foregroundBrowserProbe('node /tmp/check.mjs', clean)).toBeNull()
    const server = vi.fn().mockResolvedValue("const { create } = await import('./server')\n")
    expect(await foregroundBrowserProbe('node /tmp/server-probe.mjs', server)).toBeNull()
  })

  it('keeps the server preflight unchanged (a server script is still a server, not a browser probe)', async () => {
    const readScript = vi
      .fn()
      .mockResolvedValue(
        "const { create } = await import('/workspace/my-app/api/src/server.ts')\n" +
          'const inst = await create(0)\n' +
          'console.log(JSON.stringify(inst.address()))\n',
      )
    expect(
      await foregroundServerCommand('npx tsx /tmp/probe.mts 2>&1 | tail -15', readScript),
    ).toEqual({ program: 'tsx /tmp/probe.mts' })
    expect(await foregroundBrowserProbe('npx tsx /tmp/probe.mts', readScript)).toBeNull()
  })
})
