import { describe, expect, it } from 'vitest'

import * as bonds from '../index.js'

describe('@molecule/app-bonds-default-svelte', () => {
  it('exports default app bond setup functions + auth + bootstrap helpers', () => {
    const expected = [
      'setupAppFontsArimo',
      'setupAppIconsMolecule',
      'setupAppRoutingSvelteKit',
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
