/**
 * The Playwright runner settings every scaffolded app shares, so a change
 * here reaches every app's `playwright.config.ts` instead of none of them.
 *
 * @module
 */

import process from 'node:process'

import type { PlaywrightTestConfig } from '@playwright/test'

import { isMoleculeSandbox, resolveE2EProviderName } from './provider.js'

/** The runner fields {@link e2eRunnerDefaults} decides. */
export type E2ERunnerDefaults = Required<
  Pick<PlaywrightTestConfig, 'workers' | 'fullyParallel' | 'retries' | 'maxFailures' | 'timeout'>
>

/** Per-test timeout inside a molecule sandbox, in ms. */
export const SANDBOX_TEST_TIMEOUT_MS = 30_000

/** Per-test timeout everywhere else (your machine, CI), in ms. */
export const DEFAULT_TEST_TIMEOUT_MS = 60_000

/** Inside a sandbox, the run stops after this many failed tests. */
export const SANDBOX_MAX_FAILURES = 8

/**
 * The runner settings for THIS environment — spread them FIRST into
 * `defineConfig({ ...e2eRunnerDefaults(), … })`, so any field the app sets
 * after the spread wins.
 *
 * - Over the preview provider (`resolveE2EProviderName() === 'preview'`):
 *   one worker, not fully parallel — there is one page to drive.
 * - On a real browser: `'50%'` workers, fully parallel.
 * - Inside a molecule sandbox (`isMoleculeSandbox()`): 0 retries, stop after
 *   {@link SANDBOX_MAX_FAILURES} failures, {@link SANDBOX_TEST_TIMEOUT_MS}
 *   per test.
 * - Elsewhere: 2 retries under CI (`process.env.CI`), 1 otherwise; no
 *   failure cap; {@link DEFAULT_TEST_TIMEOUT_MS} per test.
 */
export const e2eRunnerDefaults = (): E2ERunnerDefaults => {
  const preview = resolveE2EProviderName() === 'preview'
  const sandbox = isMoleculeSandbox()
  const ci = Boolean(process.env['CI']?.trim())
  return {
    workers: preview ? 1 : '50%',
    fullyParallel: !preview,
    retries: sandbox ? 0 : ci ? 2 : 1,
    maxFailures: sandbox ? SANDBOX_MAX_FAILURES : 0,
    timeout: sandbox ? SANDBOX_TEST_TIMEOUT_MS : DEFAULT_TEST_TIMEOUT_MS,
  }
}
