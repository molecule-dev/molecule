// @vitest-environment jsdom
/**
 * Unit test for the Vue `SafeLink` — a port of
 * `@molecule/app-safe-link-react/src/__tests__/index.test.ts`: the same test
 * name and the same export assertions, on the value Vue's `defineComponent`
 * produces (a component options object with `name`, rather than React's
 * component function).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { SafeLink } from '../index.js'

describe('@molecule/app-safe-link-vue', () => {
  it('exports SafeLink component', () => {
    expect(typeof SafeLink).toBe('object')
    expect(SafeLink.name).toBe('SafeLink')
  })
})
