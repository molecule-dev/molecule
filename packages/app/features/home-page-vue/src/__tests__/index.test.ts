// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Home` — a port of
 * `@molecule/app-home-page-react/src/__tests__/index.test.ts`:
 * the same test name and the same export assertions, on the value Vue's
 * `defineComponent` produces (a component options object with `name`,
 * rather than React's component function).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { Home } from '../index.js'

describe('@molecule/app-home-page-vue', () => {
  it('exports a Home component', () => {
    expect(typeof Home).toBe('object')
    expect(Home.name).toBe('Home')
  })
})
