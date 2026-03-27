/**
 * Tree view types for molecule.dev.
 *
 * Defines the provider interface and data types for hierarchical
 * tree UI components.
 *
 * @module
 */

/**
 * A node in a tree hierarchy.
 */
export interface TreeNode<T = unknown> {
  /** Unique identifier for the node. */
  id: string

  /** Display label for the node. */
  label: string

  /** Child nodes. */
  children?: TreeNode<T>[]

  /** Optional data payload attached to the node. */
  data?: T

  /** Optional icon identifier. */
  icon?: string

  /** Whether the node is expanded. */
  expanded?: boolean

  /** Whether the node is selected. */
  selected?: boolean

  /** Whether the node is disabled (non-interactive). */
  disabled?: boolean
}

/**
 * Configuration options for creating a tree view.
 */
export interface TreeOptions<T = unknown> {
  /** Root-level tree data. */
  data: TreeNode<T>[]

  /** Callback when a node is selected. */
  onSelect?: (node: TreeNode<T>) => void

  /** Callback when a node is expanded or collapsed. */
  onExpand?: (node: TreeNode<T>) => void

  /** Whether multiple nodes can be selected simultaneously. Defaults to `false`. */
  multiSelect?: boolean

  /** Whether nodes can be dragged to reorder. Defaults to `false`. */
  draggable?: boolean

  /** Callback when a node is dropped onto another. */
  onDrop?: (
    source: TreeNode<T>,
    target: TreeNode<T>,
    position: 'before' | 'after' | 'inside',
  ) => void

  /** Whether to show checkboxes for each node. Defaults to `false`. */
  showCheckboxes?: boolean
}

/**
 * A live tree view instance returned by the provider.
 */
export interface TreeInstance<T = unknown> {
  /**
   * Returns the current tree data.
   *
   * @returns Array of root-level tree nodes.
   */
  getData(): TreeNode<T>[]

  /**
   * Replaces the tree data.
   *
   * @param data - New root-level tree nodes.
   */
  setData(data: TreeNode<T>[]): void

  /**
   * Expands a node by its ID.
   *
   * @param id - The node ID to expand.
   */
  expandNode(id: string): void

  /**
   * Collapses a node by its ID.
   *
   * @param id - The node ID to collapse.
   */
  collapseNode(id: string): void

  /**
   * Expands all nodes in the tree.
   */
  expandAll(): void

  /**
   * Collapses all nodes in the tree.
   */
  collapseAll(): void

  /**
   * Selects a node by its ID.
   *
   * @param id - The node ID to select.
   */
  selectNode(id: string): void

  /**
   * Returns all currently selected nodes.
   *
   * @returns Array of selected tree nodes.
   */
  getSelectedNodes(): TreeNode<T>[]

  /**
   * Destroys the tree view instance and cleans up resources.
   */
  destroy(): void
}

/**
 * Tree view provider interface.
 *
 * All tree view providers must implement this interface to create
 * and manage hierarchical tree UI components.
 */
export interface TreeViewProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new tree view instance.
   *
   * @param options - Configuration for the tree view.
   * @returns A tree instance for managing the tree.
   */
  createTree<T = unknown>(options: TreeOptions<T>): TreeInstance<T>
}
