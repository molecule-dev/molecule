// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `Home` — a port of
 * `@molecule/app-home-page-react/src/__tests__/index.test.ts`:
 * the same test name and the same assertions (a compiled Svelte 5
 * component, like a React one, is a function named after the component).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { Home } from '../index.js'

describe('@molecule/app-home-page-svelte', () => {
  it('exports a Home component', () => {
    expect(typeof Home).toBe('function')
    expect(Home.name).toBe('Home')
  })
})
