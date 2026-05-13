const { mockCount, mockCreate, mockDeleteById, mockFindById, mockFindMany, mockUpdateById } =
  vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addRuleToFlag,
  createFlagForUser,
  deleteFlagForUser,
  deleteRule,
  getFlagForUser,
  listFlagsForUser,
  listRulesForFlag,
  updateFlagForUser,
} from '../service.js'
import type { FeatureFlagRow, FeatureFlagTargetingRuleRow } from '../types.js'

function makeFlag(overrides: Partial<FeatureFlagRow> = {}): FeatureFlagRow {
  return {
    id: 'f-1',
    user_id: 'user-1',
    project_id: null,
    key: 'new-checkout',
    name: 'New Checkout',
    description: null,
    flag_type: 'boolean',
    default_value: false,
    rollout_percentage: 0,
    is_enabled: false,
    state: 'off',
    environment: 'production',
    stale_days: 30,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  } as FeatureFlagRow
}

function makeRule(
  overrides: Partial<FeatureFlagTargetingRuleRow> = {},
): FeatureFlagTargetingRuleRow {
  return {
    id: 'r-1',
    flag_id: 'f-1',
    attribute: 'user_email',
    operator: 'contains',
    value: '@beta.test',
    serve_value: true,
    priority: 100,
    description: null,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  } as FeatureFlagTargetingRuleRow
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listFlagsForUser', () => {
  it('scopes by user_id, orders by updated_at then created_at desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listFlagsForUser('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'user_id', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([
      { field: 'updated_at', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ])
  })

  it('applies project_id / environment / state filters when provided', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listFlagsForUser('user-1', { project_id: 'p-1', environment: 'staging', state: 'on' })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'project_id', operator: '=', value: 'p-1' })
    expect(where).toContainEqual({ field: 'environment', operator: '=', value: 'staging' })
    expect(where).toContainEqual({ field: 'state', operator: '=', value: 'on' })
  })

  it('paginates with offset = (page-1)*limit and default limit=50', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listFlagsForUser('user-1', { page: 3 })
    expect(mockFindMany.mock.calls[0][1].limit).toBe(50)
    expect(mockFindMany.mock.calls[0][1].offset).toBe(100)
  })
})

describe('getFlagForUser IDOR', () => {
  it('null for missing row', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getFlagForUser('f-1', 'user-1')).toBeNull()
  })

  it('null for cross-user row', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(await getFlagForUser('f-1', 'user-1')).toBeNull()
  })

  it('returns the row for its owner', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    const out = await getFlagForUser('f-1', 'user-1')
    expect(out?.id).toBe('f-1')
  })
})

describe('createFlagForUser', () => {
  it('initialises with state=off and is_enabled=false', async () => {
    mockCreate.mockResolvedValue({ data: makeFlag() })
    await createFlagForUser('user-1', { key: 'k', name: 'N' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.state).toBe('off')
    expect(payload.is_enabled).toBe(false)
  })

  it('defaults flag_type=boolean, default_value=false, rollout=0, env=production, stale=30', async () => {
    mockCreate.mockResolvedValue({ data: makeFlag() })
    await createFlagForUser('user-1', { key: 'k', name: 'N' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.flag_type).toBe('boolean')
    expect(payload.default_value).toBe(false)
    expect(payload.rollout_percentage).toBe(0)
    expect(payload.environment).toBe('production')
    expect(payload.stale_days).toBe(30)
  })

  it('preserves caller-supplied flag_type / default_value / rollout / env / stale_days', async () => {
    mockCreate.mockResolvedValue({ data: makeFlag() })
    await createFlagForUser('user-1', {
      key: 'k',
      name: 'N',
      flag_type: 'percentage',
      default_value: 'control',
      rollout_percentage: 25,
      environment: 'staging',
      stale_days: 7,
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.flag_type).toBe('percentage')
    expect(payload.default_value).toBe('control')
    expect(payload.rollout_percentage).toBe(25)
    expect(payload.environment).toBe('staging')
    expect(payload.stale_days).toBe(7)
  })

  it('project_id and description default to null', async () => {
    mockCreate.mockResolvedValue({ data: makeFlag() })
    await createFlagForUser('user-1', { key: 'k', name: 'N' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.project_id).toBeNull()
    expect(payload.description).toBeNull()
  })
})

describe('updateFlagForUser IDOR', () => {
  it('refuses cross-user update', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(await updateFlagForUser('f-1', 'user-1', { state: 'on' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('returns refreshed row after update', async () => {
    mockFindById
      .mockResolvedValueOnce(makeFlag()) // owner check
      .mockResolvedValueOnce(makeFlag({ state: 'on' })) // refresh
    mockUpdateById.mockResolvedValue({ data: {} })
    const out = await updateFlagForUser('f-1', 'user-1', { state: 'on' })
    expect(out?.state).toBe('on')
  })
})

describe('deleteFlagForUser IDOR', () => {
  it('false on missing / cross-owner', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(await deleteFlagForUser('f-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('true for owner', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteFlagForUser('f-1', 'user-1')).toBe(true)
  })
})

describe('listRulesForFlag', () => {
  it('null when flag is missing/cross-owner (no rule lookup)', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(await listRulesForFlag('f-1', 'user-1')).toBeNull()
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('orders rules by priority ASC (lower priority = higher precedence)', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    mockFindMany.mockResolvedValue([])
    await listRulesForFlag('f-1', 'user-1')
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([{ field: 'priority', direction: 'asc' }])
  })

  it('scopes rules by flag_id', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    mockFindMany.mockResolvedValue([])
    await listRulesForFlag('f-1', 'user-1')
    expect(mockFindMany.mock.calls[0][1].where).toEqual([
      { field: 'flag_id', operator: '=', value: 'f-1' },
    ])
  })
})

describe('addRuleToFlag', () => {
  it('null when flag is cross-owner (no rule created)', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(
      await addRuleToFlag('f-1', 'user-1', {
        attribute: 'email',
        operator: 'contains',
      }),
    ).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('priority defaults to 100; value and serve_value default to null', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    mockCreate.mockResolvedValue({ data: makeRule() })
    await addRuleToFlag('f-1', 'user-1', {
      attribute: 'email',
      operator: 'contains',
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.priority).toBe(100)
    expect(payload.value).toBeNull()
    expect(payload.serve_value).toBeNull()
  })

  it('preserves provided priority / value / serve_value / description', async () => {
    mockFindById.mockResolvedValue(makeFlag())
    mockCreate.mockResolvedValue({ data: makeRule() })
    await addRuleToFlag('f-1', 'user-1', {
      attribute: 'plan',
      operator: 'equals',
      value: 'pro',
      serve_value: true,
      priority: 10,
      description: 'pro users on',
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.priority).toBe(10)
    expect(payload.value).toBe('pro')
    expect(payload.serve_value).toBe(true)
    expect(payload.description).toBe('pro users on')
  })
})

describe('deleteRule', () => {
  it('false when flag is cross-owner', async () => {
    mockFindById.mockResolvedValue(makeFlag({ user_id: 'other' }))
    expect(await deleteRule('r-1', 'f-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('false when rule belongs to a different flag (defence-in-depth)', async () => {
    mockFindById
      .mockResolvedValueOnce(makeFlag()) // flag owner check ok
      .mockResolvedValueOnce(makeRule({ flag_id: 'other-flag' })) // wrong flag
    expect(await deleteRule('r-1', 'f-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('false when rule is missing', async () => {
    mockFindById.mockResolvedValueOnce(makeFlag()).mockResolvedValueOnce(null)
    expect(await deleteRule('r-1', 'f-1', 'user-1')).toBe(false)
  })

  it('true when flag is owned + rule matches', async () => {
    mockFindById.mockResolvedValueOnce(makeFlag()).mockResolvedValueOnce(makeRule())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteRule('r-1', 'f-1', 'user-1')).toBe(true)
  })
})
