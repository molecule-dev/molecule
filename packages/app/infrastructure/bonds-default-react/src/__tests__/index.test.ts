import { describe, expect, it } from 'vitest'

import * as bonds from '../index.js'

describe('@molecule/app-bonds-default-react', () => {
  it('exports default app bond setup functions + auth + bootstrap helpers', () => {
    const expected = [
      'setupAppFontsArimo',
      'setupAppIconsMolecule',
      'setupAppRoutingReactRouter',
      'setupAppStorageLocalstorage',
      'setupAppStylingTailwind',
      'setupAppThemeCssVariables',
      'setupAppUiTailwind',
      'getDefaultThemeProvider',
      'createDefaultAuthClient',
      'bootstrapApp',
    ]
    for (const name of expected) {
      expect(typeof (bonds as Record<string, unknown>)[name], `${name}`).toBe('function')
    }
  })
})
