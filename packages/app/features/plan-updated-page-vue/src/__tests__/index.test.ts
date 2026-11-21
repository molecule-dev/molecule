/**
 * Unit tests for `@molecule/app-plan-updated-page-vue` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/index.test.ts`: the
 * same export-surface assertions for the Vue package.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { PlanUpdated } from '../index.js'

describe('@molecule/app-plan-updated-page-vue', () => {
  it('exports a PlanUpdated component', () => {
    // Vue's `defineComponent` returns the options object under test.
    expect(typeof PlanUpdated).toBe('object')
    expect((PlanUpdated as { name?: string }).name).toBe('PlanUpdated')
  })
})
