import { describe, expect, it } from 'vitest'

import { SafeLink } from '../index.js'

describe('@molecule/app-safe-link-react', () => {
  it('exports SafeLink component', () => {
    expect(typeof SafeLink).toBe('function')
    expect(SafeLink.name).toBe('SafeLink')
  })
})
