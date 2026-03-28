import { describe, expect, it } from 'vitest'

import { MOL_ID_ATTR, molId, molIdProps, molSelector, molSelectorPrefix } from '../automation.js'

describe('automation', () => {
  describe('molId', () => {
    it('should join component and context', () => {
      expect(molId('button', 'login')).toBe('button-login')
    })

    it('should join component, context, and qualifier', () => {
      expect(molId('button', 'login', 'submit')).toBe('button-login-submit')
    })

    it('should omit qualifier when undefined', () => {
      expect(molId('input', 'email')).toBe('input-email')
    })

    it('should omit qualifier when empty string', () => {
      expect(molId('input', 'email', '')).toBe('input-email')
    })

    it('should handle numeric qualifiers as strings', () => {
      expect(molId('card', 'product', '123')).toBe('card-product-123')
    })
  })

  describe('MOL_ID_ATTR', () => {
    it('should be "data-mol-id"', () => {
      expect(MOL_ID_ATTR).toBe('data-mol-id')
    })
  })

  describe('molIdProps', () => {
    it('should return an object with the data-mol-id attribute', () => {
      const result = molIdProps('button-login-submit')
      expect(result).toEqual({ 'data-mol-id': 'button-login-submit' })
    })

    it('should work with molId output', () => {
      const id = molId('input', 'search', 'query')
      const props = molIdProps(id)
      expect(props).toEqual({ 'data-mol-id': 'input-search-query' })
    })
  })

  describe('molSelector', () => {
    it('should return a CSS attribute selector', () => {
      expect(molSelector('button-login-submit')).toBe('[data-mol-id="button-login-submit"]')
    })

    it('should work with molId output', () => {
      const id = molId('card', 'product', '42')
      expect(molSelector(id)).toBe('[data-mol-id="card-product-42"]')
    })
  })

  describe('molSelectorPrefix', () => {
    it('should return a CSS attribute prefix selector', () => {
      expect(molSelectorPrefix('button-login')).toBe('[data-mol-id^="button-login"]')
    })

    it('should match component type alone', () => {
      expect(molSelectorPrefix('button')).toBe('[data-mol-id^="button"]')
    })
  })
})
