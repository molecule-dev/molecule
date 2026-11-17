/**
 * The package can be imported before the app bonds a class map, as `@molecule/app-ui-react` can:
 * ES imports run before the importing module's body, so an app's entry imports components before
 * its `setClassMap()` call runs. The class constants read at load are empty then; the getters read
 * the live class map.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { hasClassMap, setClassMap, type UIClassMap } from '@molecule/app-ui'

describe('importing @molecule/app-ui-svelte before setClassMap()', () => {
  it('does not throw, and the getters read the class map bonded afterwards', async () => {
    expect(hasClassMap()).toBe(false)
    const ui = await import('../index.js')
    expect(ui.alertDismissClass).toBe('')
    expect(ui.tableWrapperClass).toBe('')

    const classMap = new Proxy({} as UIClassMap, {
      get: (_target, key) => `class-${String(key)}`,
    })
    setClassMap(classMap)
    expect(ui.getAlertDismissClass()).toBe('class-alertDismiss')
  })
})
