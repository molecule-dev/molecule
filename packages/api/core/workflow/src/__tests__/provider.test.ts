import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { WorkflowProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createWorkflow: typeof ProviderModule.createWorkflow
let getWorkflow: typeof ProviderModule.getWorkflow
let listWorkflows: typeof ProviderModule.listWorkflows
let startInstance: typeof ProviderModule.startInstance
let getInstance: typeof ProviderModule.getInstance
let transition: typeof ProviderModule.transition
let getState: typeof ProviderModule.getState
let getHistory: typeof ProviderModule.getHistory
let getAvailableActions: typeof ProviderModule.getAvailableActions

function makeMockProvider(overrides: Partial<WorkflowProvider> = {}): WorkflowProvider {
  return {
    name: 'test',
    createWorkflow: vi.fn(),
    getWorkflow: vi.fn(),
    listWorkflows: vi.fn(),
    startInstance: vi.fn(),
    getInstance: vi.fn(),
    transition: vi.fn(),
    getState: vi.fn(),
    getHistory: vi.fn(),
    getAvailableActions: vi.fn(),
    ...overrides,
  }
}

describe('workflow provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createWorkflow = providerModule.createWorkflow
    getWorkflow = providerModule.getWorkflow
    listWorkflows = providerModule.listWorkflows
    startInstance = providerModule.startInstance
    getInstance = providerModule.getInstance
    transition = providerModule.transition
    getState = providerModule.getState
    getHistory = providerModule.getHistory
    getAvailableActions = providerModule.getAvailableActions
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Workflow provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('createWorkflow', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        createWorkflow({ name: 'test', initialState: 'start', states: {} }),
      ).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const definition = {
        name: 'order',
        initialState: 'pending',
        states: {
          pending: { transitions: { confirm: { target: 'confirmed' } } },
          confirmed: { transitions: {}, final: true },
        },
      }
      const expected = {
        id: 'wf-1',
        ...definition,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const mockCreate = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ createWorkflow: mockCreate }))

      const result = await createWorkflow(definition)

      expect(mockCreate).toHaveBeenCalledWith(definition)
      expect(result).toBe(expected)
    })
  })

  describe('getWorkflow', () => {
    it('should throw when no provider is set', async () => {
      await expect(getWorkflow('wf-1')).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const expected = {
        id: 'wf-1',
        name: 'test',
        initialState: 'start',
        states: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const mockGet = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getWorkflow: mockGet }))

      const result = await getWorkflow('wf-1')

      expect(mockGet).toHaveBeenCalledWith('wf-1')
      expect(result).toBe(expected)
    })

    it('should return null when not found', async () => {
      const mockGet = vi.fn().mockResolvedValue(null)
      setProvider(makeMockProvider({ getWorkflow: mockGet }))

      const result = await getWorkflow('missing')

      expect(result).toBeNull()
    })
  })

  describe('listWorkflows', () => {
    it('should throw when no provider is set', async () => {
      await expect(listWorkflows()).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const expected = [
        {
          id: 'wf-1',
          name: 'test',
          initialState: 'start',
          states: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      const mockList = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ listWorkflows: mockList }))

      const result = await listWorkflows()

      expect(result).toBe(expected)
    })
  })

  describe('startInstance', () => {
    it('should throw when no provider is set', async () => {
      await expect(startInstance('wf-1')).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const expected = {
        id: 'inst-1',
        workflowId: 'wf-1',
        state: 'pending',
        data: { orderId: '123' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const mockStart = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ startInstance: mockStart }))

      const result = await startInstance('wf-1', { orderId: '123' })

      expect(mockStart).toHaveBeenCalledWith('wf-1', { orderId: '123' })
      expect(result).toBe(expected)
    })

    it('should work without initial data', async () => {
      const expected = {
        id: 'inst-1',
        workflowId: 'wf-1',
        state: 'start',
        data: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const mockStart = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ startInstance: mockStart }))

      const result = await startInstance('wf-1')

      expect(mockStart).toHaveBeenCalledWith('wf-1', undefined)
      expect(result).toBe(expected)
    })
  })

  describe('getInstance', () => {
    it('should throw when no provider is set', async () => {
      await expect(getInstance('inst-1')).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const expected = {
        id: 'inst-1',
        workflowId: 'wf-1',
        state: 'pending',
        data: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const mockGet = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getInstance: mockGet }))

      const result = await getInstance('inst-1')

      expect(mockGet).toHaveBeenCalledWith('inst-1')
      expect(result).toBe(expected)
    })

    it('should return null when not found', async () => {
      const mockGet = vi.fn().mockResolvedValue(null)
      setProvider(makeMockProvider({ getInstance: mockGet }))

      expect(await getInstance('missing')).toBeNull()
    })
  })

  describe('transition', () => {
    it('should throw when no provider is set', async () => {
      await expect(transition('inst-1', 'confirm')).rejects.toThrow(
        'Workflow provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const expected = {
        id: 'inst-1',
        workflowId: 'wf-1',
        state: 'confirmed',
        data: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const mockTransition = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ transition: mockTransition }))

      const result = await transition('inst-1', 'confirm', { note: 'approved' })

      expect(mockTransition).toHaveBeenCalledWith('inst-1', 'confirm', { note: 'approved' })
      expect(result).toBe(expected)
    })
  })

  describe('getState', () => {
    it('should throw when no provider is set', async () => {
      await expect(getState('inst-1')).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const mockGetState = vi.fn().mockResolvedValue('confirmed')
      setProvider(makeMockProvider({ getState: mockGetState }))

      const result = await getState('inst-1')

      expect(mockGetState).toHaveBeenCalledWith('inst-1')
      expect(result).toBe('confirmed')
    })
  })

  describe('getHistory', () => {
    it('should throw when no provider is set', async () => {
      await expect(getHistory('inst-1')).rejects.toThrow('Workflow provider not configured')
    })

    it('should delegate to provider', async () => {
      const expected = [
        {
          id: 'evt-1',
          instanceId: 'inst-1',
          action: 'confirm',
          fromState: 'pending',
          toState: 'confirmed',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]
      const mockGetHistory = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getHistory: mockGetHistory }))

      const result = await getHistory('inst-1')

      expect(mockGetHistory).toHaveBeenCalledWith('inst-1')
      expect(result).toBe(expected)
    })
  })

  describe('getAvailableActions', () => {
    it('should throw when no provider is set', async () => {
      await expect(getAvailableActions('inst-1')).rejects.toThrow(
        'Workflow provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const expected = ['confirm', 'cancel']
      const mockGetActions = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getAvailableActions: mockGetActions }))

      const result = await getAvailableActions('inst-1')

      expect(mockGetActions).toHaveBeenCalledWith('inst-1')
      expect(result).toBe(expected)
    })
  })
})
