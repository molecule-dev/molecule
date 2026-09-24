/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the cmdk-style bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-command-palette-cmdk'

import { createPalette, setProvider } from '../index.js'

describe('README @example', () => {
  it('filters by keyword, runs the highlighted command, and closes', () => {
    setProvider(provider)

    const visited: string[] = []
    const navigate = (path: string): void => {
      visited.push(path)
    }

    const palette = createPalette({
      groups: [
        {
          id: 'navigation',
          label: 'Navigation',
          commands: [
            { id: 'home', label: 'Go Home', onSelect: () => navigate('/') },
            {
              id: 'settings',
              label: 'Settings',
              keywords: ['preferences'],
              onSelect: () => navigate('/settings'),
            },
          ],
        },
      ],
      placeholder: 'Type a command…',
    })

    palette.open()
    expect(palette.isOpen()).toBe(true)
    palette.setQuery('prefs')
    const [first] = palette.getFilteredGroups()[0]?.commands ?? []
    expect(first?.id).toBe('settings')
    expect(palette.getFilteredGroups()[0]?.commands).toHaveLength(1)

    const page = first?.onSelect()
    if (typeof page === 'string') palette.pushPage(page)
    else palette.close()

    expect(visited).toEqual(['/settings'])
    expect(palette.isOpen()).toBe(false)
    expect(palette.getQuery()).toBe('')
  })
})
