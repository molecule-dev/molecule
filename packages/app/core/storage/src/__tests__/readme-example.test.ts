/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real localStorage bond
 * against happy-dom's real `localStorage` — nothing is mocked.
 *
 * @module
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { createLocalStorageProvider } from '@molecule/app-storage-localstorage'

import { get, keys, remove, set, setProvider } from '../index.js'

interface Preferences {
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
}

describe('README @example', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists JSON under the prefix, lists unprefixed keys and removes them', async () => {
    setProvider(createLocalStorageProvider({ prefix: 'myapp_' }))

    await set<Preferences>('preferences', { theme: 'dark', sidebarCollapsed: true })
    expect(localStorage.getItem('myapp_preferences')).toBe(
      JSON.stringify({ theme: 'dark', sidebarCollapsed: true }),
    )

    const prefs = await get<Preferences>('preferences')
    expect(prefs?.theme).toBe('dark')
    expect(await keys()).toEqual(['preferences'])

    await remove('preferences')
    expect(await get<Preferences>('preferences')).toBeNull()
    expect(localStorage.getItem('myapp_preferences')).toBeNull()
  })
})
