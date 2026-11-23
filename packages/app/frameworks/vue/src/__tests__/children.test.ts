/**
 * `toChildArray` flattens the shapes a Vue slot hands over into the child list
 * React counts: a `v-for` Fragment's entries, and nothing for a false `v-if`
 * (a Comment vnode), an empty text node or a rendered-nothing value.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'
import { createCommentVNode, createTextVNode, Fragment, h, reactive } from 'vue'

import { toChildArray } from '../children.js'

describe('toChildArray', () => {
  it('flattens a v-for Fragment into one entry per item', () => {
    const fragment = h(Fragment, null, [h('img', { key: 'a' }), h('img', { key: 'b' })])
    expect(toChildArray(fragment)).toEqual([fragment.children[0], fragment.children[1]])
  })

  it('drops a false v-if (a Comment vnode) and an empty text node', () => {
    const fragment = h(Fragment, null, [
      h('b', null, 'New'),
      createCommentVNode('v-if', true),
      createTextVNode(''),
      h('b', null, 'checkout'),
    ])
    const children = toChildArray(fragment)
    expect(children).toHaveLength(2)
    expect(children.map((c) => (c as { children?: unknown }).children)).toEqual(['New', 'checkout'])
  })

  it('drops the values React renders as nothing and keeps zero', () => {
    expect(toChildArray([null, undefined, false, true, '', 0])).toEqual([0])
  })

  it('flattens nested arrays in order', () => {
    const a = h('i', null, 'a')
    const b = h('i', null, 'b')
    expect(toChildArray([[a], [b]])).toEqual([a, b])
  })

  it('unwraps a reactive proxy around a node', () => {
    const node = h('span', null, 'x')
    expect(toChildArray(reactive({ node }).node)).toEqual([node])
  })

  it('keeps an ordinary node as a one-entry list', () => {
    const node = h('span', null, 'x')
    expect(toChildArray(node)).toEqual([node])
  })
})
