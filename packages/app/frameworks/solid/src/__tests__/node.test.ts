// @vitest-environment jsdom
/**
 * `rendersNode(node)` decides as React's `slot(node)` does: a resolved node that renders nothing
 * counts as not passed.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { rendersNode } from '../node.js'

describe('rendersNode', () => {
  it('is false for a node that renders nothing', () => {
    for (const nothing of [
      null,
      undefined,
      true,
      false,
      '',
      [],
      [null, false, ''],
      [[], [undefined]],
    ])
      expect(rendersNode(nothing)).toBe(false)
  })

  it('is true for a node that renders something', () => {
    const element = document.createElement('b')
    expect(rendersNode('Rename board')).toBe(true)
    expect(rendersNode(0)).toBe(true)
    expect(rendersNode(element)).toBe(true)
    expect(rendersNode(['', element])).toBe(true)
    expect(rendersNode([[null], ['Rename']])).toBe(true)
  })
})
