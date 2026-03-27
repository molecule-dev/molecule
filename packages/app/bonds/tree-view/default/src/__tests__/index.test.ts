import { describe, expect, it, vi } from 'vitest'

import type { TreeViewProvider } from '@molecule/app-tree-view'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-tree-view-default', () => {
  const sampleData = [
    {
      id: 'root',
      label: 'Root',
      children: [
        { id: 'child-1', label: 'Child 1' },
        {
          id: 'child-2',
          label: 'Child 2',
          children: [{ id: 'grandchild-1', label: 'Grandchild 1' }],
        },
      ],
    },
  ]

  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('default')
    })

    it('should conform to TreeViewProvider interface', () => {
      const p: TreeViewProvider = provider
      expect(typeof p.createTree).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('default')
    })

    it('should create a provider with expandAll config', () => {
      const p = createProvider({ expandAll: true })
      const tree = p.createTree({ data: sampleData })
      const data = tree.getData()
      expect(data[0].expanded).toBe(true)
    })
  })

  describe('tree instance', () => {
    it('should create a tree with data', () => {
      const tree = provider.createTree({ data: sampleData })
      const data = tree.getData()
      expect(data).toHaveLength(1)
      expect(data[0].children).toHaveLength(2)
    })

    it('should not mutate original data', () => {
      const tree = provider.createTree({ data: sampleData })
      const data = tree.getData()
      data[0].label = 'MODIFIED'
      expect(tree.getData()[0].label).toBe('Root')
    })

    it('should set new data', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.setData([{ id: 'new', label: 'New Root' }])
      expect(tree.getData()).toHaveLength(1)
      expect(tree.getData()[0].id).toBe('new')
    })

    it('should expand a node', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.expandNode('root')
      const data = tree.getData()
      expect(data[0].expanded).toBe(true)
    })

    it('should collapse a node', () => {
      const tree = provider.createTree({
        data: [{ id: 'root', label: 'Root', expanded: true }],
      })
      tree.collapseNode('root')
      expect(tree.getData()[0].expanded).toBe(false)
    })

    it('should expand all nodes', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.expandAll()
      const data = tree.getData()
      expect(data[0].expanded).toBe(true)
      expect(data[0].children![1].expanded).toBe(true)
    })

    it('should collapse all nodes', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.expandAll()
      tree.collapseAll()
      const data = tree.getData()
      expect(data[0].expanded).toBe(false)
    })

    it('should select a node', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.selectNode('child-1')
      const selected = tree.getSelectedNodes()
      expect(selected).toHaveLength(1)
      expect(selected[0].id).toBe('child-1')
    })

    it('should deselect others in single-select mode', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.selectNode('child-1')
      tree.selectNode('child-2')
      const selected = tree.getSelectedNodes()
      expect(selected).toHaveLength(1)
      expect(selected[0].id).toBe('child-2')
    })

    it('should allow multi-select', () => {
      const tree = provider.createTree({ data: sampleData, multiSelect: true })
      tree.selectNode('child-1')
      tree.selectNode('child-2')
      const selected = tree.getSelectedNodes()
      expect(selected).toHaveLength(2)
    })

    it('should not select disabled nodes', () => {
      const tree = provider.createTree({
        data: [{ id: 'disabled', label: 'Disabled', disabled: true }],
      })
      tree.selectNode('disabled')
      expect(tree.getSelectedNodes()).toHaveLength(0)
    })

    it('should call onSelect callback', () => {
      const onSelect = vi.fn()
      const tree = provider.createTree({ data: sampleData, onSelect })
      tree.selectNode('child-1')
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'child-1' }))
    })

    it('should call onExpand callback', () => {
      const onExpand = vi.fn()
      const tree = provider.createTree({ data: sampleData, onExpand })
      tree.expandNode('root')
      expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }))
    })

    it('should destroy and clear data', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.destroy()
      expect(tree.getData()).toHaveLength(0)
    })

    it('should select nested nodes', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.selectNode('grandchild-1')
      const selected = tree.getSelectedNodes()
      expect(selected).toHaveLength(1)
      expect(selected[0].id).toBe('grandchild-1')
    })
  })
})
