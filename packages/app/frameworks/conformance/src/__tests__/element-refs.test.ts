/**
 * Every component whose React export forwards a ref has cases for the element or handle it exposes.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as ReactUI from '@molecule/app-ui-react'

import { uiCaseFamilies, withHandle, withRef } from '../ui/run.js'
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

/**
 * Checks that the family declares the kind of value a React caller can get through its ref.
 * @param family - The family declaring the component's ref contract.
 * @returns A diagnosis and fix when the declaration needs changing.
 */
const refProblem = ({ component, ref, handle }: UIComponentCases): string | undefined => {
  if (!forwardsRef(component)) {
    if (ref || handle)
      return `${component}: React forwards no ref. Remove the ref or handle declaration.`
    return undefined
  }
  if (Boolean(ref) === Boolean(handle)) {
    return `${component}: React uses forwardRef. Declare exactly one of ref or handle.`
  }
}

describe('element refs', () => {
  it("reads React's forwardRef exports", () => {
    expect(forwardsRef('Button')).toBe(true)
    expect(forwardsRef('ToastProvider')).toBe(false)
  })

  it('every family declares exactly the ref contract its React export supports', () => {
    expect(uiCaseFamilies.map(refProblem).filter(Boolean)).toEqual([])
  })

  it('names the export and the fix for missing, conflicting or unsupported declarations', () => {
    const cases = [{ name: 'defaults' }]
    const handle = { focus: {} }
    expect(refProblem({ component: 'Button', cases })).toBe(
      'Button: React uses forwardRef. Declare exactly one of ref or handle.',
    )
    expect(refProblem({ component: 'Button', cases, ref: {}, handle })).toBe(
      'Button: React uses forwardRef. Declare exactly one of ref or handle.',
    )
    expect(refProblem({ component: 'ToastProvider', cases, handle })).toBe(
      'ToastProvider: React forwards no ref. Remove the ref or handle declaration.',
    )
    expect(refProblem({ component: 'ToastProvider', cases, ref: {} })).toBe(
      'ToastProvider: React forwards no ref. Remove the ref or handle declaration.',
    )
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

  it('derives one case per handle method with its arguments, event and props updates', () => {
    const props = { open: true }
    const family: UIComponentCases = {
      component: 'Tooltip',
      cases: [{ name: 'closed' }, { name: 'opened', props }],
      handle: {
        focus: { caseName: 'opened', observeEvent: 'focus', repeatWithProps: [{ open: false }] },
        cancel: { args: ['reason'] },
      },
    }
    const derived = withHandle(family).cases.slice(family.cases.length)
    const focus = { type: 'invokeHandle', method: 'focus', observeEvent: 'focus' }
    expect(derived).toEqual([
      {
        name: "calls focus() through a caller's handle",
        props,
        handle: true,
        interactions: [focus, { type: 'props', props: { open: false } }, focus],
      },
      {
        name: "calls cancel() through a caller's handle",
        handle: true,
        interactions: [{ type: 'invokeHandle', method: 'cancel', args: ['reason'] }],
      },
    ])
  })

  it('refuses an empty handle or a handle case base the family does not have', () => {
    const cases = [{ name: 'closed' }]
    expect(() => withHandle({ component: 'Tooltip', handle: {}, cases })).toThrow(
      'Tooltip: name at least one handle method',
    )
    expect(() =>
      withHandle({ component: 'Tooltip', handle: { focus: { caseName: 'missing' } }, cases }),
    ).toThrow('Tooltip: handle case "missing" not found')
  })
})
