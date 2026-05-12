import { describe, expect, it } from 'vitest'

import * as bonds from '../index.js'

describe('@molecule/app-bonds-default-react', () => {
  it('exports the 7 default app-side bond setup functions', () => {
    const expected = [
      'setupAppFontsArimo',
      'setupAppIconsMolecule',
      'setupAppRoutingReactRouter',
      'setupAppStorageLocalstorage',
      'setupAppStylingTailwind',
      'setupAppThemeCssVariables',
      'setupAppUiTailwind',
    ]
    for (const name of expected) {
      expect(typeof (bonds as Record<string, unknown>)[name], `${name}`).toBe('function')
    }
    expect(typeof (bonds as Record<string, unknown>).getDefaultThemeProvider).toBe('function')
  })
})
