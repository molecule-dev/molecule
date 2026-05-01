/**
 * Unit tests for the in-memory job store + setJobStore swap-out hook.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { createMemoryJobStore, getJobStore, setJobStore } from '../jobStore.js'

describe('createMemoryJobStore', () => {
  it('round-trips a status entry', async () => {
    const store = createMemoryJobStore()
    await store.set('a', { status: 'queued' })
    expect(await store.get('a')).toEqual({ status: 'queued' })
  })

  it('returns undefined for unknown ids', async () => {
    const store = createMemoryJobStore()
    expect(await store.get('nope')).toBeUndefined()
  })

  it('patches in-place, creating absent entries', async () => {
    const store = createMemoryJobStore()
    const next = await store.patch('a', { status: 'rendering', progress: 0.5 })
    expect(next.status).toBe('rendering')
    expect(next.progress).toBe(0.5)

    const after = await store.patch('a', { progress: 0.75 })
    expect(after.status).toBe('rendering')
    expect(after.progress).toBe(0.75)
  })

  it('deletes', async () => {
    const store = createMemoryJobStore()
    await store.set('a', { status: 'queued' })
    await store.delete('a')
    expect(await store.get('a')).toBeUndefined()
  })
})

describe('setJobStore / getJobStore', () => {
  afterEach(() => {
    setJobStore(undefined)
  })

  it('replaces and resets the active store', async () => {
    const replacement = createMemoryJobStore()
    setJobStore(replacement)
    expect(getJobStore()).toBe(replacement)
    setJobStore(undefined)
    expect(getJobStore()).not.toBe(replacement)
  })
})
