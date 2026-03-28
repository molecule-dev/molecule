import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createPalette, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  CommandGroup,
  CommandItem,
  CommandPaletteInstance,
  CommandPaletteOptions,
  CommandPaletteProvider,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockCommand(overrides?: Partial<CommandItem>): CommandItem {
  return {
    id: 'cmd-1',
    label: 'Test Command',
    onSelect: vi.fn(),
    ...overrides,
  }
}

function createMockGroup(overrides?: Partial<CommandGroup>): CommandGroup {
  return {
    id: 'group-1',
    label: 'Test Group',
    commands: [createMockCommand()],
    ...overrides,
  }
}

function createMockPaletteInstance(options: CommandPaletteOptions): CommandPaletteInstance {
  let opened = false
  let query = ''
  const groups = [...options.groups]
  const pageStack = ['root']

  return {
    open: () => {
      opened = true
    },
    close: () => {
      opened = false
    },
    toggle: () => {
      opened = !opened
    },
    isOpen: () => opened,
    getQuery: () => query,
    setQuery: (q: string) => {
      query = q
    },
    getFilteredGroups: () => groups,
    pushPage: (pageId: string) => {
      pageStack.push(pageId)
    },
    popPage: () => {
      if (pageStack.length <= 1) return false
      pageStack.pop()
      return true
    },
    getPageStack: () => [...pageStack],
    getCurrentPage: () => pageStack[pageStack.length - 1],
    setGroups: vi.fn(),
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    addCommand: vi.fn(),
    removeCommand: vi.fn(),
    destroy: vi.fn(),
  }
}

function createMockProvider(): CommandPaletteProvider {
  return {
    createPalette: (opts: CommandPaletteOptions) => createMockPaletteInstance(opts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Command palette provider', () => {
  beforeEach(() => {
    unbond('command-palette')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-command-palette')
    })
  })

  describe('createPalette', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createPalette')
      setProvider(mock)

      const options: CommandPaletteOptions = {
        groups: [createMockGroup()],
        placeholder: 'Type a command…',
      }

      const instance = createPalette(options)
      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getFilteredGroups()).toHaveLength(1)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createPalette({ groups: [] })).toThrow('@molecule/app-command-palette')
    })
  })
})

describe('CommandPaletteInstance (mock conformance)', () => {
  let instance: CommandPaletteInstance

  beforeEach(() => {
    unbond('command-palette')
    setProvider(createMockProvider())
    instance = createPalette({
      groups: [
        createMockGroup({ id: 'nav', label: 'Navigation' }),
        createMockGroup({ id: 'actions', label: 'Actions' }),
      ],
    })
  })

  // -- Open / Close --------------------------------------------------------

  it('isOpen returns false initially', () => {
    expect(instance.isOpen()).toBe(false)
  })

  it('open sets isOpen to true', () => {
    instance.open()
    expect(instance.isOpen()).toBe(true)
  })

  it('close sets isOpen to false', () => {
    instance.open()
    instance.close()
    expect(instance.isOpen()).toBe(false)
  })

  it('toggle flips isOpen', () => {
    instance.toggle()
    expect(instance.isOpen()).toBe(true)
    instance.toggle()
    expect(instance.isOpen()).toBe(false)
  })

  // -- Search --------------------------------------------------------------

  it('getQuery returns empty string initially', () => {
    expect(instance.getQuery()).toBe('')
  })

  it('setQuery updates the query', () => {
    instance.setQuery('test')
    expect(instance.getQuery()).toBe('test')
  })

  it('getFilteredGroups returns groups', () => {
    expect(instance.getFilteredGroups()).toHaveLength(2)
  })

  // -- Page navigation -----------------------------------------------------

  it('getCurrentPage returns root initially', () => {
    expect(instance.getCurrentPage()).toBe('root')
  })

  it('pushPage adds to page stack', () => {
    instance.pushPage('sub-page')
    expect(instance.getCurrentPage()).toBe('sub-page')
    expect(instance.getPageStack()).toEqual(['root', 'sub-page'])
  })

  it('popPage returns to previous page', () => {
    instance.pushPage('sub-page')
    const result = instance.popPage()
    expect(result).toBe(true)
    expect(instance.getCurrentPage()).toBe('root')
  })

  it('popPage returns false at root', () => {
    expect(instance.popPage()).toBe(false)
  })

  // -- Lifecycle -----------------------------------------------------------

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})
