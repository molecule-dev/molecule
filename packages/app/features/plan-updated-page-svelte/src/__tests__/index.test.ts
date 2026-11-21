// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-plan-updated-page-svelte` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/index.test.ts`: the
 * same export-surface assertions for the Svelte package.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it } from 'vitest'

import { PlanUpdated } from '../index.js'

describe('@molecule/app-plan-updated-page-svelte', () => {
  it('exports a PlanUpdated component', () => {
    expect(typeof PlanUpdated).toBe('function')
    expect(PlanUpdated).toBeTruthy()
  })
})
