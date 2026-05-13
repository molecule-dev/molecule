const {
  mockCreate,
  mockDeleteById,
  mockFindById,
  mockFindMany,
  mockQuery,
  mockUpdateById,
  mockEncrypt,
  mockDecrypt,
  mockHasEncryption,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockDeleteById: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockQuery: vi.fn(),
  mockUpdateById: vi.fn(),
  mockEncrypt: vi.fn(),
  mockDecrypt: vi.fn(),
  mockHasEncryption: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  query: mockQuery,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-encryption', () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
  hasProvider: mockHasEncryption,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  computeStreak,
  createEntryForOwner,
  decryptIfNeeded,
  deleteEntryForOwner,
  exportEntries,
  formatExport,
  getEntryForOwner,
  listEntriesForOwner,
  shapeEntry,
  updateEntryForOwner,
} from '../service.js'
import {
  type JournalEntryRow,
  levelByScore,
  type MoodEntryRow,
  normalizeScore,
  SCORE_BY_LEVEL,
} from '../types.js'

function makeEntry(overrides: Partial<JournalEntryRow> = {}): JournalEntryRow {
  return {
    id: 'e-1',
    user_id: 'user-1',
    written_at: '2026-05-13T08:00:00.000Z',
    title: 'Title',
    body: 'Hello world.',
    body_encrypted: null,
    body_iv: null,
    mood_id: null,
    prompt_id: null,
    activity_ids: '[]',
    tags: '[]',
    word_count: 2,
    ai_summary: null,
    ai_themes: null,
    is_private: true,
    created_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function makeMood(overrides: Partial<MoodEntryRow> = {}): MoodEntryRow {
  return {
    id: 'm-1',
    user_id: 'user-1',
    recorded_at: '2026-05-13T08:00:00.000Z',
    score: 3,
    energy: null,
    anxiety: null,
    label: 'neutral',
    activities: '[]',
    notes: null,
    journal_entry_id: null,
    created_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockHasEncryption.mockReturnValue(false)
})

describe('types — SCORE_BY_LEVEL / levelByScore / normalizeScore', () => {
  it('SCORE_BY_LEVEL maps labels to 1..5', () => {
    expect(SCORE_BY_LEVEL.struggling).toBe(1)
    expect(SCORE_BY_LEVEL.low).toBe(2)
    expect(SCORE_BY_LEVEL.neutral).toBe(3)
    expect(SCORE_BY_LEVEL.good).toBe(4)
    expect(SCORE_BY_LEVEL.radiant).toBe(5)
  })

  it('levelByScore rounds + clamps to [1..5]', () => {
    expect(levelByScore(0)).toBe('struggling') // clamped up
    expect(levelByScore(6)).toBe('radiant') // clamped down
    expect(levelByScore(3.4)).toBe('neutral') // round
    expect(levelByScore(3.6)).toBe('good') // round
    expect(levelByScore(null)).toBe('neutral') // null → 3 → neutral
    expect(levelByScore(undefined)).toBe('neutral')
  })

  it('normalizeScore maps 1..5 to 0..1', () => {
    expect(normalizeScore(1)).toBe(0)
    expect(normalizeScore(5)).toBe(1)
    expect(normalizeScore(3)).toBe(0.5)
    expect(normalizeScore(null)).toBe(0.5) // null → midpoint
  })
})

describe('decryptIfNeeded', () => {
  it('returns plaintext body when encryption is unbonded', async () => {
    mockHasEncryption.mockReturnValue(false)
    expect(await decryptIfNeeded(makeEntry({ body: 'hello' }))).toBe('hello')
    expect(mockDecrypt).not.toHaveBeenCalled()
  })

  it('returns plaintext body when there is no body_encrypted column', async () => {
    mockHasEncryption.mockReturnValue(true)
    expect(await decryptIfNeeded(makeEntry({ body: 'plain', body_encrypted: null }))).toBe('plain')
    expect(mockDecrypt).not.toHaveBeenCalled()
  })

  it('decrypts using user_id as the key namespace', async () => {
    mockHasEncryption.mockReturnValue(true)
    mockDecrypt.mockResolvedValue('decoded')
    const out = await decryptIfNeeded(makeEntry({ body_encrypted: 'cipher', user_id: 'u-9' }))
    expect(out).toBe('decoded')
    expect(mockDecrypt).toHaveBeenCalledWith('cipher', 'u-9')
  })

  it('falls back to plaintext body when decrypt throws', async () => {
    mockHasEncryption.mockReturnValue(true)
    mockDecrypt.mockRejectedValue(new Error('bad key'))
    const out = await decryptIfNeeded(makeEntry({ body: 'backup', body_encrypted: 'cipher' }))
    expect(out).toBe('backup')
  })

  it('falls back to empty string when both columns are null', async () => {
    expect(await decryptIfNeeded(makeEntry({ body: null }))).toBe('')
  })
})

describe('shapeEntry', () => {
  it('builds the public shape from a row + body', async () => {
    mockFindById.mockResolvedValue(null) // no mood
    const out = await shapeEntry(makeEntry({ tags: JSON.stringify(['a', 'b']) }), 'Hello')
    expect(out.id).toBe('e-1')
    expect(out.body).toBe('Hello')
    expect(out.tags).toEqual(['a', 'b'])
    expect(out.mood).toBe('neutral') // default when no mood
  })

  it('preview truncates long bodies at 200 chars with ellipsis', async () => {
    mockFindById.mockResolvedValue(null)
    const long = 'a'.repeat(300)
    const out = await shapeEntry(makeEntry(), long)
    expect(out.preview.length).toBe(198) // 197 + '…'
    expect(out.preview.endsWith('…')).toBe(true)
  })

  it('preview collapses whitespace and trims', async () => {
    mockFindById.mockResolvedValue(null)
    const out = await shapeEntry(makeEntry(), '  hello\n\n  world  ')
    expect(out.preview).toBe('hello world')
  })

  it('resolves mood label from the linked mood row', async () => {
    mockFindById.mockResolvedValue(makeMood({ score: 5 }))
    const out = await shapeEntry(makeEntry({ mood_id: 'm-1' }), 'body')
    expect(out.mood).toBe('radiant')
  })

  it('parses tags + ai_themes from JSON strings', async () => {
    mockFindById.mockResolvedValue(null)
    const out = await shapeEntry(
      makeEntry({
        tags: JSON.stringify(['x']),
        ai_themes: JSON.stringify(['theme-1']),
      }),
      'b',
    )
    expect(out.tags).toEqual(['x'])
    expect(out.ai_themes).toEqual(['theme-1'])
  })

  it('handles malformed JSON in tags/themes by returning []', async () => {
    mockFindById.mockResolvedValue(null)
    const out = await shapeEntry(makeEntry({ tags: '{not json}', ai_themes: '{also not}' }), 'b')
    expect(out.tags).toEqual([])
    expect(out.ai_themes).toEqual([])
  })
})

describe('listEntriesForOwner', () => {
  it('scopes by user_id, orders desc, default limit 100', async () => {
    mockFindMany.mockResolvedValue([])
    await listEntriesForOwner('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'user_id', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([{ field: 'written_at', direction: 'desc' }])
    expect(args.limit).toBe(100)
  })

  it('honours explicit limit', async () => {
    mockFindMany.mockResolvedValue([])
    await listEntriesForOwner('user-1', 5)
    expect(mockFindMany.mock.calls[0][1].limit).toBe(5)
  })
})

describe('getEntryForOwner — IDOR', () => {
  it('returns null for missing entry', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getEntryForOwner('user-1', 'e-1')).toBeNull()
  })

  it('returns null for cross-owner entry', async () => {
    mockFindById.mockResolvedValue(makeEntry({ user_id: 'other' }))
    expect(await getEntryForOwner('user-1', 'e-1')).toBeNull()
  })

  it('returns shaped entry for owner', async () => {
    mockFindById
      .mockResolvedValueOnce(makeEntry()) // owner check
      .mockResolvedValueOnce(null) // no mood
    const out = await getEntryForOwner('user-1', 'e-1')
    expect(out?.id).toBe('e-1')
  })
})

describe('createEntryForOwner', () => {
  it('computes word_count from body whitespace-split', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry({ id: 'e-new', word_count: 6 }))
    await createEntryForOwner('user-1', { body: 'one two three four five six' })
    expect(mockCreate.mock.calls[0][1].word_count).toBe(6)
  })

  it('extra whitespace does not inflate word_count', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry())
    await createEntryForOwner('user-1', { body: '   one   two\n\nthree   ' })
    expect(mockCreate.mock.calls[0][1].word_count).toBe(3)
  })

  it('encrypts body when encryption is bonded; nulls body_encrypted otherwise', async () => {
    mockHasEncryption.mockReturnValue(true)
    mockEncrypt.mockResolvedValue('CIPHERTEXT')
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry())
    await createEntryForOwner('user-1', { body: 'secret' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.body_encrypted).toBe('CIPHERTEXT')
    expect(mockEncrypt).toHaveBeenCalledWith('secret', 'user-1')
  })

  it('stores JSON-stringified tags array', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry())
    await createEntryForOwner('user-1', { body: 'b', tags: ['a', 'b'] })
    expect(mockCreate.mock.calls[0][1].tags).toBe('["a","b"]')
  })

  it('initialises is_private=true', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry())
    await createEntryForOwner('user-1', { body: 'b' })
    expect(mockCreate.mock.calls[0][1].is_private).toBe(true)
  })

  it('mood = same-day mood row: updates score in place (no new mood row)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'm-existing' }] })
    mockCreate.mockResolvedValueOnce({ data: { id: 'e-new' } })
    mockFindById.mockResolvedValue(makeEntry({ mood_id: 'm-existing' }))
    await createEntryForOwner('user-1', { body: 'b', mood: 'radiant' })
    // First updateById on mood; createEntry call uses mood_id 'm-existing'
    const moodUpdate = mockUpdateById.mock.calls.find((c) => c[0] === 'mood_entries')
    expect(moodUpdate?.[1]).toBe('m-existing')
    expect(moodUpdate?.[2]).toMatchObject({ score: 5, label: 'radiant' })
    const entryCreate = mockCreate.mock.calls.find((c) => c[0] === 'journal_entries')
    expect(entryCreate?.[1].mood_id).toBe('m-existing')
  })

  it('mood = no same-day row: creates a mood + links journal_entry_id back to it', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    // Mood create first, then entry create
    mockCreate
      .mockResolvedValueOnce({ data: { id: 'm-new' } }) // mood
      .mockResolvedValueOnce({ data: { id: 'e-new' } }) // entry
    mockFindById.mockResolvedValue(makeEntry({ mood_id: 'm-new' }))
    await createEntryForOwner('user-1', { body: 'b', mood: 'good' })
    // Mood-back-link via updateById('mood_entries', 'm-new', { journal_entry_id: 'e-new' })
    const moodUpdate = mockUpdateById.mock.calls.find((c) => c[0] === 'mood_entries')
    expect(moodUpdate?.[2]).toEqual({ journal_entry_id: 'e-new' })
  })

  it('returns null when the entry create fails to return an id', async () => {
    mockCreate.mockResolvedValueOnce({ data: null })
    const out = await createEntryForOwner('user-1', { body: 'b' })
    expect(out).toBeNull()
  })
})

describe('updateEntryForOwner', () => {
  it('refuses cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeEntry({ user_id: 'other' }))
    expect(await updateEntryForOwner('user-1', 'e-1', { title: 'X' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('only patches fields that were provided', async () => {
    mockFindById
      .mockResolvedValueOnce(makeEntry()) // owner check
      .mockResolvedValueOnce(makeEntry()) // refresh
      .mockResolvedValueOnce(null) // mood lookup in shapeEntry
    await updateEntryForOwner('user-1', 'e-1', { title: 'new title' })
    const patch = mockUpdateById.mock.calls.find((c) => c[0] === 'journal_entries')?.[2]
    expect(patch.title).toBe('new title')
    expect(patch.body).toBeUndefined()
    expect(patch.word_count).toBeUndefined()
  })

  it('recomputes word_count and re-encrypts when body changes', async () => {
    mockHasEncryption.mockReturnValue(true)
    mockEncrypt.mockResolvedValue('CIPHER-NEW')
    mockFindById
      .mockResolvedValueOnce(makeEntry())
      .mockResolvedValueOnce(makeEntry())
      .mockResolvedValueOnce(null)
    await updateEntryForOwner('user-1', 'e-1', { body: 'a b c d' })
    const patch = mockUpdateById.mock.calls.find((c) => c[0] === 'journal_entries')?.[2]
    expect(patch.word_count).toBe(4)
    expect(patch.body_encrypted).toBe('CIPHER-NEW')
  })

  it('mood change reuses existing mood_id row (no new mood)', async () => {
    mockFindById
      .mockResolvedValueOnce(makeEntry({ mood_id: 'm-1' }))
      .mockResolvedValueOnce(makeEntry())
      .mockResolvedValueOnce(null)
    await updateEntryForOwner('user-1', 'e-1', { mood: 'radiant' })
    expect(mockCreate).not.toHaveBeenCalled() // no new mood row
    const moodPatch = mockUpdateById.mock.calls.find((c) => c[0] === 'mood_entries')?.[2]
    expect(moodPatch).toMatchObject({ score: 5, label: 'radiant' })
  })

  it('mood change creates new mood row when entry has no mood_id', async () => {
    mockFindById
      .mockResolvedValueOnce(makeEntry({ mood_id: null }))
      .mockResolvedValueOnce(makeEntry())
      .mockResolvedValueOnce(null)
    mockCreate.mockResolvedValue({ data: { id: 'm-new' } })
    await updateEntryForOwner('user-1', 'e-1', { mood: 'good' })
    expect(mockCreate).toHaveBeenCalledWith(
      'mood_entries',
      expect.objectContaining({ score: 4, label: 'good', journal_entry_id: 'e-1' }),
    )
  })
})

describe('deleteEntryForOwner — IDOR', () => {
  it('false for missing entry', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await deleteEntryForOwner('user-1', 'e-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('false for cross-owner entry', async () => {
    mockFindById.mockResolvedValue(makeEntry({ user_id: 'other' }))
    expect(await deleteEntryForOwner('user-1', 'e-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('true for rightful owner', async () => {
    mockFindById.mockResolvedValue(makeEntry())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteEntryForOwner('user-1', 'e-1')).toBe(true)
  })
})

describe('computeStreak', () => {
  function isoDaysAgo(n: number): string {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
  }

  it('returns 0 when no entries exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    expect(await computeStreak('user-1')).toBe(0)
  })

  it('returns 1 when only today is present', async () => {
    mockQuery.mockResolvedValue({ rows: [{ day: isoDaysAgo(0) }] })
    expect(await computeStreak('user-1')).toBe(1)
  })

  it('returns 3 for consecutive (today, yesterday, day-before)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ day: isoDaysAgo(0) }, { day: isoDaysAgo(1) }, { day: isoDaysAgo(2) }],
    })
    expect(await computeStreak('user-1')).toBe(3)
  })

  it('counts yesterday-only streak (no entry today yet)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ day: isoDaysAgo(1) }, { day: isoDaysAgo(2) }],
    })
    // First day (today) misses → cursor moves back; then yesterday matches → 1, then prior matches → 2
    expect(await computeStreak('user-1')).toBe(2)
  })

  it('stops counting at the first gap', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ day: isoDaysAgo(0) }, { day: isoDaysAgo(1) }, { day: isoDaysAgo(5) }],
    })
    expect(await computeStreak('user-1')).toBe(2)
  })
})

describe('exportEntries', () => {
  it('returns one record per entry, scoped + ordered desc', async () => {
    mockFindMany.mockResolvedValue([
      makeEntry({ id: 'e-1', word_count: 3 }),
      makeEntry({ id: 'e-2', word_count: 5 }),
    ])
    mockFindById.mockResolvedValue(null)
    const out = await exportEntries('user-1')
    expect(out.map((r) => r.id)).toEqual(['e-1', 'e-2'])
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'user_id', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([{ field: 'written_at', direction: 'desc' }])
  })
})

describe('formatExport', () => {
  const records = [
    {
      id: 'e-1',
      date: '2026-05-13T08:00:00.000Z',
      title: 'A',
      mood: 'neutral' as const,
      tags: ['x', 'y'],
      word_count: 2,
      body: 'Hello world',
    },
  ]

  it('json: returns application/json with records key', () => {
    const out = formatExport(records, 'json')
    expect(out.contentType).toBe('application/json; charset=utf-8')
    const parsed = JSON.parse(out.body) as { records: typeof records }
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0].id).toBe('e-1')
  })

  it('csv: header + one row per record, joins tags with pipe', () => {
    const out = formatExport(records, 'csv')
    expect(out.contentType).toBe('text/csv; charset=utf-8')
    const lines = out.body.split('\n')
    expect(lines[0]).toBe('id,date,title,mood,tags,word_count,body')
    expect(lines[1]).toContain('x|y')
  })

  it('csv: escapes embedded quotes, commas, and newlines', () => {
    const dangerous = [
      {
        ...records[0],
        title: 'has "quotes", commas',
        body: 'line1\nline2',
      },
    ]
    const out = formatExport(dangerous, 'csv')
    expect(out.body).toContain('"has ""quotes"", commas"')
    expect(out.body).toContain('"line1\nline2"')
  })

  it('txt: includes date, mood (upper), title, body, and tag line when present', () => {
    const out = formatExport(records, 'txt')
    expect(out.contentType).toBe('text/plain; charset=utf-8')
    expect(out.body).toContain('NEUTRAL')
    expect(out.body).toContain('## A')
    expect(out.body).toContain('Hello world')
    expect(out.body).toContain('Tags: x, y')
  })
})
