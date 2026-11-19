/**
 * The path helpers every routing bond re-exports from `@molecule/app-routing/bond-utilities`:
 * react-router's own utility tests, run against the one shared implementation.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import {
  generatePath,
  matchPath,
  normalizePath,
  parseSearchParams,
  resolvePath,
  stringifyQuery,
} from '../bond-utilities.js'

describe('Utility Functions', () => {
  describe('parseSearchParams', () => {
    it('should parse simple search params', () => {
      const params = new URLSearchParams('page=1&limit=10')
      const result = parseSearchParams(params)

      expect(result.page).toBe('1')
      expect(result.limit).toBe('10')
    })

    it('should handle duplicate keys as arrays', () => {
      const params = new URLSearchParams('tag=react&tag=vue&tag=angular')
      const result = parseSearchParams(params)

      expect(result.tag).toEqual(['react', 'vue', 'angular'])
    })

    it('should return empty object for empty params', () => {
      const params = new URLSearchParams('')
      const result = parseSearchParams(params)

      expect(result).toEqual({})
    })

    it('should handle encoded values', () => {
      const params = new URLSearchParams('q=hello+world&path=%2Ffoo%2Fbar')
      const result = parseSearchParams(params)

      expect(result.q).toBe('hello world')
      expect(result.path).toBe('/foo/bar')
    })
  })

  describe('stringifyQuery', () => {
    it('should stringify simple params', () => {
      const result = stringifyQuery({ page: '1', limit: '10' })

      expect(result).toContain('page=1')
      expect(result).toContain('limit=10')
      expect(result.startsWith('?')).toBe(true)
    })

    it('should handle array values', () => {
      const result = stringifyQuery({ tags: ['react', 'vue'] })

      expect(result).toContain('tags=react')
      expect(result).toContain('tags=vue')
    })

    it('should filter undefined values', () => {
      const result = stringifyQuery({ page: '1', empty: undefined })

      expect(result).toContain('page=1')
      expect(result).not.toContain('empty')
    })

    it('should return empty string for empty params', () => {
      const result = stringifyQuery({})

      expect(result).toBe('')
    })

    it('should encode special characters', () => {
      const result = stringifyQuery({ q: 'hello world', path: '/foo/bar' })

      expect(result).toContain('q=hello%20world')
      expect(result).toContain('path=%2Ffoo%2Fbar')
    })
  })

  describe('matchPath', () => {
    it('should match simple path', () => {
      const match = matchPath('/products', '/products')

      expect(match).not.toBeNull()
      expect(match?.path).toBe('/products')
      expect(match?.isExact).toBe(true)
    })

    it('should match path with params', () => {
      const match = matchPath('/products/:id', '/products/123')

      expect(match).not.toBeNull()
      expect(match?.params.id).toBe('123')
    })

    it('should match path with multiple params', () => {
      const match = matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

      expect(match?.params).toEqual({ userId: '1', postId: '2' })
    })

    it('should return null for non-matching path', () => {
      const match = matchPath('/products/:id', '/users/123')

      expect(match).toBeNull()
    })

    it('should support wildcard matching', () => {
      const match = matchPath('/api/*', '/api/users/123')

      expect(match).not.toBeNull()
    })

    it('should respect exact option', () => {
      // exact=true by default (exact !== false)
      const exactMatch = matchPath('/products', '/products/extra')
      expect(exactMatch).toBeNull()

      // explicit exact=false for prefix matching
      const prefixMatch = matchPath('/products', '/products/extra', false)
      expect(prefixMatch).not.toBeNull()
    })
  })

  describe('generatePath', () => {
    it('should return pattern when no params', () => {
      const path = generatePath('/products')

      expect(path).toBe('/products')
    })

    it('should replace params in pattern', () => {
      const path = generatePath('/products/:id', { id: '123' })

      expect(path).toBe('/products/123')
    })

    it('should replace multiple params', () => {
      const path = generatePath('/users/:userId/posts/:postId', {
        userId: '1',
        postId: '2',
      })

      expect(path).toBe('/users/1/posts/2')
    })

    it('should throw for missing required param', () => {
      expect(() => generatePath('/products/:id', {})).toThrow(
        'Missing param "id" for path "/products/:id"',
      )
    })

    it('should throw I18nError with routing.error.missingParam key for missing param', () => {
      let caught: unknown
      try {
        generatePath('/products/:id', {})
      } catch (err) {
        caught = err
      }
      expect(caught).toBeInstanceOf(I18nError)
      expect((caught as I18nError).i18nKey).toBe('routing.error.missingParam')
      expect((caught as I18nError).i18nValues).toEqual({ name: 'id', pattern: '/products/:id' })
    })

    it('should encode param values', () => {
      const path = generatePath('/search/:query', { query: 'hello world' })

      expect(path).toBe('/search/hello%20world')
    })
  })

  describe('resolvePath', () => {
    it('should return absolute path as-is', () => {
      const result = resolvePath('/dashboard', '/any/path')

      expect(result).toBe('/dashboard')
    })

    it('should resolve relative path', () => {
      const result = resolvePath('details', '/products/123')

      expect(result).toBe('/products/details')
    })

    it('should resolve parent path with ..', () => {
      const result = resolvePath('../settings', '/users/123/profile')

      expect(result).toBe('/users/settings')
    })

    it('should handle current directory with .', () => {
      const result = resolvePath('./details', '/products/123')

      expect(result).toBe('/products/details')
    })

    it('should resolve multiple .. segments', () => {
      const result = resolvePath('../../dashboard', '/users/123/posts/456')

      expect(result).toBe('/users/dashboard')
    })
  })

  describe('normalizePath', () => {
    it('should remove trailing slash', () => {
      expect(normalizePath('/products/')).toBe('/products')
    })

    it('should remove multiple trailing slashes', () => {
      expect(normalizePath('/products///')).toBe('/products')
    })

    it('should keep root path', () => {
      expect(normalizePath('/')).toBe('/')
    })

    it('should not modify path without trailing slash', () => {
      expect(normalizePath('/products')).toBe('/products')
    })
  })
})
