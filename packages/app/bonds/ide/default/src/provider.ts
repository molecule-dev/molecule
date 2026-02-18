/**
 * Default workspace provider implementation.
 *
 * Manages panel layout, sizes, visibility, and collapse state.
 * Optionally persists layout via an injectable storage adapter.
 *
 * @module
 */

import type { PanelId, WorkspaceLayout, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import type { DefaultWorkspaceConfig, StorageAdapter } from './types.js'

const DEFAULT_LAYOUT: WorkspaceLayout = {
  panels: [
    {
      id: 'chat',
      position: 'left',
      defaultSize: 25,
      resizable: true,
      collapsible: true,
      visible: true,
    },
    { id: 'editor', position: 'center', defaultSize: 50, resizable: true, visible: true },
    {
      id: 'preview',
      position: 'right',
      defaultSize: 25,
      resizable: true,
      collapsible: true,
      visible: true,
    },
  ],
  sizes: { left: [25], center: [50], right: [25], bottom: [] },
}

/**
 * Default implementation of `WorkspaceProvider`. Manages panel layout (chat, editor, preview),
 * sizes, visibility, collapse state, and optional persistence via a storage adapter.
 */
export class DefaultWorkspaceProvider implements WorkspaceProvider {
  readonly name = 'default'
  private state: WorkspaceState
  private defaultLayout: WorkspaceLayout
  private persistLayout: boolean
  private storageKey: string
  private storage: StorageAdapter | null
  private subscribers: Set<(state: WorkspaceState) => void> = new Set()

  constructor(config: DefaultWorkspaceConfig = {}) {
    this.defaultLayout = config.defaultLayout ?? DEFAULT_LAYOUT
    this.persistLayout = config.persistLayout ?? false
    this.storageKey = config.storageKey ?? 'molecule-workspace-layout'
    this.storage = config.storage ?? null

    const savedLayout = this.loadPersistedLayout()

    this.state = {
      layout: savedLayout ?? { ...this.defaultLayout },
      activePanel: null,
      collapsedPanels: new Set(),
      isFullscreen: false,
    }
  }

  /**
   * Returns the current workspace layout with panel positions and sizes.
   * @returns The current workspace layout.
   */
  getLayout(): WorkspaceLayout {
    return this.state.layout
  }

  /**
   * Replaces the workspace layout, persists it, and notifies subscribers.
   * @param layout - The new workspace layout.
   */
  setLayout(layout: WorkspaceLayout): void {
    this.state = { ...this.state, layout }
    this.persist()
    this.notify()
  }

  /**
   * Toggles a panel's collapsed state.
   * @param panelId - The ID of the panel to toggle.
   */
  togglePanel(panelId: PanelId): void {
    const collapsed = new Set(this.state.collapsedPanels)
    if (collapsed.has(panelId)) {
      collapsed.delete(panelId)
    } else {
      collapsed.add(panelId)
    }
    this.state = { ...this.state, collapsedPanels: collapsed }
    this.notify()
  }

  /**
   * Resizes a panel to the given size percentage within its position group.
   * @param panelId - The ID of the panel to resize.
   * @param size - The new size as a percentage.
   */
  resizePanel(panelId: PanelId, size: number): void {
    const panel = this.state.layout.panels.find((p) => p.id === panelId)
    if (!panel) return

    const position = panel.position
    const positionPanels = this.state.layout.panels.filter((p) => p.position === position)
    const panelIndex = positionPanels.findIndex((p) => p.id === panelId)
    if (panelIndex === -1) return

    const sizes = { ...this.state.layout.sizes }
    const positionSizes = [...(sizes[position] ?? [])]
    positionSizes[panelIndex] = size
    sizes[position] = positionSizes

    this.state = {
      ...this.state,
      layout: { ...this.state.layout, sizes },
    }
    this.persist()
    this.notify()
  }

  /**
   * Sets the given panel as the active (focused) panel.
   * @param panelId - The ID of the panel to activate.
   */
  setActivePanel(panelId: PanelId): void {
    this.state = { ...this.state, activePanel: panelId }
    this.notify()
  }

  /**
   * Subscribes to workspace state changes.
   * @param callback - Called with the new state whenever layout, panels, or active panel changes.
   * @returns An unsubscribe function.
   */
  subscribe(callback: (state: WorkspaceState) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /** Resets the workspace to the default layout, clears collapsed panels, and persists. */
  resetLayout(): void {
    this.state = {
      layout: { ...this.defaultLayout },
      activePanel: null,
      collapsedPanels: new Set(),
      isFullscreen: false,
    }
    this.persist()
    this.notify()
  }

  /** Notifies all subscribers of the current workspace state. */
  private notify(): void {
    for (const cb of this.subscribers) {
      cb(this.state)
    }
  }

  /** Persists the current layout to the storage adapter if persistence is enabled. */
  private persist(): void {
    if (!this.persistLayout || !this.storage) return
    try {
      const serializable = {
        layout: this.state.layout,
        collapsedPanels: [...this.state.collapsedPanels],
      }
      this.storage.setItem(this.storageKey, JSON.stringify(serializable))
    } catch {
      // storage may be unavailable
    }
  }

  /**
   * Loads a previously persisted layout from the storage adapter.
   * @returns The saved layout, or `null` if none exists or persistence is disabled.
   */
  private loadPersistedLayout(): WorkspaceLayout | null {
    if (!this.persistLayout || !this.storage) return null
    try {
      const saved = this.storage.getItem(this.storageKey)
      if (!saved) return null
      const parsed = JSON.parse(saved) as { layout?: WorkspaceLayout }
      return parsed.layout ?? null
    } catch {
      return null
    }
  }
}

/**
 * Creates a `DefaultWorkspaceProvider` with optional layout configuration and persistence.
 * @param config - Workspace configuration (default layout, persistence options, storage adapter).
 * @returns A `DefaultWorkspaceProvider` that manages panel layout state.
 */
export function createProvider(config?: DefaultWorkspaceConfig): DefaultWorkspaceProvider {
  return new DefaultWorkspaceProvider(config)
}
