/**
 * A family's `itemLists` declaration (Solid passes such a list as accessor items) is checked so it
 * cannot hide a port bug: it gives a reason, names a list a case passes, and is needed, so a case
 * that passes the list as written differs from React. A declared case runs in the item-list form
 * only, under its own name; any other case runs as written and in the adapter's other forms, never
 * in the item-list form.
 */
import { describe, expect, it } from 'vitest'

import { caseTests, itemListCases, itemListProblems, writtenListDiffers } from '../ui/case-tests.js'
import { holdsLifetimeProbe } from '../ui/lifetime.js'
import type { CaseResult, FrameworkAdapter, UICase, UIComponentCases } from '../ui/spec.js'

const SUFFIX = ' passed as accessors'
const stateful: UICase = { name: 'stateful rows', children: [{ lifetime: 'children' }] }
const plain: UICase = { name: 'static rows', children: ['a', 'b'] }
const golden: CaseResult = { snapshots: ['<ul>three</ul>'], calls: [] }

/**
 * An adapter whose item-list form matches React and whose list as written renders `written`.
 *
 * @param written - The snapshot of the case as written.
 * @returns The adapter.
 */
const adapterRendering = (written: string): FrameworkAdapter => ({
  name: 'probe',
  exportNames: ['Rows'],
  has: () => true,
  forms: [
    {
      suffix: SUFFIX,
      itemLists: true,
      appliesTo: (testCase) => holdsLifetimeProbe(testCase.children),
    },
  ],
  run: (_component, _testCase, options) =>
    Promise.resolve({
      snapshots: [options?.form === SUFFIX ? golden.snapshots[0]! : written],
      calls: [],
    }),
})

/**
 * A family of the stateful and the plain case.
 *
 * @param itemLists - Its declaration.
 * @returns The family.
 */
const family = (itemLists?: Record<string, string>): UIComponentCases => ({
  component: 'Rows',
  cases: [stateful, plain],
  ...(itemLists ? { itemLists } : {}),
})

describe('itemLists', () => {
  it('runs a declared list in the item-list form only, under the case name', () => {
    const declared = family({ children: 'counts the rows' })
    expect(caseTests(stateful, adapterRendering(''), declared)).toEqual([
      { name: 'stateful rows', form: SUFFIX },
    ])
    expect(caseTests(plain, adapterRendering(''), declared)).toEqual([{ name: 'static rows' }])
  })

  it('runs a case of a list the family does not declare as written, never in the item-list form', () => {
    expect(caseTests(stateful, adapterRendering(''), family())).toEqual([{ name: 'stateful rows' }])
  })

  it("keeps the adapter's other forms as siblings of an undeclared case", () => {
    const twice = ' rendered twice'
    const adapter = adapterRendering('')
    const withOther: FrameworkAdapter = {
      ...adapter,
      forms: [...(adapter.forms ?? []), { suffix: twice, appliesTo: () => true }],
    }
    expect(caseTests(stateful, withOther, family())).toEqual([
      { name: 'stateful rows' },
      { name: `stateful rows${twice}`, form: twice },
    ])
  })

  it('refuses a declaration without a reason, or of a list no case passes', () => {
    expect(itemListProblems(family({ children: '  ' }))).toEqual([
      'Rows itemLists.children gives no reason',
    ])
    expect(itemListProblems(family({ footer: 'counts the footer items' }))).toEqual([
      'Rows itemLists names footer, which no case passes',
    ])
    expect(itemListProblems(family({ children: 'counts the rows' }))).toEqual([])
  })

  it('is needed while a case as written differs from React', async () => {
    const adapter = adapterRendering('<ul>one</ul>')
    const cases = itemListCases(family({ children: 'counts the rows' }), 'children', adapter)
    expect(cases).toEqual([stateful])
    expect(await writtenListDiffers('Rows', cases, adapter, { 'stateful rows': golden })).toBe(true)
  })

  it('is not needed once every case as written matches React', async () => {
    const adapter = adapterRendering(golden.snapshots[0]!)
    const cases = itemListCases(family({ children: 'counts the rows' }), 'children', adapter)
    expect(await writtenListDiffers('Rows', cases, adapter, { 'stateful rows': golden })).toBe(
      false,
    )
  })

  it('runs nothing on a framework without an item-list form', () => {
    const adapter: FrameworkAdapter = { ...adapterRendering(''), forms: [] }
    expect(itemListCases(family({ children: 'counts the rows' }), 'children', adapter)).toEqual([])
    expect(caseTests(stateful, adapter, family({ children: 'counts the rows' }))).toEqual([
      { name: 'stateful rows' },
    ])
  })
})
