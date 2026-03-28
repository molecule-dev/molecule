/**
 * Integration tests verifying that molecule API packages compose correctly
 * via the bond system. These tests verify packages WORK TOGETHER, not in
 * isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bond,
  get,
  getAll,
  isBonded,
  require as bondRequire,
  reset,
  unbond,
  unbondAll,
} from '@molecule/api-bond'
import { paginated, validate, validateBody } from '@molecule/api-middleware-validation'
import type {
  DataStore,
  FindManyOptions,
  MutationResult,
  WhereCondition,
} from '@molecule/api-database'
import { z } from 'zod'

import type { Request, Response } from 'express'

// ============================================================================
// Helpers
// ============================================================================

/** Creates a minimal mock Express request. */
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as Request
}

/** Creates a minimal mock Express response with spied methods. */
function mockResponse(): Response & {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
} {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
}

// ============================================================================
// 1. Bond Wiring — register via bond(), retrieve via require()
// ============================================================================

describe('Bond wiring integration', () => {
  afterEach(() => {
    reset()
  })

  it('registers a singleton provider and retrieves the same instance via require()', () => {
    const emailProvider = {
      sendMail: vi.fn().mockResolvedValue({ id: 'msg-1', accepted: true }),
    }

    bond('email', emailProvider)
    const retrieved = bondRequire<typeof emailProvider>('email')

    expect(retrieved).toBe(emailProvider)
  })

  it('require() throws when no provider is bonded', () => {
    expect(() => bondRequire('email')).toThrow(/No 'email' provider bonded/)
  })

  it('get() returns undefined when no provider is bonded', () => {
    expect(get('email')).toBeUndefined()
  })

  it('isBonded() reflects registration state', () => {
    expect(isBonded('email')).toBe(false)

    bond('email', { sendMail: vi.fn() })
    expect(isBonded('email')).toBe(true)

    unbond('email')
    expect(isBonded('email')).toBe(false)
  })

  it('replacing a singleton returns the new provider', () => {
    const providerA = { name: 'sendgrid' }
    const providerB = { name: 'mailgun' }

    bond('email', providerA)
    expect(bondRequire('email')).toBe(providerA)

    bond('email', providerB)
    expect(bondRequire('email')).toBe(providerB)
  })

  it('reset() clears all singletons and named providers', () => {
    bond('email', { sendMail: vi.fn() })
    bond('ai', 'anthropic', { complete: vi.fn() })

    reset()

    expect(isBonded('email')).toBe(false)
    expect(get('ai', 'anthropic')).toBeUndefined()
  })
})

// ============================================================================
// 2. Multi-provider bonds — named providers
// ============================================================================

describe('Multi-provider bond integration', () => {
  afterEach(() => {
    reset()
  })

  it('registers and retrieves multiple named providers under one category', () => {
    const anthropic = {
      name: 'anthropic',
      complete: vi.fn().mockResolvedValue('Hello from Claude'),
    }
    const openai = { name: 'openai', complete: vi.fn().mockResolvedValue('Hello from GPT') }

    bond('ai', 'anthropic', anthropic)
    bond('ai', 'openai', openai)

    expect(get('ai', 'anthropic')).toBe(anthropic)
    expect(get('ai', 'openai')).toBe(openai)
  })

  it('require() retrieves a named provider by name', () => {
    const stripeProvider = { charge: vi.fn() }
    bond('payments', 'stripe', stripeProvider)

    const retrieved = bondRequire<typeof stripeProvider>('payments', 'stripe')
    expect(retrieved).toBe(stripeProvider)
  })

  it('require() throws for a missing named provider', () => {
    bond('payments', 'stripe', { charge: vi.fn() })

    expect(() => bondRequire('payments', 'paypal')).toThrow(/No 'payments:paypal' provider bonded/)
  })

  it('getAll() returns a Map of all named providers in a category', () => {
    const github = { verify: vi.fn() }
    const google = { verify: vi.fn() }
    const twitter = { verify: vi.fn() }

    bond('oauth', 'github', github)
    bond('oauth', 'google', google)
    bond('oauth', 'twitter', twitter)

    const all = getAll('oauth')
    expect(all.size).toBe(3)
    expect(all.get('github')).toBe(github)
    expect(all.get('google')).toBe(google)
    expect(all.get('twitter')).toBe(twitter)
  })

  it('getAll() returns an empty Map for unregistered categories', () => {
    const all = getAll('nonexistent')
    expect(all.size).toBe(0)
  })

  it('unbond() removes a single named provider without affecting others', () => {
    bond('oauth', 'github', { verify: vi.fn() })
    bond('oauth', 'google', { verify: vi.fn() })

    unbond('oauth', 'github')

    expect(get('oauth', 'github')).toBeUndefined()
    expect(get('oauth', 'google')).toBeDefined()
  })

  it('unbondAll() removes all providers for a category', () => {
    bond('oauth', 'github', { verify: vi.fn() })
    bond('oauth', 'google', { verify: vi.fn() })
    bond('oauth', 'twitter', { verify: vi.fn() })

    unbondAll('oauth')

    expect(getAll('oauth').size).toBe(0)
  })

  it('named and singleton providers coexist independently for different categories', () => {
    const emailProvider = { sendMail: vi.fn() }
    const anthropic = { complete: vi.fn() }

    bond('email', emailProvider)
    bond('ai', 'anthropic', anthropic)

    expect(bondRequire('email')).toBe(emailProvider)
    expect(get('ai', 'anthropic')).toBe(anthropic)
  })
})

// ============================================================================
// 3. Provider type safety — calling methods returns expected types
// ============================================================================

describe('Provider type safety integration', () => {
  afterEach(() => {
    reset()
  })

  interface EmailTransport {
    sendMail(options: {
      to: string
      subject: string
      body: string
    }): Promise<{ id: string; accepted: boolean }>
  }

  interface PaymentProvider {
    charge(amount: number, currency: string): Promise<{ transactionId: string; status: string }>
    refund(transactionId: string): Promise<{ refunded: boolean }>
  }

  it('typed provider methods return the expected result types', async () => {
    const emailProvider: EmailTransport = {
      async sendMail(options) {
        return { id: `msg-${Date.now()}`, accepted: true }
      },
    }

    bond('email', emailProvider)
    const email = bondRequire<EmailTransport>('email')

    const result = await email.sendMail({ to: 'alice@example.com', subject: 'Test', body: 'Hello' })
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('accepted', true)
    expect(typeof result.id).toBe('string')
  })

  it('named provider methods are callable and return correct types', async () => {
    const stripe: PaymentProvider = {
      async charge(amount, currency) {
        return { transactionId: `txn-${amount}`, status: 'succeeded' }
      },
      async refund(transactionId) {
        return { refunded: true }
      },
    }

    bond('payments', 'stripe', stripe)

    const provider = bondRequire<PaymentProvider>('payments', 'stripe')
    const chargeResult = await provider.charge(1999, 'usd')
    expect(chargeResult.transactionId).toBe('txn-1999')
    expect(chargeResult.status).toBe('succeeded')

    const refundResult = await provider.refund(chargeResult.transactionId)
    expect(refundResult.refunded).toBe(true)
  })

  it('provider conformance: swapping providers preserves the interface contract', async () => {
    const sendgrid: EmailTransport = {
      async sendMail() {
        return { id: 'sg-123', accepted: true }
      },
    }

    const mailgun: EmailTransport = {
      async sendMail() {
        return { id: 'mg-456', accepted: true }
      },
    }

    // Wire sendgrid first
    bond('email', sendgrid)
    let result = await bondRequire<EmailTransport>('email').sendMail({
      to: 'a@b.c',
      subject: 's',
      body: 'b',
    })
    expect(result.id).toBe('sg-123')

    // Swap to mailgun — same interface, different implementation
    bond('email', mailgun)
    result = await bondRequire<EmailTransport>('email').sendMail({
      to: 'a@b.c',
      subject: 's',
      body: 'b',
    })
    expect(result.id).toBe('mg-456')
    expect(result.accepted).toBe(true)
  })
})

// ============================================================================
// 4. Validation middleware integration — compose validation + handler
// ============================================================================

describe('Validation middleware integration', () => {
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    next = vi.fn()
  })

  it('rejects invalid data with 400 and field-level errors', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive(),
    })

    const req = mockRequest({
      body: { name: '', email: 'not-an-email', age: -5 },
    })
    const res = mockResponse()
    const middleware = validate({ body: schema })

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
            code: expect.any(String),
          }),
        ]),
      }),
    )

    // Verify there are multiple field errors
    const jsonCall = res.json.mock.calls[0]![0] as { errors: Array<{ field: string }> }
    expect(jsonCall.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('passes valid data through and calls next()', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive(),
    })

    const req = mockRequest({
      body: { name: 'Alice', email: 'alice@example.com', age: 30 },
    })
    const res = mockResponse()
    const middleware = validate({ body: schema })

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(req.body).toEqual({ name: 'Alice', email: 'alice@example.com', age: 30 })
  })

  it('composes body + query validation together', () => {
    const schema = {
      body: z.object({ title: z.string().min(1) }),
      query: z.object({
        page: z.coerce.number().int().positive().default(1),
        perPage: z.coerce.number().int().positive().max(100).default(20),
      }),
    }

    const req = mockRequest({
      body: { title: 'My Post' },
      query: { page: '2', perPage: '50' } as Record<string, string>,
    })
    const res = mockResponse()
    const middleware = validate(schema)

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body).toEqual({ title: 'My Post' })
    expect(req.query).toEqual({ page: 2, perPage: 50 })
  })

  it('validateBody() rejects missing required fields with field-level errors', () => {
    const schema = z.object({
      username: z.string().min(3).max(20),
      password: z.string().min(8),
    })

    const req = mockRequest({ body: {} })
    const res = mockResponse()

    validateBody(schema)(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)

    const jsonCall = res.json.mock.calls[0]![0] as { errors: Array<{ field: string }> }
    const fields = jsonCall.errors.map((e) => e.field)
    expect(fields).toContain('username')
    expect(fields).toContain('password')
  })

  it('validation middleware chains with a handler in sequence', () => {
    const schema = z.object({ title: z.string().min(1) })
    const handler = vi.fn((req: Request, res: Response) => {
      res.json({ created: true, title: req.body.title })
    })

    // Simulate Express middleware pipeline: validate -> handler
    const req = mockRequest({ body: { title: 'Integration Test' } })
    const res = mockResponse()

    const middleware = validateBody(schema)
    middleware(req, res, () => {
      handler(req, res)
    })

    expect(handler).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ created: true, title: 'Integration Test' })
  })

  it('validation blocks handler when data is invalid', () => {
    const schema = z.object({ title: z.string().min(1) })
    const handler = vi.fn()

    const req = mockRequest({ body: { title: '' } })
    const res = mockResponse()

    const middleware = validateBody(schema)
    middleware(req, res, () => {
      handler(req, res)
    })

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ============================================================================
// 5. Pagination response format
// ============================================================================

describe('Pagination response format integration', () => {
  it('produces the standard { data, pagination } shape', () => {
    const items = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]
    const result = paginated(items, 50, 1, 20)

    expect(result).toEqual({
      data: items,
      pagination: {
        page: 1,
        perPage: 20,
        total: 50,
        totalPages: 3,
        hasMore: true,
      },
    })
  })

  it('hasMore is false on the last page', () => {
    const result = paginated([{ id: '5' }], 5, 3, 2)
    expect(result.pagination.hasMore).toBe(false)
    expect(result.pagination.totalPages).toBe(3)
  })

  it('handles exact page boundary (total divisible by perPage)', () => {
    const result = paginated([{ id: '1' }], 40, 4, 10)
    expect(result.pagination.totalPages).toBe(4)
    expect(result.pagination.hasMore).toBe(false)
  })

  it('handles single-item result set', () => {
    const result = paginated([{ id: '1' }], 1, 1, 20)
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
    expect(result.pagination.hasMore).toBe(false)
  })

  it('handles empty result set', () => {
    const result = paginated([], 0, 1, 20)
    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
    expect(result.pagination.hasMore).toBe(false)
  })

  it('integrates with validation middleware for a full paginated endpoint flow', () => {
    // Simulate: validate pagination query -> fetch data -> return paginated response
    const paginationQuerySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      perPage: z.coerce.number().int().positive().max(100).default(20),
    })

    const allItems = Array.from({ length: 55 }, (_, i) => ({
      id: String(i + 1),
      name: `Item ${i + 1}`,
    }))

    const handler = (req: Request, res: Response) => {
      const { page, perPage } = req.query as unknown as { page: number; perPage: number }
      const start = (page - 1) * perPage
      const pageItems = allItems.slice(start, start + perPage)
      res.json(paginated(pageItems, allItems.length, page, perPage))
    }

    const req = mockRequest({ query: { page: '2', perPage: '10' } as Record<string, string> })
    const res = mockResponse()

    // Run the pipeline
    const middleware = validate({ query: paginationQuerySchema })
    middleware(req, res, () => {
      handler(req, res)
    })

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ id: '11' })]),
        pagination: {
          page: 2,
          perPage: 10,
          total: 55,
          totalPages: 6,
          hasMore: true,
        },
      }),
    )

    const jsonCall = res.json.mock.calls[0]![0] as { data: unknown[] }
    expect(jsonCall.data).toHaveLength(10)
  })
})

// ============================================================================
// 6. Database abstraction — DataStore interface through the bond system
// ============================================================================

describe('Database abstraction integration', () => {
  /** In-memory DataStore implementation for testing. */
  function createMockDataStore(): DataStore & {
    tables: Map<string, Map<string, Record<string, unknown>>>
  } {
    const tables = new Map<string, Map<string, Record<string, unknown>>>()
    let autoId = 0

    const getTable = (table: string): Map<string, Record<string, unknown>> => {
      if (!tables.has(table)) {
        tables.set(table, new Map())
      }
      return tables.get(table)!
    }

    const matchesWhere = (row: Record<string, unknown>, where: WhereCondition[]): boolean => {
      return where.every((cond) => {
        const val = row[cond.field]
        switch (cond.operator) {
          case '=':
            return val === cond.value
          case '!=':
            return val !== cond.value
          case '>':
            return (val as number) > (cond.value as number)
          case '<':
            return (val as number) < (cond.value as number)
          case '>=':
            return (val as number) >= (cond.value as number)
          case '<=':
            return (val as number) <= (cond.value as number)
          case 'in':
            return (cond.value as unknown[]).includes(val)
          case 'not_in':
            return !(cond.value as unknown[]).includes(val)
          case 'like':
            return typeof val === 'string' && val.includes(cond.value as string)
          case 'is_null':
            return val == null
          case 'is_not_null':
            return val != null
          default:
            return false
        }
      })
    }

    const store: DataStore = {
      async findById<T>(table: string, id: string | number): Promise<T | null> {
        const row = getTable(table).get(String(id))
        return (row as T) ?? null
      },

      async findOne<T>(table: string, where: WhereCondition[]): Promise<T | null> {
        for (const row of getTable(table).values()) {
          if (matchesWhere(row, where)) return row as T
        }
        return null
      },

      async findMany<T>(table: string, options?: FindManyOptions): Promise<T[]> {
        let rows = Array.from(getTable(table).values())

        if (options?.where) {
          rows = rows.filter((row) => matchesWhere(row, options.where!))
        }

        if (options?.orderBy) {
          for (const order of [...options.orderBy].reverse()) {
            rows.sort((a, b) => {
              const aVal = a[order.field]
              const bVal = b[order.field]
              if (aVal === bVal) return 0
              const cmp = (aVal as string) < (bVal as string) ? -1 : 1
              return order.direction === 'asc' ? cmp : -cmp
            })
          }
        }

        if (options?.offset) rows = rows.slice(options.offset)
        if (options?.limit) rows = rows.slice(0, options.limit)

        if (options?.select) {
          rows = rows.map((row) => {
            const projected: Record<string, unknown> = {}
            for (const field of options.select!) {
              projected[field] = row[field]
            }
            return projected
          })
        }

        return rows as T[]
      },

      async count(table: string, where?: WhereCondition[]): Promise<number> {
        if (!where) return getTable(table).size
        let count = 0
        for (const row of getTable(table).values()) {
          if (matchesWhere(row, where)) count++
        }
        return count
      },

      async create<T>(table: string, data: Record<string, unknown>): Promise<MutationResult<T>> {
        const id = data.id ?? String(++autoId)
        const row = { ...data, id }
        getTable(table).set(String(id), row)
        return { data: row as T, affected: 1 }
      },

      async updateById<T>(
        table: string,
        id: string | number,
        data: Record<string, unknown>,
      ): Promise<MutationResult<T>> {
        const t = getTable(table)
        const existing = t.get(String(id))
        if (!existing) return { data: null, affected: 0 }
        const updated = { ...existing, ...data }
        t.set(String(id), updated)
        return { data: updated as T, affected: 1 }
      },

      async updateMany(
        table: string,
        where: WhereCondition[],
        data: Record<string, unknown>,
      ): Promise<MutationResult> {
        let affected = 0
        for (const [id, row] of getTable(table)) {
          if (matchesWhere(row, where)) {
            getTable(table).set(id, { ...row, ...data })
            affected++
          }
        }
        return { data: null, affected }
      },

      async deleteById(table: string, id: string | number): Promise<MutationResult> {
        const deleted = getTable(table).delete(String(id))
        return { data: null, affected: deleted ? 1 : 0 }
      },

      async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
        let affected = 0
        for (const [id, row] of getTable(table)) {
          if (matchesWhere(row, where)) {
            getTable(table).delete(id)
            affected++
          }
        }
        return { data: null, affected }
      },
    }

    return Object.assign(store, { tables })
  }

  let store: ReturnType<typeof createMockDataStore>

  beforeEach(() => {
    store = createMockDataStore()
    bond('datastore', store)
  })

  afterEach(() => {
    reset()
  })

  it('create() inserts a record and returns it', async () => {
    const result = await store.create<{ id: string; name: string; email: string }>('users', {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    })

    expect(result.affected).toBe(1)
    expect(result.data).toEqual({ id: 'user-1', name: 'Alice', email: 'alice@example.com' })
  })

  it('findById() retrieves a previously created record', async () => {
    await store.create('users', { id: 'user-1', name: 'Alice' })

    const found = await store.findById<{ id: string; name: string }>('users', 'user-1')
    expect(found).toEqual({ id: 'user-1', name: 'Alice' })
  })

  it('findById() returns null for nonexistent records', async () => {
    const found = await store.findById('users', 'nonexistent')
    expect(found).toBeNull()
  })

  it('findMany() returns all records in a table', async () => {
    await store.create('users', { id: '1', name: 'Alice' })
    await store.create('users', { id: '2', name: 'Bob' })
    await store.create('users', { id: '3', name: 'Charlie' })

    const results = await store.findMany('users')
    expect(results).toHaveLength(3)
  })

  it('findMany() filters with where conditions', async () => {
    await store.create('users', { id: '1', name: 'Alice', role: 'admin' })
    await store.create('users', { id: '2', name: 'Bob', role: 'user' })
    await store.create('users', { id: '3', name: 'Charlie', role: 'admin' })

    const admins = await store.findMany<{ id: string; name: string; role: string }>('users', {
      where: [{ field: 'role', operator: '=', value: 'admin' }],
    })
    expect(admins).toHaveLength(2)
    expect(admins.every((u) => u.role === 'admin')).toBe(true)
  })

  it('findMany() supports limit and offset for pagination', async () => {
    for (let i = 1; i <= 10; i++) {
      await store.create('items', { id: String(i), name: `Item ${i}` })
    }

    const page2 = await store.findMany('items', { limit: 3, offset: 3 })
    expect(page2).toHaveLength(3)
  })

  it('findMany() supports select to project specific columns', async () => {
    await store.create('users', {
      id: '1',
      name: 'Alice',
      email: 'alice@test.com',
      secret: 'hidden',
    })

    const results = await store.findMany<{ name: string; email: string }>('users', {
      select: ['name', 'email'],
    })
    expect(results[0]).toEqual({ name: 'Alice', email: 'alice@test.com' })
    expect(results[0]).not.toHaveProperty('secret')
  })

  it('updateById() modifies an existing record', async () => {
    await store.create('users', { id: 'user-1', name: 'Alice', email: 'old@example.com' })

    const result = await store.updateById<{ id: string; name: string; email: string }>(
      'users',
      'user-1',
      { email: 'new@example.com' },
    )

    expect(result.affected).toBe(1)
    expect(result.data?.email).toBe('new@example.com')
    expect(result.data?.name).toBe('Alice')
  })

  it('updateById() returns affected=0 for nonexistent records', async () => {
    const result = await store.updateById('users', 'nonexistent', { name: 'Ghost' })
    expect(result.affected).toBe(0)
    expect(result.data).toBeNull()
  })

  it('deleteById() removes a record', async () => {
    await store.create('users', { id: 'user-1', name: 'Alice' })

    const result = await store.deleteById('users', 'user-1')
    expect(result.affected).toBe(1)

    const found = await store.findById('users', 'user-1')
    expect(found).toBeNull()
  })

  it('deleteById() returns affected=0 for nonexistent records', async () => {
    const result = await store.deleteById('users', 'nonexistent')
    expect(result.affected).toBe(0)
  })

  it('count() returns the number of matching records', async () => {
    await store.create('users', { id: '1', name: 'Alice', active: true })
    await store.create('users', { id: '2', name: 'Bob', active: false })
    await store.create('users', { id: '3', name: 'Charlie', active: true })

    const totalCount = await store.count('users')
    expect(totalCount).toBe(3)

    const activeCount = await store.count('users', [
      { field: 'active', operator: '=', value: true },
    ])
    expect(activeCount).toBe(2)
  })

  it('DataStore integrates with the bond system for provider retrieval', async () => {
    // The store was bonded in beforeEach. Retrieve it via bond system.
    const retrievedStore = bondRequire<DataStore>('datastore')

    await retrievedStore.create('projects', { id: 'proj-1', name: 'Molecule' })
    const project = await retrievedStore.findById<{ id: string; name: string }>(
      'projects',
      'proj-1',
    )

    expect(project).toEqual({ id: 'proj-1', name: 'Molecule' })
  })

  it('full CRUD lifecycle through the bonded DataStore', async () => {
    const ds = bondRequire<DataStore>('datastore')

    // Create
    const created = await ds.create<{ id: string; name: string; status: string }>('tasks', {
      id: 'task-1',
      name: 'Write tests',
      status: 'pending',
    })
    expect(created.data?.name).toBe('Write tests')

    // Read
    const found = await ds.findById<{ id: string; name: string; status: string }>('tasks', 'task-1')
    expect(found?.status).toBe('pending')

    // Update
    const updated = await ds.updateById<{ id: string; name: string; status: string }>(
      'tasks',
      'task-1',
      {
        status: 'completed',
      },
    )
    expect(updated.data?.status).toBe('completed')

    // Verify update persisted
    const afterUpdate = await ds.findById<{ id: string; name: string; status: string }>(
      'tasks',
      'task-1',
    )
    expect(afterUpdate?.status).toBe('completed')

    // Delete
    const deleted = await ds.deleteById('tasks', 'task-1')
    expect(deleted.affected).toBe(1)

    // Verify deletion
    const afterDelete = await ds.findById('tasks', 'task-1')
    expect(afterDelete).toBeNull()
  })

  it('deleteMany() removes multiple records matching a condition', async () => {
    await store.create('logs', { id: '1', level: 'error', message: 'fail 1' })
    await store.create('logs', { id: '2', level: 'info', message: 'ok' })
    await store.create('logs', { id: '3', level: 'error', message: 'fail 2' })

    const result = await store.deleteMany('logs', [
      { field: 'level', operator: '=', value: 'error' },
    ])
    expect(result.affected).toBe(2)

    const remaining = await store.findMany('logs')
    expect(remaining).toHaveLength(1)
  })

  it('updateMany() updates multiple records matching a condition', async () => {
    await store.create('users', { id: '1', name: 'Alice', verified: false })
    await store.create('users', { id: '2', name: 'Bob', verified: false })
    await store.create('users', { id: '3', name: 'Charlie', verified: true })

    const result = await store.updateMany(
      'users',
      [{ field: 'verified', operator: '=', value: false }],
      { verified: true },
    )
    expect(result.affected).toBe(2)

    const allVerified = await store.findMany<{ verified: boolean }>('users', {
      where: [{ field: 'verified', operator: '=', value: true }],
    })
    expect(allVerified).toHaveLength(3)
  })

  it('findOne() returns the first matching record', async () => {
    await store.create('users', { id: '1', name: 'Alice', email: 'alice@test.com' })
    await store.create('users', { id: '2', name: 'Bob', email: 'bob@test.com' })

    const found = await store.findOne<{ id: string; name: string }>('users', [
      { field: 'email', operator: '=', value: 'bob@test.com' },
    ])
    expect(found?.name).toBe('Bob')
  })

  it('findOne() returns null when no records match', async () => {
    const found = await store.findOne('users', [
      { field: 'email', operator: '=', value: 'nobody@test.com' },
    ])
    expect(found).toBeNull()
  })
})
