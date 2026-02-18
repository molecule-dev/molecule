import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PanelId } from '@molecule/app-ide'

import { createProvider, DefaultWorkspaceProvider } from '../provider.js'

function mockStorage(): {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  _store: Map<string, string>
} {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    _store: store,
  }
}

describe('@molecule/app-ide-default', () => {
  describe('constructor', () => {
    it('should create with default layout', () => {
      const provider = new DefaultWorkspaceProvider()
      const layout = provider.getLayout()

      expect(layout.panels).toHaveLength(3)
      expect(layout.panels.map((p) => p.id)).toEqual(['chat', 'editor', 'preview'])
    })

    it('should accept custom default layout', () => {
      const customLayout = {
        panels: [
          { id: 'main' as PanelId, position: 'center' as const, defaultSize: 100, visible: true },
        ],
        sizes: { left: [], center: [100], right: [], bottom: [] },
      }
      const provider = new DefaultWorkspaceProvider({ defaultLayout: customLayout })

      expect(provider.getLayout().panels).toHaveLength(1)
      expect(provider.getLayout().panels[0].id).toBe('main')
    })

    it('should load persisted layout from storage', () => {
      const storage = mockStorage()
      const savedLayout = {
        panels: [{ id: 'saved' as PanelId, position: 'center', defaultSize: 100, visible: true }],
        sizes: { left: [], center: [100], right: [], bottom: [] },
      }
      storage._store.set('molecule-workspace-layout', JSON.stringify({ layout: savedLayout }))

      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
      })

      expect(provider.getLayout().panels[0].id).toBe('saved')
    })

    it('should use default layout when storage is empty', () => {
      const storage = mockStorage()
      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
      })

      expect(provider.getLayout().panels).toHaveLength(3)
    })

    it('should use default layout when storage has invalid JSON', () => {
      const storage = mockStorage()
      storage._store.set('molecule-workspace-layout', 'not-json')

      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
      })

      expect(provider.getLayout().panels).toHaveLength(3)
    })
  })

  describe('setLayout', () => {
    it('should update layout and notify subscribers', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      const newLayout = {
        panels: [
          { id: 'new' as PanelId, position: 'center' as const, defaultSize: 100, visible: true },
        ],
        sizes: { left: [], center: [100], right: [], bottom: [] },
      }
      provider.setLayout(newLayout)

      expect(provider.getLayout().panels[0].id).toBe('new')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should persist when persistLayout is enabled', () => {
      const storage = mockStorage()
      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
      })

      const newLayout = {
        panels: [],
        sizes: { left: [], center: [], right: [], bottom: [] },
      }
      provider.setLayout(newLayout)

      expect(storage.setItem).toHaveBeenCalledWith('molecule-workspace-layout', expect.any(String))
    })
  })

  describe('togglePanel', () => {
    let provider: DefaultWorkspaceProvider

    beforeEach(() => {
      provider = new DefaultWorkspaceProvider()
    })

    it('should collapse a panel', () => {
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.togglePanel('chat')

      const state = callback.mock.calls[0][0]
      expect(state.collapsedPanels.has('chat')).toBe(true)
    })

    it('should uncollapse a previously collapsed panel', () => {
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.togglePanel('chat')
      provider.togglePanel('chat')

      const state = callback.mock.calls[1][0]
      expect(state.collapsedPanels.has('chat')).toBe(false)
    })
  })

  describe('resizePanel', () => {
    it('should update panel size for the correct position', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.resizePanel('chat', 30)

      const state = callback.mock.calls[0][0]
      expect(state.layout.sizes.left[0]).toBe(30)
    })

    it('should not notify when panel not found', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.resizePanel('nonexistent' as PanelId, 50)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('setActivePanel', () => {
    it('should update active panel and notify', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()
      provider.subscribe(callback)

      provider.setActivePanel('editor')

      const state = callback.mock.calls[0][0]
      expect(state.activePanel).toBe('editor')
    })
  })

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()
      const unsubscribe = provider.subscribe(callback)

      provider.setActivePanel('chat')
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      provider.setActivePanel('editor')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers', () => {
      const provider = new DefaultWorkspaceProvider()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      provider.subscribe(cb1)
      provider.subscribe(cb2)

      provider.setActivePanel('chat')

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })
  })

  describe('resetLayout', () => {
    it('should restore default layout', () => {
      const provider = new DefaultWorkspaceProvider()
      provider.setActivePanel('chat')
      provider.togglePanel('preview')

      provider.resetLayout()

      const layout = provider.getLayout()
      expect(layout.panels).toHaveLength(3)
    })

    it('should clear collapsed panels and active panel', () => {
      const provider = new DefaultWorkspaceProvider()
      const callback = vi.fn()

      provider.setActivePanel('chat')
      provider.togglePanel('preview')
      provider.subscribe(callback)

      provider.resetLayout()

      const state = callback.mock.calls[0][0]
      expect(state.activePanel).toBeNull()
      expect(state.collapsedPanels.size).toBe(0)
      expect(state.isFullscreen).toBe(false)
    })
  })

  describe('persistence', () => {
    it('should use custom storage key', () => {
      const storage = mockStorage()
      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
        storageKey: 'custom-key',
      })

      provider.setActivePanel('chat') // triggers persist via setLayout? No—setActivePanel doesn't persist.
      // setLayout does persist:
      provider.setLayout(provider.getLayout())

      expect(storage.setItem).toHaveBeenCalledWith('custom-key', expect.any(String))
    })

    it('should not persist when persistLayout is false', () => {
      const storage = mockStorage()
      const provider = new DefaultWorkspaceProvider({
        persistLayout: false,
        storage,
      })

      provider.setLayout(provider.getLayout())

      expect(storage.setItem).not.toHaveBeenCalled()
    })

    it('should serialize collapsedPanels as array', () => {
      const storage = mockStorage()
      const provider = new DefaultWorkspaceProvider({
        persistLayout: true,
        storage,
      })

      provider.togglePanel('chat')
      provider.setLayout(provider.getLayout()) // triggers persist

      const saved = JSON.parse(storage.setItem.mock.calls[0][1])
      expect(Array.isArray(saved.collapsedPanels)).toBe(true)
    })
  })

  describe('createProvider', () => {
    it('should return a DefaultWorkspaceProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(DefaultWorkspaceProvider)
    })

    it('should pass config through', () => {
      const provider = createProvider({ storageKey: 'test' })
      expect(provider).toBeInstanceOf(DefaultWorkspaceProvider)
    })
  })
})
