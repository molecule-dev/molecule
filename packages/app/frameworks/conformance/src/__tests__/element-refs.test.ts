/**
 * Every component whose React export forwards a ref gets a ref case, read from React's own
 * exports: a family that forgets `ref` (or names it for a component that has no ref) fails here,
 * so a framework can never hand a caller the wrong element, or none, unnoticed.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as ReactUI from '@molecule/app-ui-react'

import { uiCaseFamilies, withRef } from '../ui/run.js'
import type { UIComponentCases } from '../ui/spec.js'

const FORWARD_REF = Symbol.for('react.forward_ref')

/**
 * Whether React's export of this name is a `forwardRef` component.
 *
 * @param component - The export name.
 * @returns Whether it forwards a ref.
 */
const forwardsRef = (component: string): boolean => {
  const value: unknown = Reflect.get(ReactUI, component)
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    value.$$typeof === FORWARD_REF
  )
}

describe('element refs', () => {
  it("reads React's forwardRef exports", () => {
    expect(forwardsRef('Button')).toBe(true)
    expect(forwardsRef('ToastProvider')).toBe(false)
  })

  it('every family names ref exactly when its React export forwards a ref', () => {
    const wrong = uiCaseFamilies
      .filter((family) => Boolean(family.ref) !== forwardsRef(family.component))
      .map((family) => `${family.component}: ${family.ref ? 'no React ref' : 'want ref'}`)
    expect(wrong).toEqual([])
  })

  it('derives a case reading the ref element from the named case', () => {
    const family: UIComponentCases = {
      component: 'Tooltip',
      ref: { caseName: 'opens' },
      cases: [{ name: 'closed' }, { name: 'opens', props: { open: true } }],
    }
    const derived = withRef(family).cases.at(-1)
    expect(derived).toEqual({
      name: "opens, with a caller's ref",
      props: { open: true },
      ref: true,
    })
    expect(
      withRef({ component: 'Badge', ref: {}, cases: [{ name: 'defaults' }] }).cases.at(-1)?.name,
    ).toBe("defaults, with a caller's ref")
  })

  it('refuses a caseName the family does not have', () => {
    expect(() =>
      withRef({ component: 'Tooltip', ref: { caseName: 'missing' }, cases: [{ name: 'closed' }] }),
    ).toThrow('Tooltip: ref case "missing" not found')
  })
})
