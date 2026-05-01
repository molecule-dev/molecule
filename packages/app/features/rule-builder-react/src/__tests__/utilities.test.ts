import { describe, expect, it } from 'vitest'

import type { Rule, RuleGroup, RuleLeaf } from '../types.js'
import {
  appendToGroup,
  emptyGroup,
  emptyLeaf,
  makeId,
  removeById,
  replaceById,
  toggleGroupOp,
} from '../utilities.js'

const leaf = (id: string, field = '', op = ''): RuleLeaf => ({ kind: 'leaf', id, field, op })
const group = (id: string, op: 'AND' | 'OR', children: Rule[]): RuleGroup => ({
  kind: 'group',
  id,
  op,
  children,
})

describe('utilities — pure rule-tree helpers', () => {
  it('makeId returns short non-empty string', () => {
    const id = makeId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('emptyLeaf has fresh blank fields', () => {
    const l = emptyLeaf()
    expect(l.kind).toBe('leaf')
    expect(l.field).toBe('')
    expect(l.op).toBe('')
    expect(l.id.length).toBeGreaterThan(0)
  })

  it('emptyGroup defaults to AND with one empty leaf inside', () => {
    const g = emptyGroup()
    expect(g.kind).toBe('group')
    expect(g.op).toBe('AND')
    expect(g.children).toHaveLength(1)
    expect(g.children[0].kind).toBe('leaf')
  })

  it('replaceById swaps the matching node anywhere in the tree', () => {
    const tree: Rule = group('root', 'AND', [
      leaf('a'),
      group('inner', 'OR', [leaf('b'), leaf('c')]),
    ])
    const next = replaceById(tree, 'b', leaf('b2', 'plan', 'eq')) as RuleGroup
    const inner = next.children[1] as RuleGroup
    expect(inner.children[0].id).toBe('b2')
    expect((inner.children[0] as RuleLeaf).field).toBe('plan')
  })

  it('removeById drops the matching node from a group', () => {
    const tree: Rule = group('root', 'AND', [leaf('a'), leaf('b'), leaf('c')])
    const next = removeById(tree, 'b') as RuleGroup
    expect(next.children.map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('appendToGroup adds a child to the matching group', () => {
    const tree: Rule = group('root', 'AND', [leaf('a')])
    const next = appendToGroup(tree, 'root', leaf('b')) as RuleGroup
    expect(next.children.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('toggleGroupOp flips AND ↔ OR on the matching group', () => {
    const tree: Rule = group('root', 'AND', [leaf('a')])
    const flipped = toggleGroupOp(tree, 'root') as RuleGroup
    expect(flipped.op).toBe('OR')
    const back = toggleGroupOp(flipped, 'root') as RuleGroup
    expect(back.op).toBe('AND')
  })

  it('helpers do not mutate the input tree', () => {
    const tree: Rule = group('root', 'AND', [leaf('a'), leaf('b')])
    const snapshot = JSON.stringify(tree)
    removeById(tree, 'a')
    appendToGroup(tree, 'root', leaf('z'))
    toggleGroupOp(tree, 'root')
    replaceById(tree, 'a', leaf('a', 'plan', 'eq'))
    expect(JSON.stringify(tree)).toBe(snapshot)
  })
})
