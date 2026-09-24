/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real default tree bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-tree-view-default'

import type { TreeNode } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

interface FileMeta {
  path: string
}

describe('README @example', () => {
  it('expands, selects and moves nodes, reporting the move via onDrop', () => {
    setProvider(provider)

    const files: TreeNode<FileMeta>[] = [
      {
        id: 'src',
        label: 'src',
        data: { path: 'src' },
        children: [
          { id: 'main', label: 'main.ts', data: { path: 'src/main.ts' } },
          { id: 'util', label: 'util.ts', data: { path: 'src/util.ts' } },
        ],
      },
      { id: 'readme', label: 'README.md', data: { path: 'README.md' } },
    ]

    let openPath = ''
    const drops: string[] = []
    const tree = requireProvider().createTree<FileMeta>({
      data: files,
      draggable: true,
      onSelect: (node) => {
        openPath = node.data?.path ?? ''
      },
      onDrop: (source, target, position) => drops.push(`${source.id} ${position} ${target.id}`),
    })

    tree.expandNode('src')
    tree.selectNode('main')
    expect(tree.moveNode('readme', 'src', 'inside')).toBe(true)
    expect(drops).toEqual(['readme inside src'])

    const src = tree.getData()[0]
    expect(openPath).toBe('src/main.ts')
    expect(src?.expanded).toBe(true)
    expect(src?.children?.map((node) => node.label)).toEqual(['main.ts', 'util.ts', 'README.md'])
    expect(tree.getData()).toHaveLength(1)
    expect(tree.getSelectedNodes().map((node) => node.id)).toEqual(['main'])

    // The caller's array was copied, not mutated.
    expect(files).toHaveLength(2)
    expect(files[0]?.expanded).toBeUndefined()

    tree.destroy()
    expect(tree.getData()).toEqual([])
  })
})
