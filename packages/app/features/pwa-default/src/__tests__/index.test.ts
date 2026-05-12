import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }))

import { registerPWA } from '../index.js'

describe('@molecule/app-pwa-default', () => {
  it('exports a registerPWA function', () => {
    expect(typeof registerPWA).toBe('function')
    expect(registerPWA.name).toBe('registerPWA')
  })

  it('is a noop in non-browser environments (no window)', () => {
    expect(() => registerPWA()).not.toThrow()
  })
})
