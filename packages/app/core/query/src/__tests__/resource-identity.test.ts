import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQueryResource } from '../index.js'

const cache = vi.hoisted(() => ({ set: vi.fn(), invalidate: vi.fn() }))
vi.mock(import('../provider.js'), async (importOriginal) => ({
  ...(await importOriginal()),
  getQueryClient: () => cache,
}))

const pinnedNote = { id: 'folder/note 1', pinned: true }
const post = vi.fn(async () => ({ data: pinnedNote }))
const remove = vi.fn(async () => ({ data: { ...pinnedNote, pinned: false } }))
const put = vi.fn(async () => ({ data: pinnedNote }))
const http = vi.fn(() => ({ get: vi.fn(), post, put, patch: vi.fn(), delete: remove }))
const notes = createQueryResource<typeof pinnedNote>({ name: 'notes', path: '/notes', http })

beforeEach(() => vi.clearAllMocks())

describe('query resource record identity', () => {
  it('rejects both directions of a toggle before sending a request with an empty ID', async () => {
    const results = await Promise.allSettled([
      notes.toggle('reader', '', 'pin', true),
      notes.toggle('reader', '', 'pin', false),
    ])
    expect(post).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(http).not.toHaveBeenCalled()
    expect(results).toEqual([
      { status: 'rejected', reason: new Error('notes: a record ID is required') },
      { status: 'rejected', reason: new Error('notes: a record ID is required') },
    ])
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  it('rejects update and removal before acquiring the transport for a missing ID', async () => {
    const results = await Promise.allSettled([
      notes.update('reader', '', { pinned: true }),
      notes.remove('reader', ''),
    ])
    expect(http).not.toHaveBeenCalled()
    expect(results).toEqual([
      { status: 'rejected', reason: new Error('notes: a record ID is required') },
      { status: 'rejected', reason: new Error('notes: a record ID is required') },
    ])
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('encodes a loaded ID as one segment and publishes both saved toggle responses', async () => {
    await expect(notes.toggle('reader', pinnedNote.id, 'pin', true)).resolves.toEqual(pinnedNote)
    await expect(notes.toggle('reader', pinnedNote.id, 'pin', false)).resolves.toEqual({
      ...pinnedNote,
      pinned: false,
    })
    expect(post).toHaveBeenCalledExactlyOnceWith('/notes/folder%2Fnote%201/pin')
    expect(remove).toHaveBeenCalledExactlyOnceWith('/notes/folder%2Fnote%201/pin')
    expect(cache.set.mock.calls).toEqual([
      [['notes', 'reader', 'detail', pinnedNote.id], pinnedNote],
      [['notes', 'reader', 'detail', pinnedNote.id], { ...pinnedNote, pinned: false }],
    ])
  })

  it('still treats an empty collection ID as no detail read and creates at the collection path', async () => {
    expect(notes.detail('reader', '')).toBeNull()
    expect(http).not.toHaveBeenCalled()
    await expect(notes.create('reader', { pinned: true })).resolves.toEqual(pinnedNote)
    expect(post).toHaveBeenCalledExactlyOnceWith('/notes', { pinned: true })
  })
})
