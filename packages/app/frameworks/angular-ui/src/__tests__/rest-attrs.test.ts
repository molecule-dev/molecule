// @vitest-environment jsdom
/**
 * Tests for angular-ui's rest-attribute helpers.
 *
 * Found 2026-11-15: a feature's accessible label follows a locale switch, but
 * `moveRestAttributes` had taken the first value off the host once — so the
 * inner element kept the first label forever while the host accumulated the
 * re-bound one, and the Angular port stopped matching React's goldens the
 * moment its label text changed after mount. `reapplyRestAttributes` is the
 * fix; these tests pin both helpers' contracts.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

const { moveRestAttributes, reapplyRestAttributes } = await import('../utilities/rest-attrs.js')

describe('moveRestAttributes', () => {
  it('moves every rest attribute onto the target and keeps framework markers', () => {
    const host = document.createElement('div')
    host.setAttribute('class', 'wrapper')
    host.setAttribute('style', 'color: red')
    host.setAttribute('mol-input', '')
    host.setAttribute('ng-version', '18')
    host.setAttribute('_ngcontent-abc', '')
    host.setAttribute('data-parity-unwrap', '')
    host.setAttribute('aria-label', 'URL')
    host.setAttribute('data-testid', 'url-field')
    const target = document.createElement('input')
    const moved = moveRestAttributes(host, target)
    expect(moved.sort()).toEqual(['aria-label', 'data-testid'])
    expect(target.getAttribute('aria-label')).toBe('URL')
    expect(target.getAttribute('data-testid')).toBe('url-field')
    // Framework + component host markers stay on the host.
    expect(host.getAttribute('class')).toBe('wrapper')
    expect(host.getAttribute('style')).toBe('color: red')
    expect(host.hasAttribute('mol-input')).toBe(true)
    expect(host.hasAttribute('ng-version')).toBe(true)
    expect(host.hasAttribute('_ngcontent-abc')).toBe(true)
    expect(host.hasAttribute('data-parity-unwrap')).toBe(true)
  })

  it('returns no names when the target element is missing', () => {
    const host = document.createElement('div')
    host.setAttribute('aria-label', 'URL')
    expect(moveRestAttributes(host, null)).toEqual([])
    // Nothing moved: the attribute is still on the host.
    expect(host.getAttribute('aria-label')).toBe('URL')
  })
})

describe('reapplyRestAttributes', () => {
  it('moves a re-bound rest attribute again, so the inner element follows the new value', () => {
    const host = document.createElement('div')
    host.setAttribute('aria-label', 'HTTP method')
    const target = document.createElement('select')
    moveRestAttributes(host, target)
    expect(target.getAttribute('aria-label')).toBe('HTTP method')
    // The caller re-binds the attribute: Angular writes the changed value
    // back onto the host after the first move.
    host.setAttribute('aria-label', '⟦HTTP method⟧')
    reapplyRestAttributes(host, target)
    expect(target.getAttribute('aria-label')).toBe('⟦HTTP method⟧')
    expect(host.hasAttribute('aria-label')).toBe(false)
  })

  it('never moves aria-describedby, whose merged value the component owns', () => {
    const host = document.createElement('div')
    host.setAttribute('aria-label', 'URL')
    host.setAttribute('aria-describedby', 'field-1-error')
    const target = document.createElement('input')
    moveRestAttributes(host, target)
    // The component merges the captured host value with the field context's
    // own target on the inner element's binding.
    target.setAttribute('aria-describedby', 'field-1-error field-1-hint')
    // The caller re-binds both: describedby must stay untouched.
    host.setAttribute('aria-label', '⟦URL⟧')
    host.setAttribute('aria-describedby', 'renamed-id')
    reapplyRestAttributes(host, target)
    expect(target.getAttribute('aria-label')).toBe('⟦URL⟧')
    expect(target.getAttribute('aria-describedby')).toBe('field-1-error field-1-hint')
    expect(host.getAttribute('aria-describedby')).toBe('renamed-id')
  })

  it('moves nothing when nothing was re-bound', () => {
    const host = document.createElement('div')
    const target = document.createElement('input')
    expect(reapplyRestAttributes(host, target)).toEqual([])
    expect(reapplyRestAttributes(host, null)).toEqual([])
  })
})
