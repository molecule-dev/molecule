/**
 * Tests for the country flag bond accessor.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { getCountryFlag, hasCountryFlags, setCountryFlags } from '../provider.js'
import type { CountryFlagSet } from '../types.js'

const flags: CountryFlagSet = {
  US: { svg: '<svg viewBox="0 0 513 342"><rect fill="#fff"/></svg>', aspectRatio: 1.5 },
  CN: { svg: '<svg viewBox="0 0 513 342"><rect fill="#EE1C25"/></svg>', aspectRatio: 1.5 },
}

beforeEach(() => {
  unbond('country-flags')
})

describe('setCountryFlags / hasCountryFlags', () => {
  it('bonds a flag set', () => {
    expect(hasCountryFlags()).toBe(false)
    setCountryFlags(flags)
    expect(hasCountryFlags()).toBe(true)
  })
})

describe('getCountryFlag', () => {
  it('returns the flag for a known code, case-insensitively', () => {
    setCountryFlags(flags)
    expect(getCountryFlag('US')).toBe(flags.US)
    expect(getCountryFlag('us')).toBe(flags.US)
    expect(getCountryFlag('cN')).toBe(flags.CN)
  })

  it('returns undefined for an unknown code instead of throwing', () => {
    setCountryFlags(flags)
    expect(getCountryFlag('zz')).toBeUndefined()
  })

  it('returns undefined when no set is bonded instead of throwing', () => {
    expect(getCountryFlag('us')).toBeUndefined()
  })
})
