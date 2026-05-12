import { describe, expect, it } from 'vitest'

import {
  setupAppFontsArimo,
  setupAppIconsMolecule,
  setupAppRoutingReactRouter,
  setupAppStorageLocalstorage,
  setupAppStylingTailwind,
} from '../index.js'

describe('@molecule/app-bonds-default-react', () => {
  it('exports the 5 default app-side bond setup functions', () => {
    expect(typeof setupAppFontsArimo).toBe('function')
    expect(typeof setupAppIconsMolecule).toBe('function')
    expect(typeof setupAppRoutingReactRouter).toBe('function')
    expect(typeof setupAppStorageLocalstorage).toBe('function')
    expect(typeof setupAppStylingTailwind).toBe('function')
  })
})
