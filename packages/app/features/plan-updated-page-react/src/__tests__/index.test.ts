import { describe, expect, it } from 'vitest'

import { PlanUpdated } from '../index.js'

describe('@molecule/app-plan-updated-page-react', () => {
  it('exports a PlanUpdated component', () => {
    expect(typeof PlanUpdated).toBe('function')
    expect(PlanUpdated.name).toBe('PlanUpdated')
  })
})
