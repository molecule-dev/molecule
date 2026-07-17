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
 * Recursively collects all checked nodes.
 *
 * @param nodes - Array of tree nodes to search.
 * @returns Array of checked nodes.
 */
function collectChecked<T>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  const result: TreeNode<T>[] = []
  for (const node of nodes) {
    if (node.checked) result.push(node)
    if (node.children) {
      result.push(...collectChecked(node.children))
    }
  }
  return result
}

/**
 * Locates a node together with the array it lives in and its index there.
 *
 * @param nodes - Array of tree nodes to search.
 * @param id - The node ID to find.
 * @returns The node, its sibling array, and its index, or `undefined`.
 */
function locateNode<T>(
  nodes: TreeNode<T>[],
  id: string,
): { node: TreeNode<T>; siblings: TreeNode<T>[]; index: number } | undefined {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === id) return { node, siblings: nodes, index: i }
    if (node.children) {
      const found = locateNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Checks whether a node with the given ID exists within another node's subtree.
 *
 * @param node - The node whose subtree to search.
 * @param id - The descendant ID to look for.
 * @returns `true` if `id` is a descendant of `node`.
 */
function isDescendant<T>(node: TreeNode<T>, id: string): boolean {
  if (!node.children) return false
  for (const child of node.children) {
    if (child.id === id) return true
    if (isDescendant(child, id)) return true
  }
  return false
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

        toggleChecked(id: string): void {
          // Checkbox state is only active when the knob is enabled.
          if (!options.showCheckboxes) return
          const node = findNode(data, id)
          if (node && !node.disabled) {
            node.checked = !node.checked
          }
        },

        getCheckedNodes(): TreeNode<T>[] {
          return collectChecked(data)
        },

        moveNode(
          sourceId: string,
          targetId: string,
          position: 'before' | 'after' | 'inside',
        ): boolean {
          // Moving is only permitted when the knob is enabled.
          if (!options.draggable) return false
          if (sourceId === targetId) return false

          const sourceLoc = locateNode(data, sourceId)
          const targetLoc = locateNode(data, targetId)
          if (!sourceLoc || !targetLoc) return false

          // Reject moving a node into its own subtree (would detach the tree).
          if (isDescendant(sourceLoc.node, targetId)) return false

          const source = sourceLoc.node
          const target = targetLoc.node

          // Detach the source from its current siblings.
          sourceLoc.siblings.splice(sourceLoc.index, 1)

          if (position === 'inside') {
            target.children = target.children ?? []
            target.children.push(source)
          } else {
            // Re-locate the target after removal — indices in a shared sibling
            // array shift once the source is spliced out.
            const targetAfter = locateNode(data, targetId)
            if (!targetAfter) {
              // Should not happen (descendant guard above), but restore & reject.
              sourceLoc.siblings.splice(sourceLoc.index, 0, source)
              return false
            }
            const insertIndex = position === 'before' ? targetAfter.index : targetAfter.index + 1
            targetAfter.siblings.splice(insertIndex, 0, source)
          }

          options.onDrop?.(source, target, position)
          return true
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
