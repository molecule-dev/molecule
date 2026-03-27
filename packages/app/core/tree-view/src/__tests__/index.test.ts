import { beforeEach, describe, expect, it } from 'vitest'

import type { TreeInstance, TreeNode, TreeOptions, TreeViewProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-tree-view', () => {
  beforeEach(() => {
    setProvider(null as unknown as TreeViewProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile TreeNode type', () => {
      const node: TreeNode<{ size: number }> = {
        id: 'file-1',
        label: 'document.ts',
        data: { size: 1024 },
        icon: 'file',
        expanded: false,
        selected: true,
        disabled: false,
      }
      expect(node.id).toBe('file-1')
      expect(node.data?.size).toBe(1024)
    })

    it('should compile TreeNode with children', () => {
      const node: TreeNode = {
        id: 'folder',
        label: 'src',
        children: [
          { id: 'child-1', label: 'index.ts' },
          { id: 'child-2', label: 'types.ts' },
        ],
      }
      expect(node.children).toHaveLength(2)
    })

    it('should compile TreeNode with minimal fields', () => {
      const node: TreeNode = { id: '1', label: 'Item' }
      expect(node.children).toBeUndefined()
    })

    it('should compile TreeOptions type', () => {
      const options: TreeOptions = {
        data: [{ id: '1', label: 'Root' }],
        onSelect: () => {},
        onExpand: () => {},
        multiSelect: true,
        draggable: true,
        onDrop: () => {},
        showCheckboxes: true,
      }
      expect(options.multiSelect).toBe(true)
    })

    it('should compile TreeInstance type', () => {
      const instance: TreeInstance = {
        getData: () => [],
        setData: () => {},
        expandNode: () => {},
        collapseNode: () => {},
        expandAll: () => {},
        collapseAll: () => {},
        selectNode: () => {},
        getSelectedNodes: () => [],
        destroy: () => {},
      }
      expect(instance.getData()).toEqual([])
    })

    it('should compile TreeViewProvider type', () => {
      const provider: TreeViewProvider = {
        name: 'test',
        createTree: <T>() => ({
          getData: () => [] as TreeNode<T>[],
          setData: () => {},
          expandNode: () => {},
          collapseNode: () => {},
          expandAll: () => {},
          collapseAll: () => {},
          selectNode: () => {},
          getSelectedNodes: () => [] as TreeNode<T>[],
          destroy: () => {},
        }),
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'TreeView provider not configured. Bond a tree-view provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: TreeViewProvider = {
        name: 'test-tree',
        createTree: <T>() => ({
          getData: () => [] as TreeNode<T>[],
          setData: () => {},
          expandNode: () => {},
          collapseNode: () => {},
          expandAll: () => {},
          collapseAll: () => {},
          selectNode: () => {},
          getSelectedNodes: () => [] as TreeNode<T>[],
          destroy: () => {},
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a tree instance', () => {
      const data: TreeNode[] = [
        {
          id: 'root',
          label: 'Root',
          children: [
            { id: 'child-1', label: 'Child 1' },
            { id: 'child-2', label: 'Child 2' },
          ],
        },
      ]
      const mockInstance: TreeInstance = {
        getData: () => data,
        setData: () => {},
        expandNode: () => {},
        collapseNode: () => {},
        expandAll: () => {},
        collapseAll: () => {},
        selectNode: () => {},
        getSelectedNodes: () => [],
        destroy: () => {},
      }
      const mockProvider: TreeViewProvider = {
        name: 'test',
        createTree: <T>() => mockInstance as TreeInstance<T>,
      }
      setProvider(mockProvider)

      const tree = requireProvider().createTree({ data })
      expect(tree.getData()).toHaveLength(1)
      expect(tree.getData()[0].children).toHaveLength(2)
    })
  })
})
