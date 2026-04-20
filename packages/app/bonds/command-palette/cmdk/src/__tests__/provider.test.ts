import { describe, expect, it, vi } from 'vitest'

import type {
  CommandGroup,
  CommandItem,
  CommandPaletteOptions,
} from '@molecule/app-command-palette'

import { createCmdkProvider, provider } from '../provider.js'
import type { CmdkPaletteInstance } from '../types.js'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeCommand(overrides: Partial<CommandItem> = {}): CommandItem {
  return {
    id: 'cmd-1',
    label: 'Test Command',
    onSelect: vi.fn(),
    ...overrides,
  }
}

function makeGroup(overrides: Partial<CommandGroup> = {}): CommandGroup {
  return {
    id: 'group-1',
    label: 'Test Group',
    commands: [makeCommand()],
    ...overrides,
  }
}

function createOptions(overrides: Partial<CommandPaletteOptions> = {}): CommandPaletteOptions {
  return {
    groups: [
      makeGroup({
        id: 'nav',
        label: 'Navigation',
        commands: [
          makeCommand({ id: 'home', label: 'Go Home' }),
          makeCommand({
            id: 'settings',
            label: 'Open Settings',
            keywords: ['preferences', 'config'],
          }),
        ],
      }),
      makeGroup({
        id: 'actions',
        label: 'Actions',
        commands: [
          makeCommand({ id: 'save', label: 'Save File', shortcut: '⌘S' }),
          makeCommand({ id: 'copy', label: 'Copy Selection' }),
        ],
      }),
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-command-palette-cmdk', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with createPalette method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createPalette).toBe('function')
    })

    it('createCmdkProvider returns a CommandPaletteProvider', () => {
      const p = createCmdkProvider()
      expect(typeof p.createPalette).toBe('function')
    })

    it('createCmdkProvider accepts config', () => {
      const p = createCmdkProvider({ defaultFuzzyMatch: true, defaultLoop: false })
      expect(typeof p.createPalette).toBe('function')
    })
  })

  describe('open / close / toggle', () => {
    it('palette starts closed', () => {
      const pal = provider.createPalette(createOptions())
      expect(pal.isOpen()).toBe(false)
    })

    it('open sets isOpen to true', () => {
      const pal = provider.createPalette(createOptions())
      pal.open()
      expect(pal.isOpen()).toBe(true)
    })

    it('open fires onOpen callback', () => {
      const onOpen = vi.fn()
      const pal = provider.createPalette(createOptions({ onOpen }))
      pal.open()
      expect(onOpen).toHaveBeenCalledOnce()
    })

    it('open does not fire onOpen when already open', () => {
      const onOpen = vi.fn()
      const pal = provider.createPalette(createOptions({ onOpen }))
      pal.open()
      pal.open()
      expect(onOpen).toHaveBeenCalledOnce()
    })

    it('close sets isOpen to false', () => {
      const pal = provider.createPalette(createOptions())
      pal.open()
      pal.close()
      expect(pal.isOpen()).toBe(false)
    })

    it('close fires onClose callback', () => {
      const onClose = vi.fn()
      const pal = provider.createPalette(createOptions({ onClose }))
      pal.open()
      pal.close()
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('close does not fire onClose when already closed', () => {
      const onClose = vi.fn()
      const pal = provider.createPalette(createOptions({ onClose }))
      pal.close()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('close resets query', () => {
      const pal = provider.createPalette(createOptions())
      pal.open()
      pal.setQuery('test')
      pal.close()
      pal.open()
      expect(pal.getQuery()).toBe('')
    })

    it('close resets page stack', () => {
      const pal = provider.createPalette(
        createOptions({
          pages: [{ id: 'sub', label: 'Sub', groups: [], placeholder: 'Sub...' }],
        }),
      )
      pal.open()
      pal.pushPage('sub')
      expect(pal.getCurrentPage()).toBe('sub')
      pal.close()
      pal.open()
      expect(pal.getCurrentPage()).toBe('root')
    })

    it('toggle flips state', () => {
      const pal = provider.createPalette(createOptions())
      pal.toggle()
      expect(pal.isOpen()).toBe(true)
      pal.toggle()
      expect(pal.isOpen()).toBe(false)
    })
  })

  describe('search and filtering', () => {
    it('getQuery returns empty initially', () => {
      const pal = provider.createPalette(createOptions())
      expect(pal.getQuery()).toBe('')
    })

    it('setQuery updates the query', () => {
      const pal = provider.createPalette(createOptions())
      pal.setQuery('save')
      expect(pal.getQuery()).toBe('save')
    })

    it('setQuery fires onSearch callback', () => {
      const onSearch = vi.fn()
      const pal = provider.createPalette(createOptions({ onSearch }))
      pal.setQuery('test')
      expect(onSearch).toHaveBeenCalledWith('test')
    })

    it('getFilteredGroups returns all groups when query is empty', () => {
      const pal = provider.createPalette(createOptions())
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(2)
    })

    it('getFilteredGroups filters by label', () => {
      const pal = provider.createPalette(createOptions())
      pal.setQuery('Save')
      const groups = pal.getFilteredGroups()
      // Only the Actions group should have a match
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBe('actions')
      expect(groups[0].commands).toHaveLength(1)
      expect(groups[0].commands[0].id).toBe('save')
    })

    it('getFilteredGroups matches keywords', () => {
      const pal = provider.createPalette(createOptions())
      pal.setQuery('preferences')
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].commands[0].id).toBe('settings')
    })

    it('getFilteredGroups excludes groups with no matches', () => {
      const pal = provider.createPalette(createOptions())
      pal.setQuery('zzzzz')
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(0)
    })

    it('getFilteredGroups uses fuzzy matching', () => {
      const pal = provider.createPalette(createOptions())
      pal.setQuery('svfl') // matches "Save File" fuzzy
      const groups = pal.getFilteredGroups()
      expect(groups.length).toBeGreaterThanOrEqual(1)
      const allCmds = groups.flatMap((g) => g.commands)
      expect(allCmds.some((c) => c.id === 'save')).toBe(true)
    })

    it('uses custom filter when provided', () => {
      const filter = vi.fn((_query: string, item: CommandItem) => (item.id === 'home' ? 1 : 0))
      const pal = provider.createPalette(createOptions({ filter }))
      pal.setQuery('anything')
      const groups = pal.getFilteredGroups()
      const allCmds = groups.flatMap((g) => g.commands)
      expect(allCmds).toHaveLength(1)
      expect(allCmds[0].id).toBe('home')
    })
  })

  describe('page navigation', () => {
    it('starts at root page', () => {
      const pal = provider.createPalette(createOptions())
      expect(pal.getCurrentPage()).toBe('root')
      expect(pal.getPageStack()).toEqual(['root'])
    })

    it('pushPage navigates to a registered page', () => {
      const pal = provider.createPalette(
        createOptions({
          pages: [
            {
              id: 'projects',
              label: 'Projects',
              groups: [makeGroup({ id: 'proj-list', label: 'Projects' })],
            },
          ],
        }),
      )
      pal.pushPage('projects')
      expect(pal.getCurrentPage()).toBe('projects')
      expect(pal.getPageStack()).toEqual(['root', 'projects'])
    })

    it('pushPage does nothing for unregistered page', () => {
      const pal = provider.createPalette(createOptions())
      pal.pushPage('nonexistent')
      expect(pal.getCurrentPage()).toBe('root')
    })

    it('pushPage clears query', () => {
      const pal = provider.createPalette(
        createOptions({
          pages: [{ id: 'sub', label: 'Sub', groups: [] }],
        }),
      )
      pal.setQuery('test')
      pal.pushPage('sub')
      expect(pal.getQuery()).toBe('')
    })

    it('popPage returns to previous page', () => {
      const pal = provider.createPalette(
        createOptions({
          pages: [{ id: 'sub', label: 'Sub', groups: [] }],
        }),
      )
      pal.pushPage('sub')
      const result = pal.popPage()
      expect(result).toBe(true)
      expect(pal.getCurrentPage()).toBe('root')
    })

    it('popPage returns false at root', () => {
      const pal = provider.createPalette(createOptions())
      expect(pal.popPage()).toBe(false)
    })

    it('popPage clears query', () => {
      const pal = provider.createPalette(
        createOptions({
          pages: [{ id: 'sub', label: 'Sub', groups: [] }],
        }),
      )
      pal.pushPage('sub')
      pal.setQuery('test')
      pal.popPage()
      expect(pal.getQuery()).toBe('')
    })

    it('getFilteredGroups returns page-specific groups', () => {
      const pageGroups = [
        makeGroup({
          id: 'page-group',
          label: 'Page Items',
          commands: [makeCommand({ id: 'page-cmd', label: 'Page Command' })],
        }),
      ]
      const pal = provider.createPalette(
        createOptions({
          pages: [{ id: 'sub', label: 'Sub', groups: pageGroups }],
        }),
      )
      pal.pushPage('sub')
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBe('page-group')
    })
  })

  describe('command group management', () => {
    it('setGroups replaces all groups', () => {
      const pal = provider.createPalette(createOptions())
      const newGroups = [makeGroup({ id: 'new', label: 'New Group' })]
      pal.setGroups(newGroups)
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBe('new')
    })

    it('addGroup adds a new group', () => {
      const pal = provider.createPalette(createOptions())
      pal.addGroup(makeGroup({ id: 'extra', label: 'Extra' }))
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(3)
    })

    it('addGroup merges commands into existing group', () => {
      const pal = provider.createPalette(createOptions())
      pal.addGroup(
        makeGroup({
          id: 'nav',
          label: 'Navigation',
          commands: [makeCommand({ id: 'new-cmd', label: 'New Nav Command' })],
        }),
      )
      const groups = pal.getFilteredGroups()
      const navGroup = groups.find((g) => g.id === 'nav')
      // Original 2 commands + 1 merged
      expect(navGroup?.commands).toHaveLength(3)
    })

    it('addGroup does not duplicate existing commands during merge', () => {
      const pal = provider.createPalette(createOptions())
      pal.addGroup(
        makeGroup({
          id: 'nav',
          label: 'Navigation',
          commands: [makeCommand({ id: 'home', label: 'Go Home' })],
        }),
      )
      const groups = pal.getFilteredGroups()
      const navGroup = groups.find((g) => g.id === 'nav')
      expect(navGroup?.commands).toHaveLength(2) // no dup
    })

    it('removeGroup removes a group by id', () => {
      const pal = provider.createPalette(createOptions())
      pal.removeGroup('nav')
      const groups = pal.getFilteredGroups()
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBe('actions')
    })

    it('removeGroup does nothing for non-existent id', () => {
      const pal = provider.createPalette(createOptions())
      pal.removeGroup('nonexistent')
      expect(pal.getFilteredGroups()).toHaveLength(2)
    })
  })

  describe('command management', () => {
    it('addCommand adds to existing group', () => {
      const pal = provider.createPalette(createOptions())
      pal.addCommand('nav', makeCommand({ id: 'new', label: 'New' }))
      const navGroup = pal.getFilteredGroups().find((g) => g.id === 'nav')
      expect(navGroup?.commands).toHaveLength(3)
    })

    it('addCommand does nothing for non-existent group', () => {
      const pal = provider.createPalette(createOptions())
      pal.addCommand('nonexistent', makeCommand({ id: 'ghost', label: 'Ghost' }))
      const allCmds = pal.getFilteredGroups().flatMap((g) => g.commands)
      expect(allCmds.find((c) => c.id === 'ghost')).toBeUndefined()
    })

    it('removeCommand removes from all groups', () => {
      const pal = provider.createPalette(createOptions())
      pal.removeCommand('home')
      const allCmds = pal.getFilteredGroups().flatMap((g) => g.commands)
      expect(allCmds.find((c) => c.id === 'home')).toBeUndefined()
    })

    it('removeCommand does nothing for non-existent id', () => {
      const pal = provider.createPalette(createOptions())
      const before = pal.getFilteredGroups().flatMap((g) => g.commands).length
      pal.removeCommand('nonexistent')
      const after = pal.getFilteredGroups().flatMap((g) => g.commands).length
      expect(after).toBe(before)
    })
  })

  describe('priority sorting', () => {
    it('groups are sorted by priority descending', () => {
      const pal = provider.createPalette(
        createOptions({
          groups: [
            makeGroup({
              id: 'low',
              label: 'Low',
              priority: 1,
              commands: [makeCommand({ id: 'a', label: 'A' })],
            }),
            makeGroup({
              id: 'high',
              label: 'High',
              priority: 10,
              commands: [makeCommand({ id: 'b', label: 'B' })],
            }),
            makeGroup({
              id: 'mid',
              label: 'Mid',
              priority: 5,
              commands: [makeCommand({ id: 'c', label: 'C' })],
            }),
          ],
        }),
      )
      const groups = pal.getFilteredGroups()
      expect(groups[0].id).toBe('high')
      expect(groups[1].id).toBe('mid')
      expect(groups[2].id).toBe('low')
    })

    it('commands within groups are sorted by priority descending', () => {
      const pal = provider.createPalette(
        createOptions({
          groups: [
            makeGroup({
              id: 'g',
              label: 'G',
              commands: [
                makeCommand({ id: 'a', label: 'A', priority: 1 }),
                makeCommand({ id: 'b', label: 'B', priority: 10 }),
                makeCommand({ id: 'c', label: 'C', priority: 5 }),
              ],
            }),
          ],
        }),
      )
      const cmds = pal.getFilteredGroups()[0].commands
      expect(cmds[0].id).toBe('b')
      expect(cmds[1].id).toBe('c')
      expect(cmds[2].id).toBe('a')
    })
  })

  describe('immutability', () => {
    it('setGroups clones input', () => {
      const pal = provider.createPalette(createOptions())
      const groups = [makeGroup({ id: 'mutable', label: 'Mutable' })]
      pal.setGroups(groups)
      groups[0].label = 'Mutated'
      expect(pal.getFilteredGroups()[0].label).toBe('Mutable')
    })

    it('addGroup clones input', () => {
      const pal = provider.createPalette(createOptions())
      const group = makeGroup({ id: 'mutable', label: 'Mutable' })
      pal.addGroup(group)
      group.label = 'Mutated'
      const found = pal.getFilteredGroups().find((g) => g.id === 'mutable')
      expect(found?.label).toBe('Mutable')
    })
  })

  describe('destroy', () => {
    it('clears all state', () => {
      const pal = provider.createPalette(createOptions())
      pal.open()
      pal.setQuery('test')
      pal.destroy()
      expect(pal.isOpen()).toBe(false)
      expect(pal.getQuery()).toBe('')
      expect(pal.getFilteredGroups()).toHaveLength(0)
      expect(pal.getCurrentPage()).toBe('root')
    })
  })

  describe('internal methods (CmdkPaletteInstance)', () => {
    it('_getConfig returns config copy', () => {
      const p = createCmdkProvider({ defaultFuzzyMatch: false, defaultLoop: false })
      const pal = p.createPalette(createOptions()) as CmdkPaletteInstance
      const cfg = pal._getConfig()
      expect(cfg.defaultFuzzyMatch).toBe(false)
      expect(cfg.defaultLoop).toBe(false)
    })

    it('_getLoop returns true by default', () => {
      const pal = provider.createPalette(createOptions()) as CmdkPaletteInstance
      expect(pal._getLoop()).toBe(true)
    })

    it('_getLoop respects options.loop', () => {
      const pal = provider.createPalette(createOptions({ loop: false })) as CmdkPaletteInstance
      expect(pal._getLoop()).toBe(false)
    })

    it('_getLoop respects config.defaultLoop as fallback', () => {
      const p = createCmdkProvider({ defaultLoop: false })
      const pal = p.createPalette(createOptions()) as CmdkPaletteInstance
      expect(pal._getLoop()).toBe(false)
    })

    it('_getPlaceholder returns root placeholder', () => {
      const pal = provider.createPalette(
        createOptions({ placeholder: 'Search...' }),
      ) as CmdkPaletteInstance
      expect(pal._getPlaceholder()).toBe('Search...')
    })

    it('_getPlaceholder returns page placeholder on nested page', () => {
      const pal = provider.createPalette(
        createOptions({
          placeholder: 'Root...',
          pages: [{ id: 'sub', label: 'Sub', groups: [], placeholder: 'Sub...' }],
        }),
      ) as CmdkPaletteInstance
      pal.pushPage('sub')
      expect(pal._getPlaceholder()).toBe('Sub...')
    })

    it('_getPlaceholder falls back to root placeholder when page has none', () => {
      const pal = provider.createPalette(
        createOptions({
          placeholder: 'Root...',
          pages: [{ id: 'sub', label: 'Sub', groups: [] }],
        }),
      ) as CmdkPaletteInstance
      pal.pushPage('sub')
      expect(pal._getPlaceholder()).toBe('Root...')
    })

    it('_executeCommand calls onSelect', () => {
      const onSelect = vi.fn()
      const pal = provider.createPalette(
        createOptions({
          groups: [
            makeGroup({
              id: 'g',
              label: 'G',
              commands: [makeCommand({ id: 'exec-me', label: 'Exec', onSelect })],
            }),
          ],
        }),
      ) as CmdkPaletteInstance
      pal._executeCommand('exec-me')
      expect(onSelect).toHaveBeenCalledOnce()
    })

    it('_executeCommand does nothing for non-existent command', () => {
      const pal = provider.createPalette(createOptions()) as CmdkPaletteInstance
      expect(() => pal._executeCommand('nonexistent')).not.toThrow()
    })

    it('_executeCommand does nothing for disabled command', () => {
      const onSelect = vi.fn()
      const pal = provider.createPalette(
        createOptions({
          groups: [
            makeGroup({
              id: 'g',
              label: 'G',
              commands: [
                makeCommand({ id: 'disabled', label: 'Disabled', onSelect, disabled: true }),
              ],
            }),
          ],
        }),
      ) as CmdkPaletteInstance
      pal._executeCommand('disabled')
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('_executeCommand navigates to page when onSelect returns string', () => {
      const pal = provider.createPalette(
        createOptions({
          groups: [
            makeGroup({
              id: 'g',
              label: 'G',
              commands: [
                makeCommand({
                  id: 'nav-cmd',
                  label: 'Nav',
                  onSelect: () => 'sub-page',
                }),
              ],
            }),
          ],
          pages: [{ id: 'sub-page', label: 'Sub', groups: [] }],
        }),
      ) as CmdkPaletteInstance
      pal._executeCommand('nav-cmd')
      expect(pal.getCurrentPage()).toBe('sub-page')
    })
  })
})
