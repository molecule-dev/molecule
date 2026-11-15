// @vitest-environment jsdom
/**
 * Unit tests for the Angular `Home` — a port of
 * `@molecule/app-home-page-react/src/__tests__/index.test.ts`:
 * the same test name and the same assertions (an Angular component class,
 * like a React component function, is a function named after the
 * component).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { Home } from '../index.js'

describe('@molecule/app-home-page-angular', () => {
  it('exports a Home component', () => {
    expect(typeof Home).toBe('function')
    expect(Home.name).toBe('Home')
  })
})
