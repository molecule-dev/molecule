/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-workflow-database` bond and the real `setStore`. Only the
 * postgresql driver bond is replaced by an in-test, in-memory table store.
 *
 * @module
 */
const { tables, memoryStore } = vi.hoisted(() => {
  const tables = new Map<string, Map<string, Record<string, unknown>>>()
  const table = (name: string): Map<string, Record<string, unknown>> => {
    let rows = tables.get(name)
    if (!rows) {
      rows = new Map()
      tables.set(name, rows)
    }
    return rows
  }
  let sequence = 0
  const memoryStore = {
    async findById(name: string, id: string) {
      return table(name).get(id) ?? null
    },
    async findMany(name: string, options?: { where?: { field: string; value: unknown }[] }) {
      return [...table(name).values()].filter((row) =>
        (options?.where ?? []).every((condition) => row[condition.field] === condition.value),
      )
    },
    async create(name: string, data: Record<string, unknown>) {
      sequence += 1
      const now = new Date().toISOString()
      const row = { id: `${name}-${sequence}`, createdAt: now, updatedAt: now, ...data }
      table(name).set(String(row.id), row)
      return { data: row, affected: 1 }
    },
    async updateById(name: string, id: string, data: Record<string, unknown>) {
      const row = { ...table(name).get(id), ...data }
      table(name).set(id, row)
      return { data: row, affected: 1 }
    },
  }
  return { tables, memoryStore }
})

vi.mock('@molecule/api-database-postgresql', () => ({ store: memoryStore }))

import { describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { provider, registerGuard } from '@molecule/api-workflow-database'

import {
  createWorkflow,
  getAvailableActions,
  getHistory,
  listWorkflows,
  setProvider,
  startInstance,
  transition,
} from '../index.js'

describe('README @example', () => {
  const boot = async (): Promise<{ id: string }> => {
    setStore(store)
    setProvider(provider)
    registerGuard('isPaid', (ctx) => ctx.data.paid === true)

    const existing = (await listWorkflows()).find((workflow) => workflow.name === 'order-lifecycle')
    return (
      existing ??
      (await createWorkflow({
        name: 'order-lifecycle',
        initialState: 'pending',
        states: {
          pending: {
            transitions: {
              ship: { target: 'shipped', guard: 'isPaid' },
              cancel: { target: 'cancelled' },
            },
          },
          shipped: { transitions: {}, final: true },
          cancelled: { transitions: {}, final: true },
        },
      }))
    )
  }

  it('creates the definition once, offers legal actions, guards and records the transition', async () => {
    const orderFlow = await boot()
    // A second boot reuses the stored definition instead of inserting another row.
    expect((await boot()).id).toBe(orderFlow.id)
    expect(tables.get('workflows')?.size).toBe(1)

    const order = await startInstance(orderFlow.id, { orderId: 'ord_123', paid: false })
    const actions = await getAvailableActions(order.id)
    expect(actions).toEqual(['ship', 'cancel'])

    // Unpaid: the registered guard blocks the move.
    await expect(transition(order.id, 'ship')).rejects.toThrow()

    const shipped = await transition(order.id, 'ship', { paid: true })
    expect(shipped.state).toBe('shipped')

    const history = await getHistory(order.id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ action: 'ship', fromState: 'pending', toState: 'shipped' })
  })
})
