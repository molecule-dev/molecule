/**
 * Workspace layout and panel management types.
 *
 * @module
 */

/**
 * Identifier for a workspace panel (built-in names or custom strings).
 */
export type PanelId = 'chat' | 'editor' | 'preview' | 'terminal' | 'deploy' | 'files' | string

/**
 * Position of a panel within the workspace layout.
 */
export type PanelPosition = 'left' | 'center' | 'right' | 'bottom'

/**
 * Configuration for an individual workspace panel including
 * position, sizing constraints, and visibility.
 */
export interface PanelConfig {
  id: PanelId
  position: PanelPosition
  minWidth?: number
  minHeight?: number
  defaultSize?: number
  resizable?: boolean
  collapsible?: boolean
  visible?: boolean
}

/**
 * Complete workspace layout describing panel arrangement and sizing.
 */
export interface WorkspaceLayout {
  panels: PanelConfig[]
  sizes: Record<PanelPosition, number[]>
}

/**
 * Current workspace state including layout, active panel,
 * collapsed panels, and fullscreen mode.
 */
export interface WorkspaceState {
  layout: WorkspaceLayout
  activePanel: PanelId | null
  collapsedPanels: Set<PanelId>
  isFullscreen: boolean
}

/**
 * Configuration options for creating a workspace provider.
 */
export interface WorkspaceConfig {
  defaultLayout: WorkspaceLayout
  persistLayout?: boolean
  storageKey?: string
}

/**
 * Workspace provider interface that all IDE workspace bond packages
 * must implement. Manages panel layout, sizing, and visibility.
 */
export interface WorkspaceProvider {
  /** Provider name identifier. */
  readonly name: string

  /** Returns the current workspace layout. */
  getLayout(): WorkspaceLayout

  /** Sets the entire workspace layout. */
  setLayout(layout: WorkspaceLayout): void

  /** Toggles visibility of a panel by ID. */
  togglePanel(panelId: PanelId): void

  /** Resizes a panel to the given size. */
  resizePanel(panelId: PanelId, size: number): void

  /** Sets the active (focused) panel. */
  setActivePanel(panelId: PanelId): void

  /**
   * Subscribes to workspace state changes.
   *
   * @returns An unsubscribe function.
   */
  subscribe(callback: (state: WorkspaceState) => void): () => void

  /** Resets layout to the default configuration. */
  resetLayout(): void
}
