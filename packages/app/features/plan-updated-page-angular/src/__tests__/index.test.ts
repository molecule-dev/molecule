// The barrel pulls in Angular components whose decorators need the JIT
// compiler at module-evaluation time.
import '@angular/compiler'
/**
 * Unit tests for `@molecule/app-plan-updated-page-angular` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/index.test.ts`: the
 * same export-surface assertions for the Angular package.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { PlanUpdated } from '../index.js'

describe('@molecule/app-plan-updated-page-angular', () => {
  it('exports a PlanUpdated component', () => {
    expect(typeof PlanUpdated).toBe('function')
    expect(PlanUpdated.name).toBe('PlanUpdated')
  })
})
