import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

// 1.1.3 had no exports map, so `require('@molecule/app-routing-react-router')` loaded
// its main file. The exports map must keep a condition `require` resolves.
describe('CommonJS resolution', () => {
  it.each(['@molecule/app-routing-react-router', '@molecule/app-routing-react-router/dom'])(
    'resolves %s through require',
    (specifier) => {
      const require = createRequire(import.meta.url)

      expect(require.resolve(specifier)).toMatch(/[\\/]dist[\\/](index|dom)\.js$/)
    },
  )
})
