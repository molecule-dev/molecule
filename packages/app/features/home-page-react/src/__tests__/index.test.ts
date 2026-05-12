import { describe, expect, it } from 'vitest'

import { Home } from '../index.js'

describe('@molecule/app-home-page-react', () => {
  it('exports a Home component', () => {
    expect(typeof Home).toBe('function')
    expect(Home.name).toBe('Home')
  })
})
