/**
 * The test app's client hooks. Kit passes an error a component throws to `handleError` and
 * gives a `<svelte:boundary>` only what it returns, so the original error is recorded here for
 * the case that reads it (`binding-router.test.ts`). The answer is kit's default.
 *
 * @module
 */

import type { HandleClientError } from '@sveltejs/kit/hooks'

import { bindingProbe } from './lib/binding-probe.js'

/**
 * Records the error and answers as kit does without the hook.
 *
 * @param input - Kit's error input.
 * @param input.error - What was thrown.
 * @returns Kit's default `App.Error`.
 */
export const handleError: HandleClientError = ({ error }) => {
  bindingProbe().clientError = error
  return { message: 'Internal Error' }
}
