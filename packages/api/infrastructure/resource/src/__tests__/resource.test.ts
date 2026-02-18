/**
 * Tests for the Resource CRUD operations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { create } from '../create.js'
import { del } from '../del.js'
import type { MoleculeRequest } from '../http-types.js'
import { query, querySchema } from '../query.js'
import { read } from '../read.js'
import { update } from '../update.js'

// Mock @molecule/api-database DataStore functions
const { mockCreate, mockFindById, mockFindMany, mockUpdateById, mockDeleteById } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
    mockDeleteById: vi.fn(),
  }),
)

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

// Mock logger
vi.mock('@molecule/api-logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock i18n
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}))

// Test schema
const testSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  name: z.string().min(1),
  email: z.string().email(),
})

type TestProps = z.infer<typeof testSchema>

describe('create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a resource with valid props', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await createResource({
      props: { name: 'Test', email: 'test@example.com' },
    })

    expect(result.statusCode).toBe(201)
    expect(result.body).toHaveProperty('props')
    const body = result.body as { props: TestProps }
    expect(body.props.name).toBe('Test')
    expect(body.props.email).toBe('test@example.com')
    expect(body.props.id).toBeDefined()
    expect(body.props.createdAt).toBeDefined()
    expect(body.props.updatedAt).toBeDefined()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        name: 'Test',
        email: 'test@example.com',
      }),
    )
  })

  it('should create a resource with a custom id', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const customId = '550e8400-e29b-41d4-a716-446655440000'
    const result = await createResource({
      props: { name: 'Test', email: 'test@example.com' },
      id: customId,
    })

    expect(result.statusCode).toBe(201)
    const body = result.body as { props: TestProps }
    expect(body.props.id).toBe(customId)
  })

  it('should return 400 for invalid props', async () => {
    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await createResource({
      props: { name: '', email: 'invalid-email' },
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 when database insert fails', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 0 })

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await createResource({
      props: { name: 'Test', email: 'test@example.com' },
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 when database throws an error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Database error'))

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await createResource({
      props: { name: 'Test', email: 'test@example.com' },
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toContain('Unable to create')
  })

  it('should preserve provided createdAt and updatedAt timestamps', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    const createResource = create<{
      name: string
      email: string
      createdAt?: string
      updatedAt?: string
    }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const customCreatedAt = '2023-06-15T10:30:00.000Z'
    const customUpdatedAt = '2023-06-15T10:30:00.000Z'

    const result = await createResource({
      props: {
        name: 'Test',
        email: 'test@example.com',
        createdAt: customCreatedAt,
        updatedAt: customUpdatedAt,
      },
    })

    expect(result.statusCode).toBe(201)
    const body = result.body as { props: TestProps }
    expect(body.props.createdAt).toBe(customCreatedAt)
    expect(body.props.updatedAt).toBe(customUpdatedAt)
  })

  it('should use custom status code from error if provided', async () => {
    const errorWithStatusCode = new Error('Conflict error')
    ;(errorWithStatusCode as { statusCode?: number }).statusCode = 409

    mockCreate.mockRejectedValueOnce(errorWithStatusCode)

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await createResource({
      props: { name: 'Test', email: 'test@example.com' },
    })

    expect(result.statusCode).toBe(409)
  })

  it('should call DataStore create with correct table and data', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    const createResource = create<{ name: string; email: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    await createResource({
      props: { name: 'Test', email: 'test@example.com' },
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [tableName, data] = mockCreate.mock.calls[0]
    expect(tableName).toBe('test_resources')
    expect(data).toHaveProperty('name', 'Test')
    expect(data).toHaveProperty('email', 'test@example.com')
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('createdAt')
    expect(data).toHaveProperty('updatedAt')
  })
})

describe('read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should read a resource by id', async () => {
    const testResource: TestProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Test',
      email: 'test@example.com',
    }

    mockFindById.mockResolvedValueOnce(testResource)

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: testResource.id })

    expect(result.statusCode).toBe(200)
    const body = result.body as { props: TestProps }
    expect(body.props).toEqual(testResource)
    expect(mockFindById).toHaveBeenCalledWith('test_resources', testResource.id)
  })

  it('should return 404 when resource is not found', async () => {
    mockFindById.mockResolvedValueOnce(null)

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: 'non-existent-id' })

    expect(result.statusCode).toBe(404)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toBe('Not found.')
  })

  it('should return provided props without database query', async () => {
    const testResource: TestProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Test',
      email: 'test@example.com',
    }

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: testResource.id, props: testResource })

    expect(result.statusCode).toBe(200)
    const body = result.body as { props: TestProps }
    expect(body.props).toEqual(testResource)
    expect(mockFindById).not.toHaveBeenCalled()
  })

  it('should query database when props.id does not match id', async () => {
    const existingProps: TestProps = {
      id: 'different-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Test',
      email: 'test@example.com',
    }

    const dbResource: TestProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'DB Test',
      email: 'db@example.com',
    }

    mockFindById.mockResolvedValueOnce(dbResource)

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: dbResource.id, props: existingProps })

    expect(result.statusCode).toBe(200)
    const body = result.body as { props: TestProps }
    expect(body.props).toEqual(dbResource)
    expect(mockFindById).toHaveBeenCalled()
  })

  it('should return 404 when database throws an error', async () => {
    mockFindById.mockRejectedValueOnce(new Error('Database error'))

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: 'some-id' })

    expect(result.statusCode).toBe(404)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 404 when findById returns null', async () => {
    mockFindById.mockResolvedValueOnce(null)

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: 'some-id' })

    expect(result.statusCode).toBe(404)
  })

  it('should query database when props is undefined', async () => {
    const testResource: TestProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Test',
      email: 'test@example.com',
    }

    mockFindById.mockResolvedValueOnce(testResource)

    const readResource = read<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await readResource({ id: testResource.id, props: undefined })

    expect(result.statusCode).toBe(200)
    expect(mockFindById).toHaveBeenCalled()
  })
})

describe('update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a resource with valid props', async () => {
    mockUpdateById.mockResolvedValueOnce({ affected: 1 })

    const updateSchema = testSchema.pick({ updatedAt: true, name: true }).partial()

    const updateResource = update<{ name?: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    const result = await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'Updated Name' },
    })

    expect(result.statusCode).toBe(200)
    const body = result.body as { props: { name: string; updatedAt: string } }
    expect(body.props.name).toBe('Updated Name')
    expect(body.props.updatedAt).toBeDefined()
    expect(mockUpdateById).toHaveBeenCalledTimes(1)
  })

  it('should return 400 for invalid props', async () => {
    const updateSchema = z.object({
      updatedAt: z.string().datetime(),
      name: z.string().min(3),
    })

    const updateResource = update<{ name: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    const result = await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'ab' }, // Too short
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 when update fails', async () => {
    mockUpdateById.mockResolvedValueOnce({ affected: 0 })

    const updateSchema = testSchema.pick({ updatedAt: true, name: true }).partial()

    const updateResource = update<{ name?: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    const result = await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'Updated Name' },
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 when database throws an error', async () => {
    mockUpdateById.mockRejectedValueOnce(new Error('Database error'))

    const updateSchema = testSchema.pick({ updatedAt: true, name: true }).partial()

    const updateResource = update<{ name?: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    const result = await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'Updated Name' },
    })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toContain('Unable to update')
  })

  it('should use custom status code from error if provided', async () => {
    const errorWithStatusCode = new Error('Conflict error')
    ;(errorWithStatusCode as { statusCode?: number }).statusCode = 409

    mockUpdateById.mockRejectedValueOnce(errorWithStatusCode)

    const updateSchema = testSchema.pick({ updatedAt: true, name: true }).partial()

    const updateResource = update<{ name?: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    const result = await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'Updated Name' },
    })

    expect(result.statusCode).toBe(409)
  })

  it('should call DataStore updateById with correct table, id, and props', async () => {
    mockUpdateById.mockResolvedValueOnce({ affected: 1 })

    const updateSchema = testSchema.pick({ updatedAt: true, name: true, email: true }).partial()

    const updateResource = update<{ name?: string; email?: string }>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: updateSchema,
    })

    await updateResource({
      id: '550e8400-e29b-41d4-a716-446655440000',
      props: { name: 'New Name', email: 'new@example.com' },
    })

    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    const [tableName, id, data] = mockUpdateById.mock.calls[0]
    expect(tableName).toBe('test_resources')
    expect(id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(data).toHaveProperty('name', 'New Name')
    expect(data).toHaveProperty('email', 'new@example.com')
    expect(data).toHaveProperty('updatedAt')
  })
})

describe('del', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a resource by id', async () => {
    mockDeleteById.mockResolvedValueOnce({ affected: 1 })

    const deleteResource = del<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const id = '550e8400-e29b-41d4-a716-446655440000'
    const result = await deleteResource({ id })

    expect(result.statusCode).toBe(200)
    const body = result.body as { props: { id: string } }
    expect(body.props.id).toBe(id)
    expect(mockDeleteById).toHaveBeenCalledWith('test_resources', id)
  })

  it('should return 404 when resource is not found', async () => {
    mockDeleteById.mockResolvedValueOnce({ affected: 0 })

    const deleteResource = del<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await deleteResource({ id: 'non-existent-id' })

    expect(result.statusCode).toBe(404)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toBe('Not found.')
  })

  it('should return 400 when database throws an error', async () => {
    mockDeleteById.mockRejectedValueOnce(new Error('Database error'))

    const deleteResource = del<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await deleteResource({ id: 'some-id' })

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toContain('Unable to delete')
  })

  it('should use custom status code from error if provided', async () => {
    const errorWithStatusCode = new Error('Forbidden')
    ;(errorWithStatusCode as { statusCode?: number }).statusCode = 403

    mockDeleteById.mockRejectedValueOnce(errorWithStatusCode)

    const deleteResource = del<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await deleteResource({ id: 'some-id' })

    expect(result.statusCode).toBe(403)
  })

  it('should return 404 when result has no affected rows', async () => {
    mockDeleteById.mockResolvedValueOnce({ affected: 0 })

    const deleteResource = del<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const result = await deleteResource({ id: 'some-id' })

    expect(result.statusCode).toBe(404)
  })
})

describe('query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (queryParams: Record<string, unknown> = {}): MoleculeRequest => {
    return { query: queryParams } as MoleculeRequest
  }

  it('should query resources with default parameters', async () => {
    const testResources: TestProps[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        name: 'Test 1',
        email: 'test1@example.com',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        createdAt: '2024-01-01T01:00:00.000Z',
        updatedAt: '2024-01-02T01:00:00.000Z',
        name: 'Test 2',
        email: 'test2@example.com',
      },
    ]

    mockFindMany.mockResolvedValueOnce(testResources)

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest()
    const result = await queryResource(req)

    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual(testResources)
    expect(mockFindMany).toHaveBeenCalledTimes(1)
  })

  it('should apply limit parameter', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ limit: '50' })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({ limit: 50 }),
    )
  })

  it('should apply orderBy parameter', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ orderBy: 'createdAt' })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      }),
    )
  })

  it('should apply orderDirection parameter', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ orderDirection: 'asc' })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        orderBy: [{ field: 'updatedAt', direction: 'asc' }],
      }),
    )
  })

  it('should apply before filter', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({
      before: { updatedAt: '2024-01-15T00:00:00.000Z' },
    })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        where: [{ field: 'updatedAt', operator: '<', value: '2024-01-15T00:00:00.000Z' }],
      }),
    )
  })

  it('should apply after filter', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({
      after: { createdAt: '2024-01-01T00:00:00.000Z' },
    })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        where: [{ field: 'createdAt', operator: '>', value: '2024-01-01T00:00:00.000Z' }],
      }),
    )
  })

  it('should apply both before and after filters', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({
      before: { updatedAt: '2024-01-31T00:00:00.000Z' },
      after: { createdAt: '2024-01-01T00:00:00.000Z' },
    })
    await queryResource(req)

    expect(mockFindMany).toHaveBeenCalledWith(
      'test_resources',
      expect.objectContaining({
        where: expect.arrayContaining([
          { field: 'updatedAt', operator: '<', value: '2024-01-31T00:00:00.000Z' },
          { field: 'createdAt', operator: '>', value: '2024-01-01T00:00:00.000Z' },
        ]),
      }),
    )
  })

  it('should return 400 for invalid limit', async () => {
    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ limit: '0' }) // Below minimum
    const result = await queryResource(req)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 for limit exceeding maximum', async () => {
    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ limit: '20000' }) // Above maximum
    const result = await queryResource(req)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 for invalid orderBy', async () => {
    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ orderBy: 'invalidField' })
    const result = await queryResource(req)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 for invalid orderDirection', async () => {
    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({ orderDirection: 'invalid' })
    const result = await queryResource(req)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
  })

  it('should return 400 when database throws an error', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('Database error'))

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest()
    const result = await queryResource(req)

    expect(result.statusCode).toBe(400)
    expect(result.body).toHaveProperty('error')
    const body = result.body as { error: string }
    expect(body.error).toBe('Bad request.')
  })

  it('should return empty array when no resources found', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest()
    const result = await queryResource(req)

    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual([])
  })

  it('should use default values when no query params provided', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const queryResource = query<TestProps>({
      name: 'TestResource',
      tableName: 'test_resources',
      schema: testSchema,
    })

    const req = createMockRequest({})
    await queryResource(req)

    // Default: limit=100, orderBy=updatedAt, orderDirection=desc
    expect(mockFindMany).toHaveBeenCalledWith('test_resources', {
      where: undefined,
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 100,
    })
  })
})

describe('querySchema', () => {
  it('should validate valid query parameters', () => {
    const result = querySchema.safeParse({
      limit: 50,
      orderBy: 'createdAt',
      orderDirection: 'asc',
    })

    expect(result.success).toBe(true)
  })

  it('should coerce string limit to number', () => {
    const result = querySchema.safeParse({
      limit: '50',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
    }
  })

  it('should apply default values', () => {
    const result = querySchema.safeParse({})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(100)
      expect(result.data.orderBy).toBe('updatedAt')
      expect(result.data.orderDirection).toBe('desc')
    }
  })

  it('should validate before and after objects', () => {
    const result = querySchema.safeParse({
      before: { createdAt: '2024-01-01T00:00:00.000Z' },
      after: { updatedAt: '2024-01-01T00:00:00.000Z' },
    })

    expect(result.success).toBe(true)
  })

  it('should reject limit below minimum', () => {
    const result = querySchema.safeParse({ limit: 0 })

    expect(result.success).toBe(false)
  })

  it('should reject limit above maximum', () => {
    const result = querySchema.safeParse({ limit: 10001 })

    expect(result.success).toBe(false)
  })

  it('should reject invalid orderBy value', () => {
    const result = querySchema.safeParse({ orderBy: 'invalid' })

    expect(result.success).toBe(false)
  })

  it('should reject invalid orderDirection value', () => {
    const result = querySchema.safeParse({ orderDirection: 'random' })

    expect(result.success).toBe(false)
  })
})
