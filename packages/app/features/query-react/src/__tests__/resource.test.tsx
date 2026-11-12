/**
 * `createQueryResource` through the real hook and both query bonds: a resource's reads are
 * `useQuery` options and its writes change what a mounted page shows.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider, QueryState } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { createQueryResource, type ResourceHttp } from '../resource.js'
import { useQuery } from '../useQuery.js'

interface Ticket {
  id: string
  subject: string
  escalated: boolean
}

const roots: Root[] = []
afterEach(() => {
  for (const root of roots) act(() => root.unmount())
  roots.length = 0
})

function mount<T>(use: () => QueryState<T>): { value: () => QueryState<T> } {
  let latest!: QueryState<T>
  function Probe() {
    latest = use()
    return null
  }
  const root = createRoot(document.createElement('div'))
  roots.push(root)
  act(() => root.render(createElement(Probe)))
  return { value: () => latest }
}

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => {})
}

/** A ticket API held in memory: the envelope is the app's, read by `readList`/`readOne`. */
function ticketApi(): { http: ResourceHttp; rows: Ticket[]; calls: string[] } {
  const rows: Ticket[] = [{ id: 't1', subject: 'Printer', escalated: false }]
  const calls: string[] = []
  const find = (path: string): Ticket | undefined =>
    rows.find((row) => path.startsWith(`/tickets/${row.id}`))
  const http: ResourceHttp = {
    get: async (path, options) => {
      calls.push(`GET ${path} ${JSON.stringify(options?.params ?? {})}`)
      if (path === '/tickets') return { data: { tickets: rows.map((row) => ({ ...row })) } }
      const row = find(path)
      if (!row) throw Object.assign(new Error('Not found'), { status: 404 })
      return { data: { ticket: { ...row } } }
    },
    post: async (path, body) => {
      calls.push(`POST ${path}`)
      if (path === '/tickets') {
        const row = { id: `t${rows.length + 1}`, escalated: false, ...(body as object) } as Ticket
        rows.push(row)
        return { data: { ticket: { ...row } } }
      }
      const row = find(path)!
      row.escalated = true
      return { data: { ticket: { ...row } } }
    },
    put: async (path, body) => {
      calls.push(`PUT ${path}`)
      const row = Object.assign(find(path)!, body)
      return { data: { ticket: { ...row } } }
    },
    patch: async (path, body) => {
      calls.push(`PATCH ${path}`)
      const row = Object.assign(find(path)!, body)
      return { data: { ticket: { ...row } } }
    },
    delete: async (path) => {
      calls.push(`DELETE ${path}`)
      const row = find(path)!
      if (path.endsWith('/escalation')) {
        row.escalated = false
        return { data: { ticket: { ...row } } }
      }
      rows.splice(rows.indexOf(row), 1)
      return { data: null }
    },
  }
  return { http, rows, calls }
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('a ticket resource over the %s bond', (_name, bond: QueryProvider) => {
  let api: ReturnType<typeof ticketApi>
  const resource = () =>
    createQueryResource<Ticket, { subject: string }>({
      name: 'tickets',
      path: '/tickets',
      http: () => api.http,
      readList: (response) => (response.data as { tickets: Ticket[] }).tickets,
      readOne: (response) => (response.data as { ticket: Ticket } | null)?.ticket ?? null,
    })

  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
    api = ticketApi()
  })

  it('shows a created ticket in a list that is already mounted', async () => {
    const tickets = resource()
    const page = mount(() => useQuery(tickets.list('agent-1', { page: 1 })))
    await settle()
    expect(page.value().data?.map((row) => row.subject)).toEqual(['Printer'])

    await act(async () => {
      await tickets.create('agent-1', { subject: 'Projector' })
    })
    await settle()
    expect(page.value().data?.map((row) => row.subject)).toEqual(['Printer', 'Projector'])
    expect(api.calls.filter((call) => call.startsWith('GET /tickets {"page":1}'))).toHaveLength(2)
  })

  it('refreshes after a pre-mutation list request already in flight settles', async () => {
    const tickets = resource()
    const get = api.http.get
    let release!: () => void
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    let first = true
    api.http.get = async (path, options) => {
      const response = await get(path, options)
      if (path === '/tickets' && first) {
        first = false
        await barrier
      }
      return response
    }
    const page = mount(() => useQuery(tickets.list('agent-1')))
    await settle()
    let write!: Promise<Ticket>
    act(() => {
      write = tickets.create('agent-1', { subject: 'Projector' })
    })
    await settle()
    await act(async () => {
      release()
      await write
    })
    await settle()
    expect(page.value().data?.map((row) => row.subject)).toEqual(['Printer', 'Projector'])
  })

  it('refreshes a whole page and its total after a create without a local array mirror', async () => {
    const tickets = resource()
    type Page = { tickets: Ticket[]; total: number }
    const get = api.http.get
    api.http.get = async (path, options) => {
      const response = await get(path, options)
      return path === '/tickets'
        ? { data: { ...(response.data as object), total: api.rows.length } }
        : response
    }
    const page = mount(() =>
      useQuery(
        tickets.listPage('agent-1', { limit: 10, offset: 0 }, (response) => response.data as Page),
      ),
    )
    await settle()
    expect(page.value().data?.total).toBe(1)
    await act(async () => {
      await tickets.create('agent-1', { subject: 'Projector' })
    })
    await settle()
    expect(page.value().data?.tickets.map((row) => row.subject)).toEqual(['Printer', 'Projector'])
    expect(page.value().data?.total).toBe(2)
  })

  it('refreshes an alternate collection path through its owning resource', async () => {
    const tickets = resource()
    const get = api.http.get
    api.http.get = async (path, options) =>
      path === '/tickets/escalated'
        ? {
            data: {
              tickets: api.rows.filter((row) => row.escalated).map((row) => ({ ...row })),
              total: api.rows.filter((row) => row.escalated).length,
            },
          }
        : get(path, options)
    type Page = { tickets: Ticket[]; total: number }
    const page = mount(() =>
      useQuery(
        tickets.listPage('agent-1', {}, (response) => response.data as Page, '/tickets/escalated'),
      ),
    )
    await settle()
    expect(page.value().data?.total).toBe(0)
    await act(async () => {
      await tickets.toggle('agent-1', 't1', 'escalation', true)
    })
    await settle()
    expect(page.value().data?.total).toBe(1)
    expect(page.value().data?.tickets[0].id).toBe('t1')
  })

  it('keeps row-only reads, page envelopes and viewers in distinct cache entries', async () => {
    const tickets = resource()
    const rows = mount(() => useQuery(tickets.list('agent-1')))
    const page = mount(() =>
      useQuery(
        tickets.listPage('agent-1', {}, (response) => response.data as { tickets: Ticket[] }),
      ),
    )
    await settle()
    expect(rows.value().data).toHaveLength(1)
    expect(page.value().data?.tickets).toHaveLength(1)
    const before = api.calls.length
    await act(async () => {
      await tickets.create('agent-2', { subject: 'Private' })
    })
    await settle()
    expect(api.calls.length - before).toBe(1)
    expect(rows.value().data).toHaveLength(1)
    expect(page.value().data?.tickets).toHaveLength(1)
  })

  it('paints the saved record into a mounted detail page and resolves a toggle with it', async () => {
    const tickets = resource()
    const page = mount(() => useQuery(tickets.detail('agent-1', 't1')))
    await settle()
    expect(page.value().data?.escalated).toBe(false)

    let saved!: Ticket
    await act(async () => {
      saved = await tickets.toggle('agent-1', 't1', 'escalation', true)
    })
    await settle()
    expect(saved.escalated).toBe(true)
    expect(page.value().data?.escalated).toBe(true)
    // The record came from the write's own response: no second detail read.
    expect(api.calls.filter((call) => call.startsWith('GET /tickets/t1'))).toHaveLength(1)

    await act(async () => {
      await tickets.toggle('agent-1', 't1', 'escalation', false)
      await tickets.update('agent-1', 't1', { subject: 'Printer jam' })
    })
    await settle()
    expect(page.value().data).toMatchObject({ escalated: false, subject: 'Printer jam' })
    expect(api.calls).toContain('DELETE /tickets/t1/escalation')
  })

  it('answers a missing record with null and observes nothing without an id', async () => {
    const tickets = resource()
    expect(tickets.detail('agent-1', null)).toBeNull()
    expect(tickets.detail('agent-1', '')).toBeNull()
    const page = mount(() => useQuery(tickets.detail('agent-1', 'gone')))
    await settle()
    expect(page.value().status).toBe('success')
    expect(page.value().data).toBeNull()
  })

  it('keeps a failed load a failure', async () => {
    const tickets = resource()
    api.http.get = async () => {
      throw Object.assign(new Error('Server error'), { status: 500 })
    }
    const page = mount(() => useQuery(tickets.detail('agent-1', 't1')))
    await settle()
    expect(page.value().status).toBe('error')
  })

  it('removes a record from the detail cache and from the mounted list', async () => {
    const tickets = resource()
    const page = mount(() => useQuery(tickets.list('agent-1')))
    await settle()
    await act(async () => {
      await tickets.remove('agent-1', 't1')
    })
    await settle()
    expect(page.value().data).toEqual([])
    expect(getQueryClient().get(['tickets', 'agent-1', 'detail', 't1'])).toBeNull()
  })

  it("keeps one viewer's documents apart from another's", async () => {
    const tickets = resource()
    const mine = mount(() => useQuery(tickets.list('agent-1')))
    await settle()
    const before = api.calls.length
    await act(async () => {
      await tickets.create('agent-2', { subject: 'Laptop' })
    })
    await settle()
    // Another viewer's write refreshes that viewer's lists, not this one's.
    expect(api.calls.slice(before).filter((call) => call.startsWith('GET'))).toEqual([])
    expect(mine.value().data).toHaveLength(1)
  })

  it('updates with PATCH when the API does', async () => {
    const tickets = createQueryResource<Ticket>({
      name: 'tickets',
      path: '/tickets/',
      updateMethod: 'patch',
      http: () => api.http,
      readOne: (response) => (response.data as { ticket: Ticket }).ticket,
    })
    const saved = await tickets.update('agent-1', 't1', { subject: 'Scanner' })
    expect(saved.subject).toBe('Scanner')
    expect(api.calls).toContain('PATCH /tickets/t1')
  })

  it('rejects a write whose response holds no record', async () => {
    const tickets = resource()
    api.http.post = vi.fn(async () => ({ data: null }))
    await expect(tickets.create('agent-1', { subject: 'Nothing' })).rejects.toThrow(
      'tickets: the response held no record',
    )
  })
})
