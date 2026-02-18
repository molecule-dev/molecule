import { describe, expect, it } from 'vitest'

import { createMemoryStorageProvider } from '../memory-provider.js'

describe('createMemoryStorageProvider', () => {
  it('should create a valid storage provider', () => {
    const provider = createMemoryStorageProvider()

    expect(typeof provider.get).toBe('function')
    expect(typeof provider.set).toBe('function')
    expect(typeof provider.remove).toBe('function')
    expect(typeof provider.clear).toBe('function')
    expect(typeof provider.keys).toBe('function')
  })

  it('should be isolated from other instances', async () => {
    const provider1 = createMemoryStorageProvider()
    const provider2 = createMemoryStorageProvider()

    await provider1.set('key', 'value1')
    await provider2.set('key', 'value2')

    expect(await provider1.get('key')).toBe('value1')
    expect(await provider2.get('key')).toBe('value2')
  })

  describe('get', () => {
    it('should get a stored value', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key', { name: 'John' })
      const result = await provider.get('key')

      expect(result).toEqual({ name: 'John' })
    })

    it('should return null for non-existent key', async () => {
      const provider = createMemoryStorageProvider()

      const result = await provider.get('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should store a value', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key', 'value')

      expect(await provider.get('key')).toBe('value')
    })

    it('should store complex objects', async () => {
      const provider = createMemoryStorageProvider()
      const complexObject = { nested: { value: true }, array: [1, 2, 3] }

      await provider.set('complex', complexObject)

      expect(await provider.get('complex')).toEqual(complexObject)
    })

    it('should store exact reference (no serialization)', async () => {
      const provider = createMemoryStorageProvider()
      const obj = { key: 'value' }

      await provider.set('ref', obj)
      const result = await provider.get('ref')

      expect(result).toBe(obj)
    })
  })

  describe('remove', () => {
    it('should remove a stored value', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key', 'value')
      await provider.remove('key')

      expect(await provider.get('key')).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear all values', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')
      await provider.clear()

      expect(await provider.get('key1')).toBeNull()
      expect(await provider.get('key2')).toBeNull()
      expect(await provider.keys()).toEqual([])
    })
  })

  describe('keys', () => {
    it('should return all keys', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('a', 1)
      await provider.set('b', 2)
      await provider.set('c', 3)

      const keys = await provider.keys()

      expect(keys).toHaveLength(3)
      expect(keys).toContain('a')
      expect(keys).toContain('b')
      expect(keys).toContain('c')
    })
  })

  describe('getMany', () => {
    it('should get multiple values', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')

      const results = await provider.getMany!(['key1', 'key2', 'key3'])

      expect(results.get('key1')).toBe('value1')
      expect(results.get('key2')).toBe('value2')
      expect(results.get('key3')).toBeNull()
    })
  })

  describe('setMany', () => {
    it('should set multiple values', async () => {
      const provider = createMemoryStorageProvider()

      await provider.setMany!([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])

      expect(await provider.get('key1')).toBe('value1')
      expect(await provider.get('key2')).toBe('value2')
    })
  })

  describe('removeMany', () => {
    it('should remove multiple values', async () => {
      const provider = createMemoryStorageProvider()

      await provider.set('key1', 'value1')
      await provider.set('key2', 'value2')
      await provider.set('key3', 'value3')

      await provider.removeMany!(['key1', 'key3'])

      expect(await provider.get('key1')).toBeNull()
      expect(await provider.get('key2')).toBe('value2')
      expect(await provider.get('key3')).toBeNull()
    })
  })
})
