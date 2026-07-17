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

  describe('checkboxes (showCheckboxes)', () => {
    it('should check and uncheck a node when showCheckboxes is enabled', () => {
      const tree = provider.createTree({ data: sampleData, showCheckboxes: true })
      tree.toggleChecked('child-1')
      let checked = tree.getCheckedNodes()
      expect(checked).toHaveLength(1)
      expect(checked[0].id).toBe('child-1')
      // Toggling again clears it.
      tree.toggleChecked('child-1')
      checked = tree.getCheckedNodes()
      expect(checked).toHaveLength(0)
    })

    it('should reflect checked state in getData when enabled', () => {
      const tree = provider.createTree({ data: sampleData, showCheckboxes: true })
      tree.toggleChecked('root')
      expect(tree.getData()[0].checked).toBe(true)
    })

    it('should allow multiple independent checked nodes when enabled', () => {
      const tree = provider.createTree({ data: sampleData, showCheckboxes: true })
      tree.toggleChecked('child-1')
      tree.toggleChecked('grandchild-1')
      const checked = tree.getCheckedNodes()
      expect(checked.map((n) => n.id).sort()).toEqual(['child-1', 'grandchild-1'])
    })

    it('should keep checked state independent of selection', () => {
      const tree = provider.createTree({ data: sampleData, showCheckboxes: true })
      tree.selectNode('child-1')
      tree.toggleChecked('child-2')
      expect(tree.getSelectedNodes().map((n) => n.id)).toEqual(['child-1'])
      expect(tree.getCheckedNodes().map((n) => n.id)).toEqual(['child-2'])
    })

    it('should be a no-op when showCheckboxes is disabled', () => {
      const tree = provider.createTree({ data: sampleData })
      tree.toggleChecked('child-1')
      expect(tree.getCheckedNodes()).toHaveLength(0)
      expect(tree.getData()[0].children![0].checked).toBeFalsy()
    })

    it('should not check disabled nodes even when enabled', () => {
      const tree = provider.createTree({
        data: [{ id: 'disabled', label: 'Disabled', disabled: true }],
        showCheckboxes: true,
      })
      tree.toggleChecked('disabled')
      expect(tree.getCheckedNodes()).toHaveLength(0)
    })
  })

  describe('drag and drop (draggable / onDrop)', () => {
    it('should reorder a node as a sibling and fire onDrop when draggable', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      // Move child-1 to after child-2 within the root's children.
      const moved = tree.moveNode('child-1', 'child-2', 'after')
      expect(moved).toBe(true)
      expect(onDrop).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'child-1' }),
        expect.objectContaining({ id: 'child-2' }),
        'after',
      )
      const rootChildren = tree.getData()[0].children!
      expect(rootChildren.map((n) => n.id)).toEqual(['child-2', 'child-1'])
    })

    it('should reparent a node inside a target when draggable', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      const moved = tree.moveNode('child-1', 'child-2', 'inside')
      expect(moved).toBe(true)
      const data = tree.getData()
      const rootChildren = data[0].children!
      // child-1 is no longer a direct child of root.
      expect(rootChildren.map((n) => n.id)).toEqual(['child-2'])
      // child-1 now nested under child-2 alongside its existing grandchild.
      expect(rootChildren[0].children!.map((n) => n.id).sort()).toEqual(['child-1', 'grandchild-1'])
      expect(onDrop).toHaveBeenCalledOnce()
    })

    it('should move a node up to root level with position before', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      const moved = tree.moveNode('grandchild-1', 'root', 'before')
      expect(moved).toBe(true)
      expect(tree.getData().map((n) => n.id)).toEqual(['grandchild-1', 'root'])
    })

    it('should not move or fire onDrop when draggable is disabled', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, onDrop })
      const moved = tree.moveNode('child-1', 'child-2', 'after')
      expect(moved).toBe(false)
      expect(onDrop).not.toHaveBeenCalled()
      // Tree order unchanged.
      expect(tree.getData()[0].children!.map((n) => n.id)).toEqual(['child-1', 'child-2'])
    })

    it('should reject moving a node onto itself', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      expect(tree.moveNode('child-1', 'child-1', 'after')).toBe(false)
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('should reject moving a node into its own descendant', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      // child-2 contains grandchild-1; moving child-2 inside grandchild-1 must reject.
      expect(tree.moveNode('child-2', 'grandchild-1', 'inside')).toBe(false)
      expect(onDrop).not.toHaveBeenCalled()
      // Tree structure preserved.
      expect(tree.getData()[0].children!.map((n) => n.id)).toEqual(['child-1', 'child-2'])
    })

    it('should reject a move to an unknown target', () => {
      const onDrop = vi.fn()
      const tree = provider.createTree({ data: sampleData, draggable: true, onDrop })
      expect(tree.moveNode('child-1', 'nope', 'after')).toBe(false)
      expect(onDrop).not.toHaveBeenCalled()
    })
  })
})
