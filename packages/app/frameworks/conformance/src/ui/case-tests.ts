/**
 * The tests a case registers on a framework's adapter, and the checks on a family's
 * {@link UIComponentCases.itemLists} declaration.
 *
 * @module
 */

import { holdsLifetimeProbe } from './lifetime.js'
import type {
  AppComposition,
  CaseResult,
  FrameworkAdapter,
  UICase,
  UIComponentCases,
} from './spec.js'

/**
 * The lists of a case that hold the lifetime probe: `children` and slot names.
 *
 * @param testCase - The case.
 * @returns The list names.
 */
export const probeLists = (testCase: UICase): string[] => [
  ...(holdsLifetimeProbe(testCase.children) ? ['children'] : []),
  ...Object.entries(testCase.slots ?? {})
    .filter(([, nodes]) => holdsLifetimeProbe(nodes))
    .map(([slot]) => slot),
]

/** One test a case registers. */
export interface CaseTest {
  /** The test's name. */
  name: string
  /** The adapter form the case runs in; the case as written otherwise. */
  form?: string
}

/**
 * The tests a case registers on an adapter: the case as written, and the case in each of the
 * adapter's other forms that applies to it (`CaseForm`), all held to the case's React result. A
 * case whose stateful list the family declares in `itemLists` runs in the adapter's item-list form
 * only, under its own name; the item-list form runs for no other case, since a list a family does
 * not declare is not one its consumers write as separate items.
 *
 * @param testCase - The case.
 * @param adapter - The framework's adapter.
 * @param family - The case's component family.
 * @returns Each test's name and the form it runs the case in.
 */
export const caseTests = (
  testCase: UICase,
  adapter: FrameworkAdapter,
  family: UIComponentCases | undefined,
): CaseTest[] => {
  const forms = (adapter.forms ?? []).filter((form) => form.appliesTo(testCase))
  const declared = probeLists(testCase).some((list) => family?.itemLists?.[list] !== undefined)
  const items = declared ? forms.find((form) => form.itemLists) : undefined
  if (items !== undefined) return [{ name: testCase.name, form: items.suffix }]
  // An item-list form is how a consumer writes a declared list only; any other form is a sibling.
  return [
    { name: testCase.name },
    ...forms
      .filter((form) => !form.itemLists)
      .map((form) => ({ name: `${testCase.name}${form.suffix}`, form: form.suffix })),
  ]
}

/**
 * What is wrong with a family's `itemLists` declaration on its face: a list with no reason, or
 * one no case of the family passes.
 *
 * @param family - The component family.
 * @returns One message per problem; empty when there is none.
 */
export const itemListProblems = (family: UIComponentCases): string[] =>
  Object.entries(family.itemLists ?? {}).flatMap(([list, reason]) => [
    ...(reason.trim() === '' ? [`${family.component} itemLists.${list} gives no reason`] : []),
    ...(family.cases.some((c) =>
      list === 'children' ? c.children !== undefined : c.slots?.[list] !== undefined,
    )
      ? []
      : [`${family.component} itemLists names ${list}, which no case passes`]),
  ])

/**
 * The cases an adapter runs in its item-list form for a declared list: the stateful cases that
 * pass that list.
 *
 * @param family - The component family.
 * @param list - The declared list (`children` or a slot name).
 * @param adapter - The framework's adapter.
 * @returns The cases; empty when the adapter has no item-list form.
 */
export const itemListCases = (
  family: UIComponentCases,
  list: string,
  adapter: FrameworkAdapter,
): UICase[] => {
  const items = adapter.forms?.find((form) => form.itemLists)
  if (items === undefined) return []
  return family.cases.filter((c) => probeLists(c).includes(list) && items.appliesTo(c))
}

/**
 * Whether a declared list is needed: some case that passes it, run as written (not in the
 * item-list form), differs from its React result. A declaration that is not needed hides
 * nothing and is removed.
 *
 * @param component - The component.
 * @param cases - The cases that pass the list ({@link itemListCases}).
 * @param adapter - The framework's adapter.
 * @param goldens - The component's React results, by case name.
 * @param app - The composition root the suite mounts through, if any.
 * @returns Whether a case as written differs from React.
 */
export async function writtenListDiffers(
  component: string,
  cases: readonly UICase[],
  adapter: FrameworkAdapter,
  goldens: Readonly<Record<string, CaseResult>> | undefined,
  app?: AppComposition,
): Promise<boolean> {
  for (const testCase of cases) {
    const expected = goldens?.[testCase.name]
    if (!expected) throw new Error(`no golden for ${component} / ${testCase.name}`)
    const written = await adapter.run(component, testCase, app ? { app } : undefined)
    if (written.snapshots.some((snapshot, i) => snapshot !== expected.snapshots[i])) return true
  }
  return false
}
