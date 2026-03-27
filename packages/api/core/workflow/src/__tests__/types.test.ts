import { describe, expect, it, vi } from 'vitest'

import type {
  StateDefinition,
  TransitionDefinition,
  Workflow,
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowInstance,
  WorkflowProvider,
} from '../types.js'

describe('workflow types', () => {
  it('should define TransitionDefinition', () => {
    const transition: TransitionDefinition = {
      target: 'confirmed',
      guard: 'isAdmin',
      action: 'sendNotification',
    }
    expect(transition.target).toBe('confirmed')
    expect(transition.guard).toBe('isAdmin')
    expect(transition.action).toBe('sendNotification')
  })

  it('should define StateDefinition', () => {
    const state: StateDefinition = {
      transitions: {
        confirm: { target: 'confirmed' },
        cancel: { target: 'cancelled' },
      },
      onEnter: 'logEntry',
      onExit: 'logExit',
      final: false,
    }
    expect(Object.keys(state.transitions)).toEqual(['confirm', 'cancel'])
    expect(state.onEnter).toBe('logEntry')
    expect(state.final).toBe(false)
  })

  it('should define WorkflowDefinition', () => {
    const definition: WorkflowDefinition = {
      name: 'order-lifecycle',
      initialState: 'pending',
      states: {
        pending: { transitions: { confirm: { target: 'confirmed' } } },
        confirmed: { transitions: {}, final: true },
      },
    }
    expect(definition.name).toBe('order-lifecycle')
    expect(definition.initialState).toBe('pending')
    expect(Object.keys(definition.states)).toEqual(['pending', 'confirmed'])
  })

  it('should define Workflow with ID and timestamps', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'test',
      initialState: 'start',
      states: { start: { transitions: {}, final: true } },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    expect(workflow.id).toBe('wf-1')
    expect(workflow.createdAt).toBeTruthy()
  })

  it('should define WorkflowInstance', () => {
    const instance: WorkflowInstance = {
      id: 'inst-1',
      workflowId: 'wf-1',
      state: 'pending',
      data: { orderId: '123' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    expect(instance.state).toBe('pending')
    expect(instance.data.orderId).toBe('123')
  })

  it('should define WorkflowEvent', () => {
    const event: WorkflowEvent = {
      id: 'evt-1',
      instanceId: 'inst-1',
      action: 'confirm',
      fromState: 'pending',
      toState: 'confirmed',
      data: { approvedBy: 'admin' },
      createdAt: '2024-01-01T00:00:00Z',
    }
    expect(event.action).toBe('confirm')
    expect(event.fromState).toBe('pending')
    expect(event.toState).toBe('confirmed')
  })

  it('should define WorkflowConfig', () => {
    const config: WorkflowConfig = {
      tablePrefix: 'wf_',
      customSetting: true,
    }
    expect(config.tablePrefix).toBe('wf_')
  })

  it('should define WorkflowProvider interface', () => {
    const provider: WorkflowProvider = {
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
    }
    expect(provider.name).toBe('test')
    expect(typeof provider.createWorkflow).toBe('function')
    expect(typeof provider.transition).toBe('function')
    expect(typeof provider.getAvailableActions).toBe('function')
  })
})
