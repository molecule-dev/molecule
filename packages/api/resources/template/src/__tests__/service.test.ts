const { mockCount, mockCreate, mockDeleteMany, mockFindMany, mockFindOne, mockUpdateById } =
  vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteMany: mockDeleteMany,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  getTemplateBySlug,
  instantiateById,
  instantiateTemplate,
  listTemplates,
  mergeVariableValues,
  substitute,
  substituteString,
  updateTemplate,
} from '../service.js'

describe('@molecule/api-resource-template — service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('substituteString', () => {
    it('replaces single placeholder', () => {
      expect(substituteString('hello {{name}}', { name: 'Ada' })).toBe('hello Ada')
    })

    it('tolerates whitespace inside braces', () => {
      expect(substituteString('{{ name }}', { name: 'Ada' })).toBe('Ada')
    })

    it('coerces numbers and booleans', () => {
      expect(substituteString('{{n}} / {{b}}', { n: 7, b: true })).toBe('7 / true')
    })

    it('treats null as empty string', () => {
      expect(substituteString('[{{maybe}}]', { maybe: null })).toBe('[]')
    })

    it('records missing variables and leaves placeholder intact', () => {
      const missing: string[] = []
      expect(substituteString('hi {{name}}', {}, missing)).toBe('hi {{name}}')
      expect(missing).toEqual(['name'])
    })

    it('records missing variable when value is undefined', () => {
      const missing: string[] = []
      expect(substituteString('hi {{name}}', { name: undefined }, missing)).toBe('hi {{name}}')
      expect(missing).toEqual(['name'])
    })

    it('does not duplicate missing names', () => {
      const missing: string[] = []
      substituteString('{{x}} {{x}} {{x}}', {}, missing)
      expect(missing).toEqual(['x'])
    })
  })

  describe('substitute', () => {
    it('walks nested objects and arrays', () => {
      const out = substitute(
        { title: 'Hi {{name}}', tags: ['{{tag}}', 'literal'], meta: { ok: true } },
        { name: 'Ada', tag: 'demo' },
      )
      expect(out).toEqual({ title: 'Hi Ada', tags: ['demo', 'literal'], meta: { ok: true } })
    })

    it('returns scalars unchanged', () => {
      expect(substitute(42, {})).toBe(42)
      expect(substitute(null, {})).toBeNull()
      expect(substitute(true, {})).toBe(true)
    })

    it('produces a deep clone — input is not mutated', () => {
      const input = { tags: ['a'] }
      const out = substitute(input, {}) as { tags: string[] }
      out.tags.push('b')
      expect(input.tags).toEqual(['a'])
    })
  })

  describe('mergeVariableValues', () => {
    it('applies declared defaults', () => {
      expect(mergeVariableValues([{ name: 'greeting', defaultValue: 'Hi' }], {})).toEqual({
        greeting: 'Hi',
      })
    })

    it('caller values override defaults', () => {
      expect(
        mergeVariableValues([{ name: 'greeting', defaultValue: 'Hi' }], { greeting: 'Hey' }),
      ).toEqual({ greeting: 'Hey' })
    })

    it('ignores caller-supplied undefined', () => {
      expect(mergeVariableValues([{ name: 'g', defaultValue: 'x' }], { g: undefined })).toEqual({
        g: 'x',
      })
    })
  })

  describe('instantiateTemplate', () => {
    it('resolves placeholders using merged variables', () => {
      const r = instantiateTemplate(
        {
          snapshot: { greet: '{{greeting}}, {{name}}' },
          variables: [{ name: 'greeting', defaultValue: 'Hello' }],
        },
        { name: 'Ada' },
      )
      expect(r.payload).toEqual({ greet: 'Hello, Ada' })
      expect(r.resolvedVariables).toEqual({ greeting: 'Hello', name: 'Ada' })
      expect(r.missingVariables).toEqual([])
    })

    it('reports missing placeholders', () => {
      const r = instantiateTemplate({ snapshot: { x: '{{a}}' }, variables: [] }, {})
      expect(r.missingVariables).toEqual(['a'])
      expect(r.payload).toEqual({ x: '{{a}}' })
    })

    it('flags required-but-missing variables even when no placeholder uses them', () => {
      const r = instantiateTemplate(
        {
          snapshot: { fixed: 'no placeholders here' },
          variables: [{ name: 'mustHave', required: true }],
        },
        {},
      )
      expect(r.missingVariables).toEqual(['mustHave'])
    })

    it('a required variable with a value is not flagged', () => {
      const r = instantiateTemplate(
        {
          snapshot: { fixed: 'static' },
          variables: [{ name: 'mustHave', required: true }],
        },
        { mustHave: 'ok' },
      )
      expect(r.missingVariables).toEqual([])
    })
  })

  describe('createTemplate', () => {
    it('persists when no conflict', async () => {
      mockFindOne.mockResolvedValue(null)
      const created = { id: 't1', resourceType: 'doc', slug: 'starter' }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      const result = await createTemplate({
        resourceType: 'doc',
        slug: 'starter',
        name: 'Starter',
        snapshot: { hello: '{{name}}' },
        createdBy: 'u1',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'resource-templates',
        expect.objectContaining({
          resourceType: 'doc',
          slug: 'starter',
          name: 'Starter',
          version: 1,
          isPublic: false,
          createdBy: 'u1',
          variables: [],
          tags: [],
        }),
      )
      expect(result).toBe(created)
    })

    it('throws conflict when (resourceType, slug) already exists', async () => {
      mockFindOne.mockResolvedValue({ id: 't1' })
      await expect(
        createTemplate({
          resourceType: 'doc',
          slug: 'starter',
          name: 'Starter',
          snapshot: {},
        }),
      ).rejects.toMatchObject({ code: 'conflict' })
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('updateTemplate', () => {
    it('returns null when row is missing', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await updateTemplate('missing', { name: 'New' })).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns existing when patch is empty', async () => {
      const existing = { id: 't1', version: 3 }
      mockFindOne.mockResolvedValue(existing)
      const result = await updateTemplate('t1', {})
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it('bumps version on update', async () => {
      mockFindOne.mockResolvedValue({ id: 't1', version: 2 })
      mockUpdateById.mockResolvedValue({ data: { id: 't1', version: 3, name: 'New' }, affected: 1 })
      const result = await updateTemplate('t1', { name: 'New' })
      expect(mockUpdateById).toHaveBeenCalledWith('resource-templates', 't1', {
        name: 'New',
        version: 3,
      })
      expect(result).toEqual({ id: 't1', version: 3, name: 'New' })
    })

    it('clears description when null is supplied', async () => {
      mockFindOne.mockResolvedValue({ id: 't1', version: 1 })
      mockUpdateById.mockResolvedValue({ data: { id: 't1', version: 2 }, affected: 1 })
      await updateTemplate('t1', { description: null })
      expect(mockUpdateById).toHaveBeenCalledWith('resource-templates', 't1', {
        description: null,
        version: 2,
      })
    })
  })

  describe('getters', () => {
    it('getTemplate looks up by id', async () => {
      mockFindOne.mockResolvedValue({ id: 't1' })
      expect(await getTemplate('t1')).toEqual({ id: 't1' })
      expect(mockFindOne).toHaveBeenCalledWith('resource-templates', [
        { field: 'id', operator: '=', value: 't1' },
      ])
    })

    it('getTemplateBySlug looks up by (resourceType, slug)', async () => {
      mockFindOne.mockResolvedValue({ id: 't1' })
      await getTemplateBySlug('doc', 'starter')
      expect(mockFindOne).toHaveBeenCalledWith('resource-templates', [
        { field: 'resourceType', operator: '=', value: 'doc' },
        { field: 'slug', operator: '=', value: 'starter' },
      ])
    })
  })

  describe('listTemplates', () => {
    it('paginates with no filters', async () => {
      mockFindMany.mockResolvedValue([{ id: 't1' }])
      mockCount.mockResolvedValue(1)
      const result = await listTemplates({ limit: 10, offset: 0 })
      expect(result).toEqual({ data: [{ id: 't1' }], total: 1, limit: 10, offset: 0 })
    })

    it('passes resourceType filter to where clause', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await listTemplates({ resourceType: 'doc' })
      const where = mockFindMany.mock.calls[0][1].where
      expect(where).toEqual(
        expect.arrayContaining([{ field: 'resourceType', operator: '=', value: 'doc' }]),
      )
    })

    it('passes publicOnly filter to where clause', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await listTemplates({ publicOnly: true })
      const where = mockFindMany.mock.calls[0][1].where
      expect(where).toEqual(
        expect.arrayContaining([{ field: 'isPublic', operator: '=', value: true }]),
      )
    })

    it('scopes to viewer: public + own-private, never another user private row', async () => {
      const rows = [
        { id: 'pub', isPublic: true, createdBy: 'other', snapshot: { s: 'public-snap' }, tags: [] },
        {
          id: 'mine',
          isPublic: false,
          createdBy: 'viewer',
          snapshot: { s: 'mine-private-snap' },
          tags: [],
        },
        {
          id: 'secret',
          isPublic: false,
          createdBy: 'other',
          snapshot: { s: 'other-private-snap' },
          tags: [],
        },
      ]
      // Simulate the DataStore: a where with isPublic=true returns public rows;
      // a where with createdBy=<id> returns that user's rows; an empty where (the
      // pre-fix unscoped query) returns everything.
      mockFindMany.mockImplementation((_table, opts) => {
        const where = (opts?.where ?? []) as Array<{ field: string; value: unknown }>
        if (where.length === 0) return Promise.resolve(rows)
        if (where.some((w) => w.field === 'isPublic')) {
          return Promise.resolve(rows.filter((r) => r.isPublic))
        }
        const ownId = where.find((w) => w.field === 'createdBy')?.value
        return Promise.resolve(rows.filter((r) => r.createdBy === ownId))
      })
      mockCount.mockResolvedValue(rows.length)

      const result = await listTemplates({ viewerId: 'viewer' })
      const ids = result.data.map((r) => r.id)

      expect(ids).toContain('pub')
      expect(ids).toContain('mine')
      expect(ids).not.toContain('secret')
      // The other user's private snapshot must never leak into the response.
      expect(JSON.stringify(result.data)).not.toContain('other-private-snap')
    })

    it('createdBy=<other user> surfaces only that user public rows, not their private', async () => {
      const rows = [
        {
          id: 'other-pub',
          isPublic: true,
          createdBy: 'other',
          snapshot: { s: 'other-public-snap' },
          tags: [],
        },
        {
          id: 'other-secret',
          isPublic: false,
          createdBy: 'other',
          snapshot: { s: 'other-private-snap' },
          tags: [],
        },
      ]
      mockFindMany.mockImplementation((_table, opts) => {
        const where = (opts?.where ?? []) as Array<{ field: string; value: unknown }>
        const hasPublic = where.some((w) => w.field === 'isPublic')
        const createdBy = where.find((w) => w.field === 'createdBy')?.value
        return Promise.resolve(
          rows.filter(
            (r) =>
              (createdBy === undefined || r.createdBy === createdBy) && (!hasPublic || r.isPublic),
          ),
        )
      })
      mockCount.mockResolvedValue(rows.length)

      const result = await listTemplates({ viewerId: 'viewer', createdBy: 'other' })
      const ids = result.data.map((r) => r.id)

      expect(ids).toEqual(['other-pub'])
      expect(JSON.stringify(result.data)).not.toContain('other-private-snap')
    })

    it('filters by tag in-memory when tags supplied', async () => {
      mockFindMany.mockResolvedValue([
        { id: 't1', tags: ['featured'] },
        { id: 't2', tags: ['draft'] },
        { id: 't3', tags: ['featured', 'beta'] },
      ])
      mockCount.mockResolvedValue(3)
      const result = await listTemplates({ tags: ['featured'] })
      expect(result.data.map((r) => r.id)).toEqual(['t1', 't3'])
      expect(result.total).toBe(2)
    })
  })

  describe('deleteTemplate', () => {
    it('returns true when a row was removed', async () => {
      mockDeleteMany.mockResolvedValue({ data: null, affected: 1 })
      expect(await deleteTemplate('t1')).toBe(true)
    })

    it('returns false when no row matched', async () => {
      mockDeleteMany.mockResolvedValue({ data: null, affected: 0 })
      expect(await deleteTemplate('missing')).toBe(false)
    })
  })

  describe('instantiateById', () => {
    it('returns null when template missing', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await instantiateById('missing', {})).toBeNull()
    })

    it('resolves the snapshot when found', async () => {
      mockFindOne.mockResolvedValue({
        snapshot: { greet: 'Hi {{name}}' },
        variables: [{ name: 'name', defaultValue: 'World' }],
      })
      const result = await instantiateById('t1', { name: 'Ada' })
      expect(result?.payload).toEqual({ greet: 'Hi Ada' })
      expect(result?.missingVariables).toEqual([])
    })
  })
})
