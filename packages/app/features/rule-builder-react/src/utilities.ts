/**
 * Pure rule-tree utilities — id generation + immutable update helpers.
 *
 * Kept free of React so they're trivial to unit-test and to reuse from
 * non-React consumers (e.g. server-side validation, CLI tooling).
 *
 * @module
 */

import type { Rule, RuleGroup, RuleGroupOp, RuleLeaf } from './types.js'

/**
 * Generate a short non-cryptographic id. Sufficient for React keys and
 * in-memory rule identity within a single editing session.
 *
 * @returns A short random id.
 */
export function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Build a fresh empty leaf — used when the user clicks "Add condition".
 *
 * @returns A new leaf with all fields blank and a fresh id.
 */
export function emptyLeaf(): RuleLeaf {
  return { kind: 'leaf', id: makeId(), field: '', op: '' }
}

/**
 * Build a fresh empty group — used when the user clicks "Add group".
 *
 * @param op - Initial group operator, defaults to `'AND'`.
 * @returns A new group with one empty leaf already inside.
 */
export function emptyGroup(op: RuleGroupOp = 'AND'): RuleGroup {
  return { kind: 'group', id: makeId(), op, children: [emptyLeaf()] }
}

/**
 * Replace `target` (matched by id) anywhere in the tree with `replacement`.
 *
 * @param tree - Root of the rule tree.
 * @param targetId - Id of the rule to replace.
 * @param replacement - Replacement rule (same id is not required).
 * @returns New tree with the replacement applied.
 */
export function replaceById(tree: Rule, targetId: string, replacement: Rule): Rule {
  if (tree.id === targetId) return replacement
  if (tree.kind === 'leaf') return tree
  return {
    ...tree,
    children: tree.children.map((c) => replaceById(c, targetId, replacement)),
  }
}

/**
 * Remove the rule with id `targetId` from the tree. The root itself
 * cannot be removed — when `targetId` matches the root, the tree is
 * returned unchanged.
 *
 * @param tree - Root of the rule tree.
 * @param targetId - Id of the rule to remove.
 * @returns New tree with the rule removed (or the original tree if no match).
 */
export function removeById(tree: Rule, targetId: string): Rule {
  if (tree.kind === 'leaf') return tree
  return {
    ...tree,
    children: tree.children.filter((c) => c.id !== targetId).map((c) => removeById(c, targetId)),
  }
}

/**
 * Append `child` to the children of the group identified by `groupId`.
 * If the id doesn't match any group, returns the tree unchanged.
 *
 * @param tree - Root of the rule tree.
 * @param groupId - Id of the group to append to.
 * @param child - Rule to append.
 * @returns New tree with the child appended.
 */
export function appendToGroup(tree: Rule, groupId: string, child: Rule): Rule {
  if (tree.kind === 'leaf') return tree
  if (tree.id === groupId) {
    return { ...tree, children: [...tree.children, child] }
  }
  return {
    ...tree,
    children: tree.children.map((c) => appendToGroup(c, groupId, child)),
  }
}

/**
 * Toggle a group's `op` between `'AND'` and `'OR'`.
 *
 * @param tree - Root of the rule tree.
 * @param groupId - Id of the group to toggle.
 * @returns New tree with the group's op flipped (or the original tree if no match).
 */
export function toggleGroupOp(tree: Rule, groupId: string): Rule {
  if (tree.kind === 'leaf') return tree
  if (tree.id === groupId) {
    return { ...tree, op: tree.op === 'AND' ? 'OR' : 'AND' }
  }
  return {
    ...tree,
    children: tree.children.map((c) => toggleGroupOp(c, groupId)),
  }
}
