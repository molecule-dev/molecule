import { describe, expect, it } from 'vitest'

import { rendersNode } from '../node.js'

describe('rendersNode', () => {
  it("treats what React's slot() drops as rendering nothing", () => {
    for (const value of [null, undefined, true, false, '', [], [null, '', false], [[]]]) {
      expect(rendersNode(value)).toBe(false)
    }
  })

  it('treats any other value as rendering something', () => {
    for (const value of ['a', ' ', 0, 1, ['', 'a'], { label: 'x' }]) {
      expect(rendersNode(value)).toBe(true)
    }
  })
})
