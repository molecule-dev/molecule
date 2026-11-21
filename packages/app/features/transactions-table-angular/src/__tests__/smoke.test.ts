// @vitest-environment jsdom
// The component imports `@angular/common` (`NgTemplateOutlet`), whose partially
// compiled injectables need the JIT compiler at import time.
import '@angular/compiler'
import { describe, expect, it } from 'vitest'

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
