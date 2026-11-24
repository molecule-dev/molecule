/**
 * Vitest setup for Vue component tests. A Molecule app's vite config (`createFrameworkViteConfig`
 * from `@molecule/app-vite-config-default/framework`) runs it already: this package's package.json
 * names it in `molecule.vitestSetupFiles`. Any other vitest config lists it in `setupFiles`:
 *
 * ```ts
 * export default defineConfig({
 *   test: { setupFiles: ['@molecule/app-vue/testing/setup'] },
 * })
 * ```
 *
 * In a test file with a DOM (jsdom, happy-dom), it installs the event timing of
 * `./event-timing.ts`: a test's events land after the render they follow, the way a user's do,
 * so a Vue listener mounted with the element the event starts on is never skipped in one run and
 * not the next. An event the page fires itself into a listener attached in the same task, which
 * a browser can skip too, fails the test with the element and listener named. A file without a
 * DOM is left alone.
 *
 * @module
 */

import { afterEach } from 'vitest'

import { installEventTiming } from './event-timing.js'

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const timing = installEventTiming()
  afterEach(() => {
    const problems = timing.takeProblems()
    if (problems.length) throw new Error(problems.join('\n\n'))
  })
}
