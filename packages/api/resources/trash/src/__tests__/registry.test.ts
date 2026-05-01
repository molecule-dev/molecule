import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearRestoreCallbacks,
  getRestoreCallback,
  registerRestoreCallback,
  unregisterRestoreCallback,
} from '../registry.js'

describe('@molecule/api-trash restore-callback registry', () => {
  afterEach(() => {
    clearRestoreCallbacks()
  })

  it('returns undefined for unregistered resource types', () => {
    expect(getRestoreCallback('document')).toBeUndefined()
  })

  it('register / lookup / unregister roundtrip', () => {
    const cb = vi.fn()
    registerRestoreCallback('document', cb)
    expect(getRestoreCallback('document')).toBe(cb)

    expect(unregisterRestoreCallback('document')).toBe(true)
    expect(getRestoreCallback('document')).toBeUndefined()
    expect(unregisterRestoreCallback('document')).toBe(false)
  })

  it('overwrites on re-registration', () => {
    const a = vi.fn()
    const b = vi.fn()
    registerRestoreCallback('document', a)
    registerRestoreCallback('document', b)
    expect(getRestoreCallback('document')).toBe(b)
  })

  it('clearRestoreCallbacks removes everything', () => {
    registerRestoreCallback('a', vi.fn())
    registerRestoreCallback('b', vi.fn())
    clearRestoreCallbacks()
    expect(getRestoreCallback('a')).toBeUndefined()
    expect(getRestoreCallback('b')).toBeUndefined()
  })
})
