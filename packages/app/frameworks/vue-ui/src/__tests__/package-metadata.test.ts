/// <reference types="node" />
/**
 * Vue port of `@molecule/app-ui-react/src/__tests__/package-metadata.test.ts`:
 * the package manifest must declare `sideEffects: false` so a bundler can
 * drop the components a page does not import.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('@molecule/app-ui-vue package metadata', () => {
  it('declares sideEffects: false so a page importing one component does not bundle all of them', () => {
    // Without this flag a bundler conservatively keeps every module reachable
    // from the barrel: importing one component pulls every other component
    // into the app's entry chunk (`@molecule/app-ui-react` measured 22 KB raw
    // / 10 KB gzip of unused components in a fresh scaffold).
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { sideEffects?: unknown }
    expect(pkg.sideEffects).toBe(false)
  })
})
