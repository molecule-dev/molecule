// @vitest-environment jsdom
/**
 * Unit tests for the reactive-argument helper every injection-context hook
 * accepts: a plain value or a signal holding it. (The hooks' following of a
 * changed signal argument is covered by the binding conformance suite.)
 *
 * @module
 */

import { signal } from '@angular/core'
import { describe, expect, it } from 'vitest'

import { readMaybeSignal } from '../maybe-signal.js'

describe('readMaybeSignal', () => {
  it('returns a plain value as it is', () => {
    expect(readMaybeSignal(42)).toBe(42)
    expect(readMaybeSignal(undefined)).toBeUndefined()
    const options = { sync: true }
    expect(readMaybeSignal(options)).toBe(options)
  })

  it('reads the current value of a signal', () => {
    const key = signal('theme')
    expect(readMaybeSignal(key)).toBe('theme')
    key.set('locale')
    expect(readMaybeSignal(key)).toBe('locale')
  })

  it('reads a signal holding undefined as an omitted argument', () => {
    const omitted = signal<string | undefined>(undefined)
    expect(readMaybeSignal(omitted)).toBeUndefined()
  })
})
