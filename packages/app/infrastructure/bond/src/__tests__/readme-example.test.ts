/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import type { StateProvider } from '@molecule/app-state'
import { provider as zustandProvider } from '@molecule/app-state-zustand'

import { bond, configure, get, getAll, isBonded, require as bondRequire, reset } from '../index.js'

interface Exporter {
  extension: string
  serialize(rows: string[][]): string
}

describe('README @example', () => {
  afterEach(() => {
    reset()
    configure({ strict: false })
  })

  it('bonds a singleton and named providers and reads them back', () => {
    configure({ strict: true })
    bond('state', zustandProvider)

    const state = bondRequire<StateProvider>('state')
    expect(state).toBe(zustandProvider)
    const cart = state.createStore({ initialState: { items: 0 } })
    cart.setState({ items: 2 })
    expect(cart.getState().items).toBe(2)

    const csv: Exporter = {
      extension: 'csv',
      serialize: (rows) => rows.map((r) => r.join(',')).join('\n'),
    }
    const tsv: Exporter = {
      extension: 'tsv',
      serialize: (rows) => rows.map((r) => r.join('\t')).join('\n'),
    }
    bond('exporter', 'csv', csv)
    bond('exporter', 'tsv', tsv)

    const text = get<Exporter>('exporter', 'csv')?.serialize([
      ['id', 'name'],
      ['1', 'Ada'],
    ])
    expect(text).toBe('id,name\n1,Ada')
    expect(isBonded('exporter', 'tsv')).toBe(true)
    expect(getAll<Exporter>('exporter').size).toBe(2)
    expect(get('exporter')).toBeUndefined()
  })

  it('strict mode throws on a double bond; require throws when unbonded', () => {
    configure({ strict: true })
    bond('state', zustandProvider)
    expect(() => bond('state', zustandProvider)).toThrow(/already bonded/)
    expect(() => bondRequire('theme')).toThrow()
  })
})
