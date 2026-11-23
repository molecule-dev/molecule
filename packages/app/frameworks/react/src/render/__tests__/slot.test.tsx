/**
 * `slot(node)` treats a node prop that renders nothing as one that was not passed.
 *
 * @module
 */
import { createElement, Fragment } from 'react'
import { describe, expect, it } from 'vitest'

import { slot } from '../slot.js'

describe('slot', () => {
  it('returns undefined for a node that renders nothing', () => {
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
      expect(slot(nothing)).toBeUndefined()
    expect(slot(createElement(Fragment))).toBeUndefined()
    expect(slot(createElement(Fragment, null, null, false))).toBeUndefined()
    expect(slot(createElement(Fragment, null, createElement(Fragment, null, '')))).toBeUndefined()
  })

  it('returns a node that renders something unchanged', () => {
    const element = createElement('b', null, 'Title')
    const list = ['', element]
    const fragment = createElement(Fragment, null, null, 'Rename')
    expect(slot('Rename board')).toBe('Rename board')
    expect(slot(0)).toBe(0)
    expect(slot(element)).toBe(element)
    expect(slot(list)).toBe(list)
    expect(slot(fragment)).toBe(fragment)
    // A component element counts: only rendering it could tell that it renders nothing.
    const empty = createElement(() => null)
    expect(slot(empty)).toBe(empty)
  })
})
