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
import {
  clearWorkflowHandlers,
  registerAction,
  registerGuard,
  registerHook,
  WorkflowGuardRejectedError,
} from '../registry.js'

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

// Real PostgreSQL `jsonb` (and MySQL `json`) columns are returned by the driver
// ALREADY PARSED — a JS object, not a JSON string. The SQLite-shaped rows above
// exercise the defensive string path; these mirror what node-postgres actually
// hands back so the tests catch the `JSON.parse([object Object])` crash the old
// unconditional-parse code would throw against a real Postgres database.
const WORKFLOW_ROW_PARSED = {
  ...WORKFLOW_ROW,
  states: JSON.parse(STATES_JSON) as Record<string, unknown>,
}

const INSTANCE_ROW_PARSED = {
  ...INSTANCE_ROW,
  data: { orderId: '123' } as Record<string, unknown>,
}

describe('@molecule/api-workflow-database provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearWorkflowHandlers()
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

  // guard / action / onEnter / onExit are string IDENTIFIERS in the definition;
  // transition() evaluates them against the pluggable handler registry. These
  // prove: a failing guard blocks + reports the transition (no write); a passing
  // guard receives the context; onExit → action → onEnter fire in that order via
  // the registry; action mutations persist; and a referenced-but-unregistered
  // handler is reported, never silently skipped.
  describe('transition guard/action/hook evaluation', () => {
    const HOOKED_STATES = JSON.stringify({
      pending: {
        transitions: {
          confirm: { target: 'confirmed', guard: 'canConfirm', action: 'recordConfirm' },
        },
        onExit: 'leavePending',
      },
      confirmed: { transitions: {}, onEnter: 'enterConfirmed', final: true },
    })
    const HOOKED_WORKFLOW_ROW = { ...WORKFLOW_ROW, states: HOOKED_STATES }

    it('runs a passing guard with the transition context and allows the transition', async () => {
      const guard = vi.fn(() => true)
      registerGuard('canConfirm', guard)
      registerHook('leavePending', vi.fn())
      registerAction('recordConfirm', vi.fn())
      registerHook('enterConfirmed', vi.fn())
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(HOOKED_WORKFLOW_ROW)
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} })

      const result = await provider.transition('inst-1', 'confirm', { paid: true })

      expect(guard).toHaveBeenCalledTimes(1)
      expect(guard).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: 'inst-1',
          workflowId: 'wf-1',
          action: 'confirm',
          fromState: 'pending',
          toState: 'confirmed',
          data: expect.objectContaining({ orderId: '123', paid: true }),
        }),
      )
      expect(result.state).toBe('confirmed')
      expect(mockUpdateById).toHaveBeenCalledWith(
        'workflow_instances',
        'inst-1',
        expect.objectContaining({ state: 'confirmed' }),
      )
    })

    it('blocks and reports the transition when the guard returns false, writing nothing', async () => {
      const onExit = vi.fn()
      const action = vi.fn()
      const onEnter = vi.fn()
      registerGuard('canConfirm', () => false)
      registerHook('leavePending', onExit)
      registerAction('recordConfirm', action)
      registerHook('enterConfirmed', onEnter)
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(HOOKED_WORKFLOW_ROW)

      const error = await provider.transition('inst-1', 'confirm').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(WorkflowGuardRejectedError)
      expect(error).toMatchObject({ instanceId: 'inst-1', action: 'confirm', guard: 'canConfirm' })
      // A blocked transition is reported, never silently applied: no side-effects,
      // no state update, no event recorded.
      expect(onExit).not.toHaveBeenCalled()
      expect(action).not.toHaveBeenCalled()
      expect(onEnter).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('awaits an async guard and blocks on a falsy resolution', async () => {
      registerGuard('canConfirm', () => Promise.resolve(false))
      registerHook('leavePending', vi.fn())
      registerAction('recordConfirm', vi.fn())
      registerHook('enterConfirmed', vi.fn())
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(HOOKED_WORKFLOW_ROW)

      await expect(provider.transition('inst-1', 'confirm')).rejects.toBeInstanceOf(
        WorkflowGuardRejectedError,
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('invokes onExit → action → onEnter in order on a successful transition', async () => {
      const calls: string[] = []
      registerGuard('canConfirm', () => true)
      registerHook('leavePending', () => {
        calls.push('onExit')
      })
      registerAction('recordConfirm', () => {
        calls.push('action')
      })
      registerHook('enterConfirmed', () => {
        calls.push('onEnter')
      })
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(HOOKED_WORKFLOW_ROW)
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} })

      await provider.transition('inst-1', 'confirm')

      expect(calls).toEqual(['onExit', 'action', 'onEnter'])
    })

    it('persists data mutated by an action handler', async () => {
      const states = JSON.stringify({
        pending: { transitions: { confirm: { target: 'confirmed', action: 'recordConfirm' } } },
        confirmed: { transitions: {}, final: true },
      })
      registerAction('recordConfirm', (ctx) => {
        ctx.data.confirmedAt = '2024-02-02T00:00:00Z'
      })
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW)
        .mockResolvedValueOnce({ ...WORKFLOW_ROW, states })
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} })

      const result = await provider.transition('inst-1', 'confirm')

      expect(result.data.confirmedAt).toBe('2024-02-02T00:00:00Z')
      expect(mockUpdateById).toHaveBeenCalledWith(
        'workflow_instances',
        'inst-1',
        expect.objectContaining({
          data: JSON.stringify({ orderId: '123', confirmedAt: '2024-02-02T00:00:00Z' }),
        }),
      )
    })

    it('throws when a referenced guard has no registered handler (never silently allowed)', async () => {
      // canConfirm is NOT registered.
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW).mockResolvedValueOnce(HOOKED_WORKFLOW_ROW)

      await expect(provider.transition('inst-1', 'confirm')).rejects.toThrow(/Guard 'canConfirm'/)
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('resolves all hooks up front so a missing onEnter never half-runs onExit/action', async () => {
      const onExit = vi.fn()
      const action = vi.fn()
      registerHook('leavePending', onExit)
      registerAction('recordConfirm', action)
      // enterConfirmed is NOT registered.
      const states = JSON.stringify({
        pending: {
          transitions: { confirm: { target: 'confirmed', action: 'recordConfirm' } },
          onExit: 'leavePending',
        },
        confirmed: { transitions: {}, onEnter: 'enterConfirmed', final: true },
      })
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW)
        .mockResolvedValueOnce({ ...WORKFLOW_ROW, states })

      await expect(provider.transition('inst-1', 'confirm')).rejects.toThrow(/enterConfirmed/)
      expect(onExit).not.toHaveBeenCalled()
      expect(action).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
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

  // These prove the round-trip is correct against a REAL Postgres `jsonb` column:
  // the driver returns the value already parsed (an object), so the provider must
  // NOT `JSON.parse` it. Every case here would throw
  // `SyntaxError: "[object Object]" is not valid JSON` against the old
  // unconditional-`JSON.parse` code; the string-shaped rows in the suites above
  // still cover the defensive path where a driver hands back a JSON string.
  describe('jsonb round-trip (pre-parsed objects, as real Postgres returns)', () => {
    it('getWorkflow should use an already-parsed states object as-is', async () => {
      mockFindById.mockResolvedValueOnce(WORKFLOW_ROW_PARSED)

      const result = await provider.getWorkflow('wf-1')

      expect(result).not.toBeNull()
      expect(typeof result!.states).toBe('object')
      expect(result!.states.pending).toBeDefined()
      expect(result!.states.pending.transitions.confirm.target).toBe('confirmed')
    })

    it('listWorkflows should deserialize already-parsed states objects', async () => {
      mockFindMany.mockResolvedValueOnce([WORKFLOW_ROW_PARSED])

      const result = await provider.listWorkflows()

      expect(result).toHaveLength(1)
      expect(result[0].states.pending).toBeDefined()
    })

    it('getInstance should use an already-parsed data object as-is', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW_PARSED)

      const result = await provider.getInstance('inst-1')

      expect(result).not.toBeNull()
      expect(result!.data.orderId).toBe('123')
    })

    it('startInstance should deserialize the created instance when data comes back parsed', async () => {
      mockFindById.mockResolvedValueOnce(WORKFLOW_ROW_PARSED)
      mockCreate.mockResolvedValueOnce({ data: INSTANCE_ROW_PARSED })

      const result = await provider.startInstance('wf-1', { orderId: '123' })

      expect(result.state).toBe('pending')
      expect(result.data.orderId).toBe('123')
    })

    it('transition should merge into an already-parsed data object without re-parsing', async () => {
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW_PARSED) // getInstance
        .mockResolvedValueOnce(WORKFLOW_ROW_PARSED) // getWorkflow
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: {} }) // event

      const result = await provider.transition('inst-1', 'confirm', { note: 'approved' })

      expect(result.state).toBe('confirmed')
      expect(result.data.orderId).toBe('123')
      expect(result.data.note).toBe('approved')
    })

    it('getState should read an instance whose data column is already parsed', async () => {
      mockFindById.mockResolvedValueOnce(INSTANCE_ROW_PARSED)

      expect(await provider.getState('inst-1')).toBe('pending')
    })

    it('getAvailableActions should read already-parsed states', async () => {
      mockFindById
        .mockResolvedValueOnce(INSTANCE_ROW_PARSED)
        .mockResolvedValueOnce(WORKFLOW_ROW_PARSED)

      const result = await provider.getAvailableActions('inst-1')

      expect(result).toEqual(['confirm', 'cancel'])
    })

    it('getHistory should use an already-parsed event data object as-is', async () => {
      const eventRow = {
        id: 'evt-1',
        instanceId: 'inst-1',
        action: 'confirm',
        fromState: 'pending',
        toState: 'confirmed',
        data: { note: 'approved' } as Record<string, unknown>,
        createdAt: '2024-01-01T01:00:00Z',
      }
      mockFindMany.mockResolvedValueOnce([eventRow])

      const result = await provider.getHistory('inst-1')

      expect(result).toHaveLength(1)
      expect(result[0].data).toEqual({ note: 'approved' })
    })
  })
})
