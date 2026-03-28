/**
 * Default tree view provider implementation.
 *
 * @module
 */

import type { TreeInstance, TreeNode, TreeOptions, TreeViewProvider } from '@molecule/app-tree-view'

import type { DefaultTreeViewConfig } from './types.js'

/**
 * Recursively finds a node by ID in the tree.
 *
 * @param nodes - Array of tree nodes to search.
 * @param id - The node ID to find.
 * @returns The found node, or `undefined`.
 */
function findNode<T>(nodes: TreeNode<T>[], id: string): TreeNode<T> | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Recursively sets expanded state on all nodes.
 *
 * @param nodes - Array of tree nodes.
 * @param expanded - Whether to expand or collapse.
 */
function setAllExpanded<T>(nodes: TreeNode<T>[], expanded: boolean): void {
  for (const node of nodes) {
    node.expanded = expanded
    if (node.children) {
      setAllExpanded(node.children, expanded)
    }
  }
}

/**
 * Recursively collects all selected nodes.
 *
 * @param nodes - Array of tree nodes to search.
 * @returns Array of selected nodes.
 */
function collectSelected<T>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  const result: TreeNode<T>[] = []
  for (const node of nodes) {
    if (node.selected) result.push(node)
    if (node.children) {
      result.push(...collectSelected(node.children))
    }
  }
  return result
}

/**
 * Deep clones a tree node array.
 *
 * @param nodes - Array of tree nodes to clone.
 * @returns Cloned array.
 */
function cloneNodes<T>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneNodes(node.children) : undefined,
  }))
}

/**
 * Creates a default tree view provider.
 *
 * @param config - Optional provider configuration.
 * @returns A configured TreeViewProvider.
 */
export function createProvider(config?: DefaultTreeViewConfig): TreeViewProvider {
  return {
    name: 'default',

    createTree<T>(options: TreeOptions<T>): TreeInstance<T> {
      let data = cloneNodes(options.data)

      if (config?.expandAll) {
        setAllExpanded(data, true)
      }

      return {
        getData(): TreeNode<T>[] {
          return cloneNodes(data)
        },

        setData(newData: TreeNode<T>[]): void {
          data = cloneNodes(newData)
        },

        expandNode(id: string): void {
          const node = findNode(data, id)
          if (node) {
            node.expanded = true
            options.onExpand?.(node)
          }
        },

        collapseNode(id: string): void {
          const node = findNode(data, id)
          if (node) {
            node.expanded = false
            options.onExpand?.(node)
          }
        },

        expandAll(): void {
          setAllExpanded(data, true)
        },

        collapseAll(): void {
          setAllExpanded(data, false)
        },

        selectNode(id: string): void {
          if (!options.multiSelect) {
            // Deselect all first
            const deselectAll = (nodes: TreeNode<T>[]): void => {
              for (const n of nodes) {
                n.selected = false
                if (n.children) deselectAll(n.children)
              }
            }
            deselectAll(data)
          }
          const node = findNode(data, id)
          if (node && !node.disabled) {
            node.selected = true
            options.onSelect?.(node)
          }
        },

        getSelectedNodes(): TreeNode<T>[] {
          return collectSelected(data)
        },

        destroy(): void {
          data = []
        },
      }
    },
  }
}

/** Default tree view provider instance. */
export const provider: TreeViewProvider = createProvider()
