const { mockCreate, mockFindById, mockFindMany, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values: unknown, opts: { defaultValue: string }) => opts.defaultValue),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '../provider.js'

const STATES_JSON = JSON.stringify({
  pending: { transitions: { confirm: { target: 'confirmed' }, cancel: { target: 'cancelled' } } },
  confirmed: { transitions: { ship: { target: 'shipped' } }, final: false },
  shipped: { transitions: { deliver: { target: 'delivered' } } },
  cancelled: { transitions: {}, final: true },
  delivered: { transitions: {}, final: true },
})

const WORKFLOW_ROW = {
  id: 'wf-1',
  name: 'order-lifecycle',
  initialState: 'pending',
  states: STATES_JSON,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const INSTANCE_ROW = {
  id: 'inst-1',
  workflowId: 'wf-1',
  state: 'pending',
  data: JSON.stringify({ orderId: '123' }),
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('@molecule/api-workflow-database provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have name "database"', () => {
    expect(provider.name).toBe('database')
  })

  describe('createWorkflow', () => {
    it('should create a workflow definition', async () => {
      mockCreate.mockResolvedValueOnce({ data: WORKFLOW_ROW })

      const result = await provider.createWorkflow({
        name: 'order-lifecycle',
        initialState: 'pending',
        states: JSON.parse(STATES_JSON),
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'workflows',
        expect.objectContaining({
          name: 'order-lifecycle',
          initialState: 'pending',
        }),
      )
      expect(result.id).toBe('wf-1')
      expect(result.name).toBe('order-lifecycle')
      expect(typeof result.states).toBe('object')
      expect(result.states.pending).toBeDefined()
    })
  })

  describe('getWorkflow', () => {
    it('should return a workflow by ID', async () => {
      mockFindById.mockResolvedValueOnce(WORKFLOW_ROW)

      const result = await provider.getWorkflow('wf-1')

      expect(mockFindById).toHaveBeenCalledWith('workflows', 'wf-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('wf-1')
      expect(result!.states.pending).toBeDefined()
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const result = await provider.getWorkflow('missing')

      expect(result).toBeNull()
    })
  })

  describe('listWorkflows', () => {
    it('should return all workflows', async () => {
      mockFindMany.mockResolvedValueOnce([WORKFLOW_ROW])

      const result = await provider.listWorkflows()

      expect(mockFindMany).toHaveBeenCalledWith('workflows', {
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('wf-1')
    })

    it('should return empty array when none exist', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const result = await provider.listWorkflows()

      expect(result).toEqual([])
    })
  })

  describe('startInstance', () => {
    it('should create a new instance in the initial state', async () => {
      mockFindById.mockResolvedValueOnce(WORKFLOW_ROW)
      mockCreate.mockResolvedValueOnce({ data: INSTANCE_ROW })

      const result = await provider.startInstance('wf-1', { orderId: '123' })

      expect(mockFindById).toHaveBeenCalledWith('workflows', 'wf-1')
      expect(mockCreate).toHaveBeenCalledWith(
        'workflow_instances',
        expect.objectContaining({
          workflowId: 'wf-1',
          state: 'pending',
          data: JSON.stringify({ orderId: '123' }),
        }),
      )
      expect(result.state).toBe('pending')
      expect(result.data.orderId).toBe('123')
    })

    it('should use empty data when none provided', async () => {
      mockFindById.mockResolvedValueOnce(WORKFLOW_ROW)
      mockCreate.mockResolvedValueOnce({
        data: { ...INSTANCE_ROW, data: '{}' },
      })

      const result = await provider.startInstance('wf-1')

      expect(mockCreate).toHaveBeenCalledWith(
        'workflow_instances',
        expect.objectContaining({ data: '{}' }),
      )
      expect(result.data).toEqual({})
    })

    it('should throw when workflow not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      await expect(provider.startInstance('missing')).rejects.toThrow(
        "Workflow 'missing' not found",
      )
    })
  })

  describe('getInstance', () => {
    it('should return an instance by ID', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW)

      const result = await provider.getInstance('inst-1')

      expect(result).not.toBeNull()
      expect(result!.state).toBe('pending')
      expect(result!.data.orderId).toBe('123')
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      expect(await provider.getInstance('missing')).toBeNull()
    })
  })

  describe('transition', () => {
    it('should transition from one state to another', async () => {
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW) // getInstance
        .mockResolvedValueOnce(WORKFLOW_ROW) // getWorkflow
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} }) // event

      const result = await provider.transition('inst-1', 'confirm', { note: 'approved' })

      expect(mockUpdateById).toHaveBeenCalledWith(
        'workflow_instances',
        'inst-1',
        expect.objectContaining({ state: 'confirmed' }),
      )
      expect(mockCreate).toHaveBeenCalledWith(
        'workflow_events',
        expect.objectContaining({
          instanceId: 'inst-1',
          action: 'confirm',
          fromState: 'pending',
          toState: 'confirmed',
        }),
      )
      expect(result.state).toBe('confirmed')
      expect(result.data.orderId).toBe('123')
      expect(result.data.note).toBe('approved')
    })

    it('should work without additional data', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(WORKFLOW_ROW)
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} })

      const result = await provider.transition('inst-1', 'confirm')

      expect(result.state).toBe('confirmed')
      expect(result.data).toEqual({ orderId: '123' })
    })

    it('should throw when instance not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      await expect(provider.transition('missing', 'confirm')).rejects.toThrow(
        "Workflow instance 'missing' not found",
      )
    })

    it('should throw when workflow not found', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(null) // workflow missing
      await expect(provider.transition('inst-1', 'confirm')).rejects.toThrow(
        "Workflow 'wf-1' not found",
      )
    })

    it('should throw when action is not available', async () => {
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW) // pending state
        .mockResolvedValueOnce(WORKFLOW_ROW)

      await expect(provider.transition('inst-1', 'deliver')).rejects.toThrow(
        "Action 'deliver' is not available from state 'pending'",
      )
    })

    it('should throw when current state not in workflow definition', async () => {
      mockFindById
        .mockResolvedValueOnce({ ...INSTANCE_ROW, state: 'unknown-state' })
        .mockResolvedValueOnce(WORKFLOW_ROW)

      await expect(provider.transition('inst-1', 'confirm')).rejects.toThrow(
        "State 'unknown-state' not found in workflow definition",
      )
    })
  })

  describe('getState', () => {
    it('should return current state', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW)

      const state = await provider.getState('inst-1')

      expect(state).toBe('pending')
    })

    it('should throw when instance not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      await expect(provider.getState('missing')).rejects.toThrow(
        "Workflow instance 'missing' not found",
      )
    })
  })

  describe('getHistory', () => {
    it('should return event history', async () => {
      const eventRow = {
        id: 'evt-1',
        instanceId: 'inst-1',
        action: 'confirm',
        fromState: 'pending',
        toState: 'confirmed',
        data: JSON.stringify({ note: 'approved' }),
        createdAt: '2024-01-01T01:00:00Z',
      }
      mockFindMany.mockResolvedValueOnce([eventRow])

      const result = await provider.getHistory('inst-1')

      expect(mockFindMany).toHaveBeenCalledWith('workflow_events', {
        where: [{ field: 'instanceId', operator: '=', value: 'inst-1' }],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      })
      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('confirm')
      expect(result[0].data).toEqual({ note: 'approved' })
    })

    it('should return empty array when no events', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const result = await provider.getHistory('inst-1')

      expect(result).toEqual([])
    })

    it('should handle events with null data', async () => {
      const eventRow = {
        id: 'evt-1',
        instanceId: 'inst-1',
        action: 'confirm',
        fromState: 'pending',
        toState: 'confirmed',
        data: null,
        createdAt: '2024-01-01T01:00:00Z',
      }
      mockFindMany.mockResolvedValueOnce([eventRow])

      const result = await provider.getHistory('inst-1')

      expect(result[0].data).toBeUndefined()
    })
  })

  describe('getAvailableActions', () => {
    it('should return available actions from current state', async () => {
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW) // pending state
        .mockResolvedValueOnce(WORKFLOW_ROW)

      const result = await provider.getAvailableActions('inst-1')

      expect(result).toEqual(['confirm', 'cancel'])
    })

    it('should return empty array for final states', async () => {
      mockFindById
        .mockResolvedValueOnce({ ...INSTANCE_ROW, state: 'delivered' })
        .mockResolvedValueOnce(WORKFLOW_ROW)

      const result = await provider.getAvailableActions('inst-1')

      expect(result).toEqual([])
    })

    it('should throw when instance not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      await expect(provider.getAvailableActions('missing')).rejects.toThrow(
        "Workflow instance 'missing' not found",
      )
    })

    it('should throw when workflow not found', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(null)

      await expect(provider.getAvailableActions('inst-1')).rejects.toThrow(
        "Workflow 'wf-1' not found",
      )
    })

    it('should return empty array for unknown state', async () => {
      mockFindById
        .mockResolvedValueOnce({ ...INSTANCE_ROW, state: 'unknown' })
        .mockResolvedValueOnce(WORKFLOW_ROW)

      const result = await provider.getAvailableActions('inst-1')

      expect(result).toEqual([])
    })
  })
})
