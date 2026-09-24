/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { createPalette, setProvider } from '@molecule/app-command-palette'

import { createCmdkProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the provider, filters by keyword, and runs the selected command', () => {
    setProvider(createCmdkProvider({ defaultFuzzyMatch: true }))

    const navigate = vi.fn()
    const palette = createPalette({
      groups: [
        {
          id: 'navigation',
          label: 'Navigation',
          commands: [
            {
              id: 'open-settings',
              label: 'Open settings',
              keywords: ['preferences'],
              shortcut: 'mod+,',
              onSelect: () => navigate('/settings'),
            },
          ],
        },
      ],
    })

    palette.open()
    expect(palette.isOpen()).toBe(true)
    palette.setQuery('pref')
    const [group] = palette.getFilteredGroups()
    expect(group?.label).toBe('Navigation')
    expect(group?.commands.map((c) => c.id)).toEqual(['open-settings'])

    group?.commands[0]?.onSelect()
    expect(navigate).toHaveBeenCalledWith('/settings')

    palette.setQuery('zzz')
    expect(palette.getFilteredGroups()).toEqual([])

    palette.close()
    expect(palette.isOpen()).toBe(false)
    expect(palette.getQuery()).toBe('')
  })
})
