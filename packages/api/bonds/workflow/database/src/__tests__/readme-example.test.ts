/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test,
 * in-memory table store.
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
import {
  createWorkflow,
  getHistory,
  setProvider,
  startInstance,
  transition,
} from '@molecule/api-workflow'

import { provider, registerGuard, registerHook, WorkflowGuardRejectedError } from '../index.js'

describe('README @example', () => {
  it('defines a guarded workflow, transitions an instance, and records history', async () => {
    setStore(store)
    setProvider(provider)
    registerGuard('isPaid', (ctx) => ctx.data.paid === true)
    registerHook('stampShipped', (ctx) => {
      ctx.data.shippedAt = new Date().toISOString()
    })

    const orderFlow = await createWorkflow({
      name: 'order-lifecycle',
      initialState: 'pending',
      states: {
        pending: {
          transitions: {
            ship: { target: 'shipped', guard: 'isPaid' },
            cancel: { target: 'cancelled' },
          },
        },
        shipped: { transitions: {}, onEnter: 'stampShipped', final: true },
        cancelled: { transitions: {}, final: true },
      },
    })

    const order = await startInstance(orderFlow.id, { orderId: 'ord_123', paid: false })
    expect(order.state).toBe('pending')

    // Unpaid: the guard blocks the transition.
    await expect(transition(order.id, 'ship')).rejects.toBeInstanceOf(WorkflowGuardRejectedError)

    const shipped = await transition(order.id, 'ship', { paid: true })
    expect(shipped.state).toBe('shipped')
    expect(shipped.data).toMatchObject({ orderId: 'ord_123', paid: true })
    expect(typeof shipped.data.shippedAt).toBe('string')

    const history = await getHistory(order.id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ action: 'ship', fromState: 'pending', toState: 'shipped' })

    const persisted = tables.get('workflow_instances')?.get(order.id)
    expect(persisted?.state).toBe('shipped')
    expect(JSON.parse(String(persisted?.data))).toMatchObject({ paid: true })
  })
})
