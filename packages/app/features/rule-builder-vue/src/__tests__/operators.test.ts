import { describe, expect, it } from 'vitest'

import { defaultOperators, OP, operatorById, operatorsFor } from '../operators.js'
import type { RuleField } from '../types.js'

describe('operators — catalog + lookup', () => {
  it('defaultOperators covers every built-in field type', () => {
    expect(Object.keys(defaultOperators).sort()).toEqual([
      'boolean',
      'date',
      'number',
      'select',
      'text',
    ])
  })

  it('text operators include unary is-empty / is-not-empty', () => {
    const ids = defaultOperators.text.map((o) => o.id)
    expect(ids).toContain(OP.IsEmpty)
    expect(ids).toContain(OP.IsNotEmpty)
    const isEmpty = defaultOperators.text.find((o) => o.id === OP.IsEmpty)!
    expect(isEmpty.arity).toBe('unary')
  })

  it('number "between" operator declares between arity', () => {
    const between = defaultOperators.number.find((o) => o.id === OP.Between)!
    expect(between.arity).toBe('between')
  })

  it('operatorsFor prefers the field override over the default catalog', () => {
    const field: RuleField = {
      name: 'plan',
      label: 'Plan',
      type: 'text',
      operators: [{ id: 'matches', label: 'matches' }],
    }
    expect(operatorsFor(field).map((o) => o.id)).toEqual(['matches'])
  })

  it('operatorsFor falls back to defaults when no override is given', () => {
    const field: RuleField = { name: 'spend', label: 'Spend', type: 'number' }
    expect(operatorsFor(field).length).toBe(defaultOperators.number.length)
  })

  it('operatorById finds operators by id within the field catalog', () => {
    const field: RuleField = { name: 'spend', label: 'Spend', type: 'number' }
    expect(operatorById(field, OP.GreaterThan)?.id).toBe(OP.GreaterThan)
    expect(operatorById(field, 'unknown')).toBeUndefined()
  })
})
