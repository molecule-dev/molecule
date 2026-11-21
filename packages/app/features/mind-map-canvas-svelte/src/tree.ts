/**
 * Pure tree mutators for the mind-map model. Every helper returns a NEW
 * tree (no mutation) so consumers can use them with `useState` /
 * controlled-mode `onChange` without surprises.
 *
 * @module
 */

import type { MindMapNode } from './types.js'

/**
 * Walk the tree and find the node with the given id, returning a
 * pointer-style reference (not a clone). Used internally by the other
 * helpers — exported because it's also handy at call sites.
 *
 * @param root - Tree root.
 * @param id - Id of the node to locate.
 * @returns The node, or `null` if no node has that id.
 */
export function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return null
}

/**
 * Apply a transformation to the node with the given id, returning a
 * new tree where every ancestor of the touched node has been re-cloned
 * so React-style reference equality remains correct on unchanged
 * subtrees.
 *
 * @param root - Tree root.
 * @param id - Id of the node to update.
 * @param updater - Function that returns the replacement node.
 * @returns A new tree, or the original if `id` was not found.
 */
export function updateNode(
  root: MindMapNode,
  id: string,
  updater: (node: MindMapNode) => MindMapNode,
): MindMapNode {
  if (root.id === id) {
    return updater(root)
  }
  let changed = false
  const nextChildren = root.children.map((child) => {
    const next = updateNode(child, id, updater)
    if (next !== child) changed = true
    return next
  })
  if (!changed) return root
  return { ...root, children: nextChildren }
}

/**
 * Set a node's text.
 *
 * @param root - Tree root.
 * @param id - Id of the node to edit.
 * @param text - New text content.
 * @returns A new tree with the node's text updated.
 */
export function setNodeText(root: MindMapNode, id: string, text: string): MindMapNode {
  return updateNode(root, id, (node) => ({ ...node, text }))
}

/**
 * Toggle a node's `collapsed` flag.
 *
 * @param root - Tree root.
 * @param id - Id of the node to toggle.
 * @returns A new tree with the node's collapsed flag flipped.
 */
export function toggleCollapsed(root: MindMapNode, id: string): MindMapNode {
  return updateNode(root, id, (node) => ({ ...node, collapsed: !node.collapsed }))
}

/**
 * Append a child to the node with the given id. The new child is
 * pushed at the end of the children array. If the parent is currently
 * collapsed, it is automatically expanded so the new child is visible.
 *
 * @param root - Tree root.
 * @param parentId - Id of the parent that will receive the new child.
 * @param child - The child node to append.
 * @returns A new tree with the child appended (and the parent expanded).
 */
export function addChild(root: MindMapNode, parentId: string, child: MindMapNode): MindMapNode {
  return updateNode(root, parentId, (node) => ({
    ...node,
    collapsed: false,
    children: [...node.children, child],
  }))
}

/**
 * Remove the node with the given id (and its entire subtree) from the
 * tree. The root itself cannot be removed — passing the root id is a
 * no-op that returns the original tree.
 *
 * @param root - Tree root.
 * @param id - Id of the node to remove.
 * @returns A new tree with the node removed, or the original tree if
 *   `id` matches the root.
 */
export function removeNode(root: MindMapNode, id: string): MindMapNode {
  if (root.id === id) return root
  let changed = false
  const filtered: MindMapNode[] = []
  for (const child of root.children) {
    if (child.id === id) {
      changed = true
      continue
    }
    const next = removeNode(child, id)
    if (next !== child) changed = true
    filtered.push(next)
  }
  if (!changed) return root
  return { ...root, children: filtered }
}
