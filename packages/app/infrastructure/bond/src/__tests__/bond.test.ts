import { beforeEach, describe, expect, it } from 'vitest'

import { bond, get, getAll, isBonded, require as bondRequire, unbond, unbondAll } from '../bond.js'
import { configure, reset } from '../registry.js'

beforeEach(() => {
  reset()
  configure({ strict: false, verbose: false })
})

describe('bond() — singleton mode (2 args)', () => {
  it('bonds a provider as singleton', () => {
    const provider = { kind: 'singleton-provider' }
    bond('state', provider)
    expect(get('state')).toBe(provider)
  })

  it('overwrites prior singleton when strict=false (default)', () => {
    bond('state', { v: 1 })
    bond('state', { v: 2 })
    expect(get<{ v: number }>('state')?.v).toBe(2)
  })

  it('strict=true throws when re-bonding the same category', () => {
    configure({ strict: true })
    bond('state', { v: 1 })
    expect(() => bond('state', { v: 2 })).toThrow(/already bonded/)
  })

  it('bonding null/undefined removes the singleton', () => {
    bond('state', { v: 1 })
    bond('state', null)
    expect(get('state')).toBeUndefined()
  })

  it('different categories are independent', () => {
    bond('state', { kind: 'state' })
    bond('theme', { kind: 'theme' })
    expect(get<{ kind: string }>('state')?.kind).toBe('state')
    expect(get<{ kind: string }>('theme')?.kind).toBe('theme')
  })
})

describe('bond() — named mode (3 args)', () => {
  it('bonds a named provider', () => {
    const provider = { kind: 'react-router' }
    bond('routing', 'react', provider)
    expect(get('routing', 'react')).toBe(provider)
  })

  it('multiple names co-exist within the same category', () => {
    bond('routing', 'react', { kind: 'react' })
    bond('routing', 'vue', { kind: 'vue' })
    expect(get<{ kind: string }>('routing', 'react')?.kind).toBe('react')
    expect(get<{ kind: string }>('routing', 'vue')?.kind).toBe('vue')
  })

  it('strict=true throws when re-bonding same (type,name)', () => {
    configure({ strict: true })
    bond('routing', 'react', { v: 1 })
    expect(() => bond('routing', 'react', { v: 2 })).toThrow(/already bonded/)
  })

  it('strict=true allows re-bonding different names in the same category', () => {
    configure({ strict: true })
    bond('routing', 'react', { v: 1 })
    expect(() => bond('routing', 'vue', { v: 1 })).not.toThrow()
  })

  it('named and singleton stores are independent (same type)', () => {
    bond('routing', { kind: 'singleton' }) // singleton
    bond('routing', 'react', { kind: 'react' }) // named
    expect(get<{ kind: string }>('routing')?.kind).toBe('singleton')
    expect(get<{ kind: string }>('routing', 'react')?.kind).toBe('react')
  })
})

describe('get()', () => {
  it('returns undefined for unbonded singleton', () => {
    expect(get('nope')).toBeUndefined()
  })

  it('returns undefined for unbonded named', () => {
    expect(get('nope', 'name')).toBeUndefined()
  })

  it('returns undefined for unknown name within a known category', () => {
    bond('routing', 'react', { v: 1 })
    expect(get('routing', 'vue')).toBeUndefined()
  })
})

describe('getAll()', () => {
  it('returns empty Map for unknown category', () => {
    const all = getAll('nope')
    expect(all).toBeInstanceOf(Map)
    expect(all.size).toBe(0)
  })

  it('returns all named providers under a category', () => {
    bond('routing', 'react', { kind: 'react' })
    bond('routing', 'vue', { kind: 'vue' })
    bond('routing', 'svelte', { kind: 'svelte' })
    const all = getAll<{ kind: string }>('routing')
    expect(all.size).toBe(3)
    expect(all.get('react')?.kind).toBe('react')
    expect(all.get('vue')?.kind).toBe('vue')
    expect(all.get('svelte')?.kind).toBe('svelte')
  })

  it('excludes the singleton for the same category', () => {
    bond('routing', { kind: 'singleton' })
    bond('routing', 'react', { kind: 'react' })
    const all = getAll<{ kind: string }>('routing')
    expect(all.size).toBe(1)
    expect(all.has('react')).toBe(true)
  })
})

describe('require()', () => {
  it('returns the bonded singleton', () => {
    bond('state', { v: 1 })
    expect(bondRequire<{ v: number }>('state').v).toBe(1)
  })

  it('throws with a helpful message when singleton missing', () => {
    expect(() => bondRequire('state')).toThrow(/No 'state' provider bonded/)
    expect(() => bondRequire('state')).toThrow(/Bond one first/)
  })

  it('returns the bonded named provider', () => {
    bond('routing', 'react', { v: 1 })
    expect(bondRequire<{ v: number }>('routing', 'react').v).toBe(1)
  })

  it('throws with a helpful message when named missing', () => {
    expect(() => bondRequire('routing', 'react')).toThrow(/'routing:react'/)
  })
})

describe('unbond()', () => {
  it('removes the singleton and returns true', () => {
    bond('state', { v: 1 })
    expect(unbond('state')).toBe(true)
    expect(get('state')).toBeUndefined()
  })

  it('returns false when nothing was bonded', () => {
    expect(unbond('nope')).toBe(false)
  })

  it('removes a named provider and returns true', () => {
    bond('routing', 'react', { v: 1 })
    expect(unbond('routing', 'react')).toBe(true)
    expect(get('routing', 'react')).toBeUndefined()
  })

  it('returns false for unknown named provider', () => {
    expect(unbond('routing', 'react')).toBe(false)
    bond('routing', 'react', { v: 1 })
    expect(unbond('routing', 'unknown')).toBe(false)
  })

  it('leaves sibling named providers intact', () => {
    bond('routing', 'react', { v: 1 })
    bond('routing', 'vue', { v: 2 })
    unbond('routing', 'react')
    expect(get('routing', 'vue')).toBeDefined()
  })
})

describe('unbondAll()', () => {
  it('removes both singleton and named providers for the category', () => {
    bond('routing', { kind: 'singleton' })
    bond('routing', 'react', { kind: 'react' })
    bond('routing', 'vue', { kind: 'vue' })
    unbondAll('routing')
    expect(get('routing')).toBeUndefined()
    expect(get('routing', 'react')).toBeUndefined()
    expect(getAll('routing').size).toBe(0)
  })

  it('does NOT touch other categories', () => {
    bond('routing', 'react', { v: 1 })
    bond('state', { v: 1 })
    unbondAll('routing')
    expect(get('state')).toBeDefined()
  })
})

describe('isBonded()', () => {
  it('true for a bonded singleton', () => {
    bond('state', { v: 1 })
    expect(isBonded('state')).toBe(true)
  })

  it('false for missing singleton', () => {
    expect(isBonded('state')).toBe(false)
  })

  it('true for a bonded named provider', () => {
    bond('routing', 'react', { v: 1 })
    expect(isBonded('routing', 'react')).toBe(true)
  })

  it('false for missing named provider', () => {
    expect(isBonded('routing', 'react')).toBe(false)
  })

  it('false for known category but unknown name', () => {
    bond('routing', 'react', { v: 1 })
    expect(isBonded('routing', 'vue')).toBe(false)
  })

  it('singleton check independent of named check', () => {
    bond('routing', 'react', { v: 1 }) // only named, no singleton
    expect(isBonded('routing')).toBe(false)
    expect(isBonded('routing', 'react')).toBe(true)
  })
})

describe('reset()', () => {
  it('clears all singletons and named providers', () => {
    bond('state', { v: 1 })
    bond('routing', 'react', { v: 1 })
    bond('routing', 'vue', { v: 1 })
    reset()
    expect(get('state')).toBeUndefined()
    expect(get('routing', 'react')).toBeUndefined()
    expect(get('routing', 'vue')).toBeUndefined()
    expect(getAll('routing').size).toBe(0)
  })
})

describe('configure()', () => {
  it('strict=true is enforced for both singleton and named', () => {
    configure({ strict: true })
    bond('a', { v: 1 })
    bond('routing', 'react', { v: 1 })
    expect(() => bond('a', { v: 2 })).toThrow(/already bonded/)
    expect(() => bond('routing', 'react', { v: 2 })).toThrow(/already bonded/)
  })

  it('strict=false (default) silently overwrites', () => {
    configure({ strict: false })
    bond('a', { v: 1 })
    bond('a', { v: 2 })
    expect(get<{ v: number }>('a')?.v).toBe(2)
  })

  it('partial configure preserves unspecified fields', () => {
    configure({ strict: true, verbose: false })
    configure({ verbose: true }) // strict should remain true
    bond('a', { v: 1 })
    expect(() => bond('a', { v: 2 })).toThrow(/already bonded/)
  })
})
