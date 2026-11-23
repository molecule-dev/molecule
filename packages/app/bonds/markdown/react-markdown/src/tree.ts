/**
 * The small structural view of the syntax tree react-markdown hands to a
 * plugin, plus the tree helpers this bond's remark and rehype steps share.
 *
 * The type is structural rather than `hast`'s or `mdast`'s own so the bond does
 * not depend on a package it does not ship; react-markdown's trees satisfy it.
 *
 * @module
 */

/** One node of a remark (mdast) or rehype (hast) tree. */
export interface TreeNode {
  /** Node kind: `root`, `element`, `text`, `code`, `break`, `raw`, … */
  type?: string

  /** Lowercase tag name, on an element. */
  tagName?: string

  /** Text content, on a text (or raw, or mdast code) node. */
  value?: string

  /** Element properties, keyed as hast spells them (`className`, `dataNote`, …). */
  properties?: Record<string, unknown>

  /** Child nodes, on a parent node. */
  children?: TreeNode[]
}

/**
 * Reports whether a node is an element.
 *
 * @param node - The tree node.
 * @returns `true` when the node is an `element`.
 */
export function isElement(node: TreeNode): boolean {
  return node.type === 'element'
}

/**
 * Concatenates the text a reader gets from a node: its own `value`, an image's
 * alt text, or the text of its children in order. Used to slug a heading's
 * rendered text (its code, emphasis, link text and image alt text included,
 * markup removed), as every markdown provider does.
 *
 * @param node - The tree node.
 * @returns The node's visible text.
 */
export function textOf(node: TreeNode): string {
  if (typeof node.value === 'string') {
    return node.value
  }
  if (node.type === 'element' && node.tagName === 'img') {
    const alt = node.properties?.alt
    return typeof alt === 'string' ? alt : ''
  }
  if (!Array.isArray(node.children)) {
    return ''
  }
  return node.children.map(textOf).join('')
}

/**
 * Visits every element in a tree, parents before children, in document order.
 *
 * @param node - The tree (or subtree) to visit.
 * @param visit - Called once per element.
 */
export function visitElements(node: TreeNode, visit: (element: TreeNode) => void): void {
  if (isElement(node)) {
    visit(node)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visitElements(child, visit)
    }
  }
}
