import { describe, expect, it } from 'vitest'

import {
  addChild,
  findNode,
  removeNode,
  setNodeText,
  toggleCollapsed,
  updateNode,
} from '../tree.js'
import type { MindMapNode } from '../types.js'

const tree = (id: string, text: string, children: MindMapNode[] = []): MindMapNode => ({
  id,
  text,
  children,
})

describe('findNode', () => {
  it('returns the node when present, null otherwise', () => {
    const root = tree('r', 'root', [tree('a', 'A', [tree('a1', 'A1')]), tree('b', 'B')])
    expect(findNode(root, 'a1')?.text).toBe('A1')
    expect(findNode(root, 'missing')).toBeNull()
  })
})

describe('updateNode', () => {
  it('clones only the path from root to target', () => {
    const root = tree('r', 'root', [tree('a', 'A'), tree('b', 'B', [tree('b1', 'B1')])])
    const next = updateNode(root, 'b1', (n) => ({ ...n, text: 'B1!' }))
    // Path clones.
    expect(next).not.toBe(root)
    expect(next.children[1]).not.toBe(root.children[1])
    expect(next.children[1].children[0]).not.toBe(root.children[1].children[0])
    // Untouched siblings reuse references.
    expect(next.children[0]).toBe(root.children[0])
    expect(findNode(next, 'b1')!.text).toBe('B1!')
  })

  it('returns the original tree when id is not found', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    const next = updateNode(root, 'missing', (n) => ({ ...n, text: 'X' }))
    expect(next).toBe(root)
  })
})

describe('setNodeText / toggleCollapsed', () => {
  it('setNodeText updates text', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    const next = setNodeText(root, 'a', 'A!')
    expect(findNode(next, 'a')!.text).toBe('A!')
  })

  it('toggleCollapsed flips the flag', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    const once = toggleCollapsed(root, 'a')
    expect(findNode(once, 'a')!.collapsed).toBe(true)
    const twice = toggleCollapsed(once, 'a')
    expect(findNode(twice, 'a')!.collapsed).toBe(false)
  })
})

describe('addChild', () => {
  it('appends and auto-expands', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    // Mark `r` collapsed first to verify auto-expand on add.
    const collapsedRoot = toggleCollapsed(root, 'r')
    const next = addChild(collapsedRoot, 'r', tree('c', 'C'))
    expect(next.collapsed).toBe(false)
    expect(next.children.map((n) => n.id)).toEqual(['a', 'c'])
  })
})

describe('removeNode', () => {
  it('removes the subtree', () => {
    const root = tree('r', 'root', [
      tree('a', 'A', [tree('a1', 'A1'), tree('a2', 'A2')]),
      tree('b', 'B'),
    ])
    const next = removeNode(root, 'a1')
    expect(findNode(next, 'a1')).toBeNull()
    expect(findNode(next, 'a2')).not.toBeNull()
  })

  it('refuses to remove the root', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    expect(removeNode(root, 'r')).toBe(root)
  })

  it('returns the original tree when id is not found', () => {
    const root = tree('r', 'root', [tree('a', 'A')])
    expect(removeNode(root, 'missing')).toBe(root)
  })
})
