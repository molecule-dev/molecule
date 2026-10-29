/**
 * A genuine Playwright run, for the tests that read its standard machine report.
 *
 * Nothing here is synthesised: each call writes a tiny spec into a fresh temp directory, runs the
 * workspace's INSTALLED Playwright exactly as the tool does (`--reporter=list,json` with
 * `PLAYWRIGHT_JSON_OUTPUT_FILE` set), and hands back the report the runner wrote. The specs request
 * no `page`/`browser` fixture, so no browser binary and no app are needed — the runner's own test
 * bookkeeping is the whole subject.
 *
 * The install is discovered by walking up from this file for a `node_modules` that holds BOTH
 * `@playwright/test` and its CLI, and the spec requires that exact copy by absolute path: the
 * runner and the library are then one version, which is the mistake that makes a mixed tree report
 * "You have two different versions of `@playwright/test`". `MOL_PLAYWRIGHT_CLI` overrides the
 * search when a workspace keeps them elsewhere.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The workspace's installed Playwright: its CLI and the `@playwright/test` that CLI runs. */
export interface InstalledPlaywright {
  /** The `node_modules/.bin/playwright` program. */
  cli: string
  /** The `@playwright/test` entry the generated spec requires, by absolute path. */
  testPackage: string
}

/** This file's directory, the start of the upward search. */
const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The installed Playwright this workspace has, or null when there is none.
 *
 * @returns The CLI and its matching test package, or null.
 */
export function installedPlaywright(): InstalledPlaywright | null {
  const override = process.env.MOL_PLAYWRIGHT_CLI
  if (override) {
    const root = dirname(dirname(override))
    const testPackage = join(root, '@playwright', 'test', 'index.js')
    if (existsSync(override) && existsSync(testPackage)) return { cli: override, testPackage }
  }
  let dir = HERE
  for (let depth = 0; depth < 12; depth += 1) {
    const root = join(dir, 'node_modules')
    const cli = join(root, '.bin', 'playwright')
    const testPackage = join(root, '@playwright', 'test', 'index.js')
    if (existsSync(cli) && existsSync(testPackage)) return { cli, testPackage }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/** One genuine run's outcome. */
export interface GenuineRun {
  /** The report file's text, exactly as Playwright wrote it. */
  report: string
  /** The report file's path. */
  reportPath: string
  /** The temp directory the run happened in, removed by {@link GenuineRun.cleanup}. */
  dir: string
  /** What the runner printed. */
  stdout: string
  /** The runner's exit code. */
  exitCode: number
  /** Remove the temp directory (the report and every attachment the runner saved). */
  cleanup: () => void
}

/**
 * Run one tiny spec through the installed Playwright and return its standard report.
 *
 * @param spec - The spec source, AFTER the `@playwright/test` import this helper writes.
 * @param options - Run settings the report's shape depends on.
 * @param options.retries - `--retries` for the run (a retry is what makes a test's record carry two
 *   attempts).
 * @returns The run's report and output, or null when Playwright is not installed.
 */
export function runTinyPlaywright(
  spec: string,
  options: { retries?: number } = {},
): GenuineRun | null {
  const playwright = installedPlaywright()
  if (playwright === null) return null
  // The native runner redirects tmpdir() into the workspace. An external directory keeps an
  // ancestor Playwright config from giving concurrent genuine runs one shared output directory.
  const dir = mkdtempSync('/tmp/mol-pw-report-')
  writeFileSync(
    join(dir, 'tiny.spec.js'),
    `const { test, expect } = require(${JSON.stringify(playwright.testPackage)})\n\n${spec}\n`,
    'utf8',
  )
  const reportPath = join(dir, 'report.json')
  let outcome: { stdout: string; exitCode: number }
  try {
    outcome = {
      stdout: execFileSync(
        playwright.cli,
        [
          'test',
          'tiny.spec.js',
          '--reporter=list,json',
          `--retries=${options.retries ?? 0}`,
          '--workers=1',
        ],
        {
          cwd: dir,
          env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath },
          encoding: 'utf8',
          timeout: 120_000,
          stdio: 'pipe',
        },
      ),
      exitCode: 0,
    }
  } catch (error) {
    // A failing run is the subject of half of these tests: its output and status ARE the result.
    const failure = error as { stdout?: string; stderr?: string; status?: number }
    outcome = {
      stdout: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
      exitCode: typeof failure.status === 'number' ? failure.status : 1,
    }
  }
  return {
    report: readFileSync(reportPath, 'utf8'),
    reportPath,
    dir,
    stdout: outcome.stdout,
    exitCode: outcome.exitCode,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}
