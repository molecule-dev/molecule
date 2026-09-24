/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the spec is written to disk verbatim
 * (only its `@molecule/*` specifiers are pointed at the built workspace
 * packages, since the temp dir has no `node_modules`) and run by the REAL
 * `@playwright/test` runner in headless Chromium against a local HTTP server
 * serving `/blog/hello/`.
 *
 * Requires the package to be built (`npm run build`) and a Playwright Chromium.
 *
 * @module
 */

import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import { beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const distPath = join(packageRoot, 'dist/index.js')

/**
 * Resolves a workspace package's built ESM entry from this package.
 *
 * @param name - The `@molecule/*` package name.
 * @returns The absolute path of its `dist/index.js`.
 */
function resolveWorkspacePackage(name: string): string {
  const dir = join(packageRoot, 'node_modules', name)
  const candidate = existsSync(dir) ? dir : join(packageRoot, '../../../../node_modules', name)
  return join(candidate, 'dist/index.js')
}

/** The README example, verbatim. */
const EXAMPLE = `
import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { provider as playwright } from '@molecule/app-e2e-playwright'
import { provider as preview } from '@molecule/app-e2e-preview'

// The scaffolded e2e/bonds.ts does exactly this; specs then \`import './bonds.js'\`.
setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)

test('the phone layout keeps the prose large', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog/hello/') // resolved against \`use.baseURL\` in playwright.config.ts
  const prose = page.locator('article p').first()
  const size = await prose.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(size).toBeGreaterThanOrEqual(18)
  await expect(page.getByRole('switch', { name: /summar/i })).toBeVisible()
})
`

/**
 * The installed Playwright Chromium, falling back to any Chromium under
 * `PLAYWRIGHT_BROWSERS_PATH` when the exact revision this Playwright expects
 * is not downloaded (an environment gap, not something the example controls).
 *
 * @returns An executable path, or `undefined` to let Playwright pick.
 */
function chromiumExecutable(): string | undefined {
  if (existsSync(chromium.executablePath())) return undefined
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'
  if (!existsSync(root)) return undefined
  for (const entry of readdirSync(root)) {
    const candidate = join(root, entry, 'chrome-linux', 'chrome')
    if (entry.startsWith('chromium-') && existsSync(candidate)) return candidate
  }
  return undefined
}

interface ReportSpec {
  title: string
  tests: Array<{ results: Array<{ status: string; error?: { message?: string } }> }>
}

interface ReportSuite {
  suites?: ReportSuite[]
  specs?: ReportSpec[]
}

/**
 * Flattens the Playwright JSON report into title → status/message.
 *
 * @param suite - A report suite.
 * @param out - Accumulator.
 */
function collect(suite: ReportSuite, out: Map<string, { status: string; message: string }>): void {
  for (const spec of suite.specs ?? []) {
    const run = spec.tests[0]?.results[0]
    out.set(spec.title, { status: run?.status ?? 'missing', message: run?.error?.message ?? '' })
  }
  for (const child of suite.suites ?? []) collect(child, out)
}

/**
 * Runs the example against a server whose page has the given prose font size.
 *
 * @param proseSize - CSS font size of the article's first paragraph.
 * @returns The spec's result and the paths the server was asked for.
 */
async function runExample(
  proseSize: string,
): Promise<{ status: string; message: string; requested: string[] }> {
  const requested: string[] = []
  const server: Server = createServer((req, res) => {
    requested.push(req.url ?? '')
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>` +
        `<article><h1>Hello</h1><p style="font-size:${proseSize}">Readable prose.</p></article>` +
        `<button role="switch" aria-checked="false">Summarize</button></body></html>`,
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const workDir = mkdtempSync(join(tmpdir(), 'e2e-fixtures-readme-'))
  try {
    let spec = EXAMPLE.replace("'@molecule/app-e2e-fixtures-default'", JSON.stringify(distPath))
    for (const name of [
      '@molecule/app-e2e',
      '@molecule/app-e2e-playwright',
      '@molecule/app-e2e-preview',
    ]) {
      spec = spec.replace(`'${name}'`, JSON.stringify(resolveWorkspacePackage(name)))
    }
    // ESM, like a scaffolded app (`"type": "module"`).
    writeFileSync(join(workDir, 'package.json'), '{ "type": "module" }\n')
    writeFileSync(join(workDir, 'post.spec.ts'), spec)
    const executablePath = chromiumExecutable()
    writeFileSync(
      join(workDir, 'playwright.config.mjs'),
      `export default ${JSON.stringify({
        testDir: '.',
        outputDir: 'pw-output',
        workers: 1,
        timeout: 20000,
        reporter: [['json', { outputFile: 'results.json' }]],
        use: {
          baseURL: `http://127.0.0.1:${port}`,
          browserName: 'chromium',
          headless: true,
          ...(executablePath ? { launchOptions: { executablePath } } : {}),
        },
      })}\n`,
    )
    // Async: the HTTP server lives in THIS process, so a blocking spawn would starve it.
    const run = await new Promise<{ code: number | null; output: string }>((resolve) => {
      const child = execFile(
        process.execPath,
        [
          require.resolve('@playwright/test/cli'),
          'test',
          '--config',
          join(workDir, 'playwright.config.mjs'),
        ],
        {
          cwd: packageRoot,
          env: { ...process.env, FORCE_COLOR: '0', MOL_E2E_PROVIDER: 'playwright' },
          encoding: 'utf-8',
          timeout: 180_000,
        },
        (_error, stdout, stderr) => {
          // A failing spec exits non-zero; the JSON report below is what we assert on.
          resolve({ code: child.exitCode, output: `${stdout}\n${stderr}` })
        },
      )
    })
    const reportPath = join(workDir, 'results.json')
    if (!existsSync(reportPath)) {
      throw new Error(`Playwright produced no report (exit ${run.code}).\n${run.output}`)
    }
    const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as { suites: ReportSuite[] }
    const results = new Map<string, { status: string; message: string }>()
    for (const suite of report.suites) collect(suite, results)
    const result = results.get('the phone layout keeps the prose large') ?? {
      status: 'missing',
      message: '',
    }
    return { ...result, requested }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe('README @example', () => {
  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error(`Built output not found at ${distPath} — run \`npm run build\` first.`)
    }
  })

  it('passes against a page whose prose is 20px and whose summary switch is visible', async () => {
    const result = await runExample('20px')
    expect(result.message).toBe('')
    expect(result.status).toBe('passed')
    expect(result.requested).toContain('/blog/hello/')
  }, 240_000)

  it('fails when the prose is smaller than 18px', async () => {
    const result = await runExample('14px')
    expect(result.status).toBe('failed')
    expect(result.message).toContain('toBeGreaterThanOrEqual')
  }, 240_000)
})
