/**
 * The Playwright runner settings every scaffolded app shares, so a change
 * here reaches every app's `playwright.config.ts` instead of none of them.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import type { PlaywrightTestConfig } from '@playwright/test'

import { isMoleculeSandbox, resolveE2EProviderName } from './provider.js'

/** One dev server Playwright starts before the specs (an entry of `webServer`). */
export type E2EDevServer = Extract<
  NonNullable<PlaywrightTestConfig['webServer']>,
  readonly unknown[]
>[number]

/** The runner fields {@link e2eRunnerDefaults} decides. */
export type E2ERunnerDefaults = Required<
  Pick<PlaywrightTestConfig, 'workers' | 'fullyParallel' | 'retries' | 'maxFailures' | 'timeout'>
> & { webServer?: E2EDevServer[] }

/** How long Playwright waits for a dev server it started to answer, in ms. */
export const DEV_SERVER_TIMEOUT_MS = 120_000

/** The `scripts` of `<dir>/package.json`, or null when there is none. */
const scriptsIn = (dir: string): Record<string, string> | null => {
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    return manifest.scripts ?? null
  } catch (_error) {
    return null // no readable package.json here: nothing to start
  }
}

/**
 * The dev servers the specs run against, for Playwright to start when nothing answers yet and to
 * reuse when one already does: the API beside the app (`../api`, `npm run dev`, ready at
 * `/health` on `PORT`, default 4000, where the app's dev server proxies `/api`) and this app
 * (`npm run dev`, Vite on `VITE_PORT`, default 3000).
 *
 * None over the preview provider (the page comes from the IDE tab), inside a molecule sandbox
 * (its platform already runs the dev server on 5173), or when `APP_BASE` points the specs at a
 * server of your own; no API when `VITE_API_URL` names a remote one.
 *
 * @param appDir - The app's directory (default: where Playwright runs, the config's directory).
 * @returns The `webServer` entries, possibly none.
 */
export const e2eDevServers = (appDir: string = process.cwd()): E2EDevServer[] => {
  if (resolveE2EProviderName() === 'preview' || isMoleculeSandbox()) return []
  if (process.env['APP_BASE']?.trim()) return []
  if (!scriptsIn(appDir)?.['dev']) return []
  const apiDir = join(appDir, '..', 'api')
  const api: E2EDevServer[] =
    scriptsIn(apiDir)?.['dev'] && !process.env['VITE_API_URL']?.trim()
      ? [
          {
            command: 'npm run dev',
            cwd: apiDir,
            url: `http://localhost:${process.env['PORT'] || 4000}/health`,
            reuseExistingServer: true,
            timeout: DEV_SERVER_TIMEOUT_MS,
          },
        ]
      : []
  return [
    ...api,
    {
      command: 'npm run dev',
      cwd: appDir,
      url: `http://localhost:${process.env['VITE_PORT'] || 3000}`,
      reuseExistingServer: true,
      timeout: DEV_SERVER_TIMEOUT_MS,
    },
  ]
}

/** Per-test timeout inside a molecule sandbox, in ms. */
export const SANDBOX_TEST_TIMEOUT_MS = 30_000

/** Per-test timeout everywhere else (your machine, CI), in ms. */
export const DEFAULT_TEST_TIMEOUT_MS = 60_000

/**
 * Workers inside a sandbox with a real browser. `'50%'` of a 2-vCPU sandbox is ONE
 * worker, so a 139-test suite runs one test at a time (4.5 minutes per full run);
 * a browser test mostly waits on the app, so two keep both cores busy.
 */
export const SANDBOX_WORKERS = 2

/** Inside a sandbox, the run stops after this many failed tests. */
export const SANDBOX_MAX_FAILURES = 8

/**
 * The runner settings for THIS environment — spread them FIRST into
 * `defineConfig({ ...e2eRunnerDefaults(), … })`, so any field the app sets
 * after the spread wins.
 *
 * - Over the preview provider (`resolveE2EProviderName() === 'preview'`):
 *   one worker, not fully parallel — there is one page to drive.
 * - On a real browser: `'50%'` workers, fully parallel ({@link SANDBOX_WORKERS} inside a
 *   molecule sandbox, where half the cores is one).
 * - Inside a molecule sandbox (`isMoleculeSandbox()`): 0 retries, stop after
 *   {@link SANDBOX_MAX_FAILURES} failures, {@link SANDBOX_TEST_TIMEOUT_MS}
 *   per test.
 * - Elsewhere: 2 retries under CI (`process.env.CI`), 1 otherwise; no
 *   failure cap; {@link DEFAULT_TEST_TIMEOUT_MS} per test.
 * - `webServer`: the dev servers {@link e2eDevServers} names, when there are any, so
 *   `playwright test` starts the app (and its API) itself instead of failing on a
 *   server nobody started.
 */
export const e2eRunnerDefaults = (): E2ERunnerDefaults => {
  const preview = resolveE2EProviderName() === 'preview'
  const sandbox = isMoleculeSandbox()
  const ci = Boolean(process.env['CI']?.trim())
  const webServer = e2eDevServers()
  return {
    workers: preview ? 1 : sandbox ? SANDBOX_WORKERS : '50%',
    fullyParallel: !preview,
    retries: sandbox ? 0 : ci ? 2 : 1,
    maxFailures: sandbox ? SANDBOX_MAX_FAILURES : 0,
    timeout: sandbox ? SANDBOX_TEST_TIMEOUT_MS : DEFAULT_TEST_TIMEOUT_MS,
    ...(webServer.length > 0 ? { webServer } : {}),
  }
}
