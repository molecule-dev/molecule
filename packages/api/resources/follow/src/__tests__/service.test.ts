const { mockCreate, mockFindOne, mockFindMany, mockCount, mockDeleteMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  count: mockCount,
  deleteMany: mockDeleteMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as followResource from '../index.js'
import {
  follow,
  getFollowerCount,
  getFollowers,
  getFollowing,
  getFollowingCount,
  isFollowing,
  unfollow,
} from '../service.js'

function documentedProjection(): (
  notes: readonly { id: string; title: string }[],
  viewerId?: string | null,
) => Promise<Array<{ id: string; title: string; watching: boolean }>> {
  const intro = readFileSync(new URL('../index.ts', import.meta.url), 'utf8')
    .split('\n * @module')[0]
    .replace(/^ \* ?/gm, '')
  const example = intro.match(/```typescript\n([\s\S]*?)```/)?.[1]
  if (!example) {
    return (notes, viewerId) =>
      Promise.all(
        notes.map(async (note) => ({
          ...note,
          watching: await isFollowing(viewerId, 'note', note.id),
        })),
      )
  }
  const js = ts.transpileModule(example, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {
    projectWatchedNotes: undefined as ReturnType<typeof documentedProjection> | undefined,
  }
  new Function('require', 'exports', js)(() => followResource, exports)
  return exports.projectWatchedNotes!
}

describe('@molecule/api-resource-follow service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('projects a page of notes with one relationship read using the introduction recipe', async () => {
    const notes = [
      { id: 'n1', title: 'One' },
      { id: 'n2', title: 'Two' },
    ]
    mockFindOne.mockImplementation(async (_table, where) =>
      where[2]?.value === 'n2' ? { targetId: 'n2' } : null,
    )
    mockFindMany.mockResolvedValue([{ targetId: 'n2' }])
    const project = documentedProjection()
    expect(await project(notes, 'reader')).toEqual([
      { ...notes[0], watching: false },
      { ...notes[1], watching: true },
    ])
    expect(mockFindMany).toHaveBeenCalledExactlyOnceWith('follows', {
      select: ['targetId'],
      where: [
        { field: 'followerId', operator: '=', value: 'reader' },
        { field: 'targetType', operator: '=', value: 'note' },
        { field: 'targetId', operator: 'in', value: ['n1', 'n2'] },
      ],
    })
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(await project(notes, null)).toEqual(notes.map((note) => ({ ...note, watching: false })))
    expect(mockFindMany).toHaveBeenCalledOnce()
  })

  describe('follow', () => {
    it('should return existing follow if already following', async () => {
      const existing = { id: 'f1', followerId: 'u1', targetType: 'user', targetId: 'u2' }
      mockFindOne.mockResolvedValue(existing)

      const result = await follow('u1', 'user', 'u2')

      expect(result).toBe(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should create new follow if not already following', async () => {
      const newFollow = { id: 'f2', followerId: 'u1', targetType: 'user', targetId: 'u2' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: newFollow })

      const result = await follow('u1', 'user', 'u2')

      expect(result).toEqual(newFollow)
      expect(mockCreate).toHaveBeenCalledWith('follows', {
        followerId: 'u1',
        targetType: 'user',
        targetId: 'u2',
      })
    })
  })

  describe('unfollow', () => {
    it('should delete matching follow records', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      await unfollow('u1', 'user', 'u2')

      expect(mockDeleteMany).toHaveBeenCalledWith('follows', [
        { field: 'followerId', operator: '=', value: 'u1' },
        { field: 'targetType', operator: '=', value: 'user' },
        { field: 'targetId', operator: '=', value: 'u2' },
      ])
    })
  })

  describe('getFollowers', () => {
    it('should return paginated followers with defaults', async () => {
      const followers = [{ id: 'f1', followerId: 'u1' }]
      mockFindMany.mockResolvedValue(followers)
      mockCount.mockResolvedValue(1)

      const result = await getFollowers('user', 'u2')

      expect(result).toEqual({ data: followers, total: 1, limit: 20, offset: 0 })
    })

    it('should use custom pagination', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getFollowers('user', 'u2', { limit: 10, offset: 5 })

      expect(mockFindMany).toHaveBeenCalledWith('follows', {
        where: [
          { field: 'targetType', operator: '=', value: 'user' },
          { field: 'targetId', operator: '=', value: 'u2' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 5,
      })
    })
  })

  describe('getFollowing', () => {
    it('should return paginated following with defaults', async () => {
      const following = [{ id: 'f1', targetType: 'project', targetId: 'p1' }]
      mockFindMany.mockResolvedValue(following)
      mockCount.mockResolvedValue(1)

      const result = await getFollowing('u1')

      expect(result).toEqual({ data: following, total: 1, limit: 20, offset: 0 })
    })
  })

  describe('isFollowing', () => {
    it('should return true when follow exists', async () => {
      mockFindOne.mockResolvedValue({ id: 'f1' })

      const result = await isFollowing('u1', 'user', 'u2')

      expect(result).toBe(true)
    })

    it('should return false when follow does not exist', async () => {
      mockFindOne.mockResolvedValue(null)

      const result = await isFollowing('u1', 'user', 'u2')

      expect(result).toBe(false)
    })
  })

  describe('getFollowerCount', () => {
    it('should return count of followers', async () => {
      mockCount.mockResolvedValue(42)

      const result = await getFollowerCount('user', 'u2')

      expect(result).toBe(42)
      expect(mockCount).toHaveBeenCalledWith('follows', [
        { field: 'targetType', operator: '=', value: 'user' },
        { field: 'targetId', operator: '=', value: 'u2' },
      ])
    })
  })

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      mockCount.mockResolvedValue(15)

      const result = await getFollowingCount('u1')

      expect(result).toBe(15)
      expect(mockCount).toHaveBeenCalledWith('follows', [
        { field: 'followerId', operator: '=', value: 'u1' },
      ])
    })
  })
})
import { readFileSync } from 'node:fs'

import ts from 'typescript'
