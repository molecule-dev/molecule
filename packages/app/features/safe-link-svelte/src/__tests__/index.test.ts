import { describe, expect, it } from 'vitest'

import { SafeLink } from '../components.js'

describe('@molecule/app-safe-link-svelte', () => {
  it('exports SafeLink component', () => {
    expect(typeof SafeLink).toBe('function')
    expect(SafeLink.name).toBe('SafeLink')
  })
})
