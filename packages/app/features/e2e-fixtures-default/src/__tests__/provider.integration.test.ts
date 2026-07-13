/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual `@playwright/test`
 * runner driving real headless Chromium against this package's built `test`
 * fixture. A generated spec file exercises the console guard exactly the way a
 * fleet app's e2e suite consumes it, and we assert on the runner's JSON report.
 *
 * What this pins:
 * - CONSUMER EXPERIENCE: a spec that triggers `console.error` / `pageerror`
 *   FAILS (the whole reason this package exists — a blank React mount must not
 *   pass green), while a clean spec and known dev noise (`[vite] connecting…`)
 *   pass untouched.
 * - FAILURE DISAMBIGUATION: the failure message labels the source
 *   (`[console.error]` vs `[pageerror]`), quotes the error text, and carries
 *   the `allow-console-error` remediation — so the executor can tell "my app
 *   throws in the browser" apart from "the harness is broken", and knows the
 *   escape hatch.
 * - The `allow-console-error` annotation works both as a regex AND as literal
 *   error text containing regex-invalid characters (`[`), which previously
 *   threw from inside the guard itself.
 *
 * Requires the package to be built (`npm run build`) and Playwright's Chromium
 * to be installed — both true in the molecule workspace and in scaffolded
 * projects that run e2e at all.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const distPath = fileURLToPath(new URL('../../dist/index.js', import.meta.url))

interface SpecResult {
  status: string
  message: string
}

/** title → result, flattened from the Playwright JSON report. */
const results = new Map<string, SpecResult>()

let workDir: string

/** Recursively collect spec results from the JSON report's suite tree. */
function collectSpecs(suite: {
  suites?: unknown[]
  specs?: Array<{
    title: string
    tests: Array<{ results: Array<{ status: string; error?: { message?: string } }> }>
  }>
}): void {
  for (const spec of suite.specs ?? []) {
    const run = spec.tests[0]?.results[0]
    results.set(spec.title, {
      status: run?.status ?? 'missing',
      message: run?.error?.message ?? '',
    })
  }
  for (const child of suite.suites ?? []) {
    collectSpecs(child as Parameters<typeof collectSpecs>[0])
  }
}

const SPEC = `
import { test, expect } from '${distPath}'

test('clean page passes', async ({ page }) => {
  await page.setContent('<h1>ok</h1>')
  await expect(page.locator('h1')).toHaveText('ok')
})

test('console.error fails the test', async ({ page }) => {
  const seen = page.waitForEvent('console')
  await page.setContent('<script>console.error("mock console failure")</script><h1>ok</h1>')
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('pageerror fails the test', async ({ page }) => {
  const seen = page.waitForEvent('pageerror')
  await page.setContent('<script>throw new Error("kaboom on mount")</script><h1>ok</h1>')
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('allow-console-error with literal text containing regex-invalid chars', async ({ page }) => {
  // "boom [unclosed" is NOT a valid regex — the guard must fall back to
  // substring matching instead of throwing from inside its own teardown.
  test.info().annotations.push({ type: 'allow-console-error', description: 'boom [unclosed' })
  const seen = page.waitForEvent('console')
  await page.setContent('<script>console.error("boom [unclosed bracket in error")</script><h1>ok</h1>')
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('allow-console-error with a regex pattern', async ({ page }) => {
  test.info().annotations.push({ type: 'allow-console-error', description: 'expected \\\\d+ widgets' })
  const seen = page.waitForEvent('console')
  await page.setContent('<script>console.error("expected 42 widgets")</script><h1>ok</h1>')
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('vite dev-noise console errors are always ignored', async ({ page }) => {
  const seen = page.waitForEvent('console')
  await page.setContent('<script>console.error("[vite] connecting...")</script><h1>ok</h1>')
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('a real Chrome DevTools source-map failure for a third-party https CDN bundle is ignored', async ({ page }) => {
  // This is the REAL Chrome message text (verified against a live probe +
  // public reports, not guessed): "DevTools failed to load SourceMap: Could
  // not load content for <url>: ...". The old pattern required the word
  // "fetch" (real text says "load") AND a ".cdn." substring in the host —
  // js.stripe.com and maps.googleapis.com have neither, so it never matched.
  const seen = page.waitForEvent('console')
  await page.setContent(
    '<script>console.error("DevTools failed to load SourceMap: Could not load content for https://js.stripe.com/v3/m-outer-3437aa9c33b8d5a0.js.map: HTTP error: status code 404, net::ERR_HTTP_RESPONSE_CODE_FAILURE")</script><h1>ok</h1>',
  )
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})

test('a same-origin (http) DevTools source-map failure is NOT swallowed by the https-only scope', async ({ page }) => {
  // The broadened pattern intentionally requires https:// (third-party CDN
  // bundles are always TLS) so it can never accidentally silence a genuinely
  // broken source map in the app's OWN build, served over plain http from
  // the local dev/preview server.
  const seen = page.waitForEvent('console')
  await page.setContent(
    '<script>console.error("DevTools failed to load SourceMap: Could not load content for http://localhost:5173/assets/index-abc123.js.map: HTTP error: status code 404")</script><h1>ok</h1>',
  )
  await seen
  await expect(page.locator('h1')).toHaveText('ok')
})
`

const CONFIG = `
export default {
  testDir: '.',
  // Keep artifacts inside the temp dir — never write test-results/ into the
  // package (or wherever the spawning process's cwd happens to be).
  outputDir: 'pw-output',
  workers: 1,
  timeout: 20000,
  reporter: [['json', { outputFile: 'results.json' }]],
  use: { browserName: 'chromium', headless: true },
}
`

describe('@molecule/app-e2e-fixtures-default × REAL @playwright/test + Chromium', () => {
  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error(
        `Built output not found at ${distPath} — run \`npm run build\` in this package first.`,
      )
    }

    workDir = mkdtempSync(join(tmpdir(), 'e2e-fixtures-int-'))
    writeFileSync(join(workDir, 'playwright.config.mjs'), CONFIG)
    writeFileSync(join(workDir, 'guard.spec.mjs'), SPEC)

    const cli = require.resolve('@playwright/test/cli')
    const run = spawnSync(
      process.execPath,
      [cli, 'test', '--config', join(workDir, 'playwright.config.mjs')],
      {
        cwd: fileURLToPath(new URL('../..', import.meta.url)),
        env: { ...process.env, FORCE_COLOR: '0' },
        encoding: 'utf-8',
        timeout: 180_000,
      },
    )

    const reportPath = join(workDir, 'results.json')
    if (!existsSync(reportPath)) {
      throw new Error(
        `Playwright run produced no JSON report (exit ${run.status}).\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
      )
    }
    const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as { suites: unknown[] }
    for (const suite of report.suites) {
      collectSpecs(suite as Parameters<typeof collectSpecs>[0])
    }
  }, 240_000)

  afterAll(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true })
  })

  it('a clean spec passes — the guard adds no false positives', () => {
    expect(results.get('clean page passes')?.status).toBe('passed')
  })

  it('CONSUMER PROPERTY: a page console.error fails the spec instead of passing green', () => {
    const result = results.get('console.error fails the test')
    expect(result?.status).toBe('failed')
    expect(result?.message).toContain('Browser console error(s) during test')
  })

  it('FAILURE DISAMBIGUATION: the failure labels the source, quotes the text, and names the escape hatch', () => {
    const consoleFail = results.get('console.error fails the test')
    expect(consoleFail?.message).toContain('[console.error] mock console failure')
    // Remediation is part of the message — the executor is told exactly how to
    // intentionally allow an expected error rather than left guessing.
    expect(consoleFail?.message).toContain('allow-console-error')

    const pageFail = results.get('pageerror fails the test')
    expect(pageFail?.status).toBe('failed')
    expect(pageFail?.message).toContain('[pageerror] kaboom on mount')
    // The two failure sources carry distinct labels.
    expect(pageFail?.message).not.toContain('[console.error]')
  })

  it('CONSUMER PROPERTY: allow-console-error accepts verbatim error text with regex-invalid chars', () => {
    expect(
      results.get('allow-console-error with literal text containing regex-invalid chars'),
    ).toEqual({
      status: 'passed',
      message: '',
    })
  })

  it('allow-console-error accepts a regex pattern', () => {
    expect(results.get('allow-console-error with a regex pattern')?.status).toBe('passed')
  })

  it('CONSUMER PROPERTY: known dev noise ([vite] connecting…) never fails a spec', () => {
    expect(results.get('vite dev-noise console errors are always ignored')?.status).toBe('passed')
  })

  it('DOC-DRIFT FIX: a real DevTools source-map failure for a third-party https CDN host is ignored', () => {
    // Pre-fix, this exact real-world message would have FAILED the spec —
    // the ALWAYS_IGNORE pattern's comment claimed Stripe/Google Maps
    // coverage it did not actually provide (wrong verb + wrong host check).
    expect(
      results.get(
        'a real Chrome DevTools source-map failure for a third-party https CDN bundle is ignored',
      )?.status,
    ).toBe('passed')
  })

  it('the https-only scope still fails on a same-origin (http) source-map error, not just any source-map text', () => {
    const result = results.get(
      'a same-origin (http) DevTools source-map failure is NOT swallowed by the https-only scope',
    )
    expect(result?.status).toBe('failed')
    expect(result?.message).toContain('Browser console error(s) during test')
  })
})
