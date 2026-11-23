/**
 * The `children` step: a consumer whose children or slot content changes after the first render
 * (`{rows.map(…)}` in React, a keyed `v-for`, `{#each}`, `<For>` or `@for` elsewhere).
 *
 * A port that wraps, counts or moves its children by hand renders the first list as React does and
 * a later one wrongly: a row inserted into another row's wrapper, a wrapper left behind after its
 * child went, a list counted as one child. So the kit derives cases that change a family's children
 * and slots ({@link withChildSteps}), and every adapter renders such a case's lists the way a
 * consumer whose list changes writes them, keyed by each node's `key`.
 *
 * The derived cases exist only while `CONFORMANCE_CHILDREN_STEP=1` is set
 * ({@link CHILDREN_STEP_SWITCH}).
 *
 * @module
 */

import type {
  ComponentSpec,
  ElementSpec,
  Interaction,
  NodeSpec,
  UICase,
  UIComponentCases,
} from './spec.js'

/** The environment variable that turns the derived `children`-step cases on (`1`). */
export const CHILDREN_STEP_SWITCH = 'CONFORMANCE_CHILDREN_STEP'

/**
 * Whether the kit derives `children`-step cases in this run.
 *
 * @returns True while `CONFORMANCE_CHILDREN_STEP=1` is set.
 */
export const childStepsEnabled = (): boolean => process.env[CHILDREN_STEP_SWITCH] === '1'

/**
 * The name of a case {@link withChildSteps} derives: `"<name>, then children change"` or
 * `"<name>, then <children or slot> emptied and refilled"`.
 */
export const CHILD_STEP_CASE_NAME = /, then (?:children change|[\w-]+ emptied and refilled)$/

/** A `children` step. */
export type ChildrenStep = Extract<Interaction, { type: 'children' }>

/** The node lists a case renders as its consumer's children and node-valued props. */
export interface ChildLists {
  /** The children, when the case or one of its steps passes any. */
  children?: NodeSpec[]
  /** Every slot the case or one of its steps passes, by name. */
  slots: Record<string, NodeSpec[]>
}

/**
 * The `children` steps of a case, in order.
 *
 * @param testCase - The case.
 * @returns Its `children` steps.
 */
const childrenSteps = (testCase: UICase): ChildrenStep[] =>
  (testCase.interactions ?? []).filter((step): step is ChildrenStep => step.type === 'children')

/**
 * Whether a case changes its children or slots: an adapter then renders its lists the way a
 * consumer whose list changes writes them, from mount on.
 *
 * @param testCase - The case.
 * @returns True when one of its interactions is a `children` step.
 */
export const hasChildSteps = (testCase: UICase): boolean => childrenSteps(testCase).length > 0

/** The lists a case's `children` steps replace. */
export interface ChangingLists {
  /** Whether a step replaces the children. */
  children: boolean
  /** The slots a step replaces. */
  slots: ReadonlySet<string>
}

/**
 * The lists a case's `children` steps replace. An adapter passes each of them the way a consumer
 * whose list changes writes it, from mount on, and every other list as the case writes it.
 *
 * @param testCase - The case.
 * @returns The children (when a step passes any) and the slots its steps name.
 */
export function changingLists(testCase: UICase): ChangingLists {
  const steps = childrenSteps(testCase)
  return {
    children: steps.some((step) => step.children !== undefined),
    slots: new Set(steps.flatMap((step) => Object.keys(step.slots ?? {}))),
  }
}

/**
 * A case's lists at mount: its children, and every slot it or one of its steps passes. A slot or
 * the children a step passes and the case does not start with are `[]` from mount, so every
 * framework passes the same props from the first render on.
 *
 * @param testCase - The case.
 * @returns The lists it mounts with.
 */
export function initialChildLists(testCase: UICase): ChildLists {
  const steps = childrenSteps(testCase)
  const slots: Record<string, NodeSpec[]> = { ...(testCase.slots ?? {}) }
  for (const step of steps) for (const slot of Object.keys(step.slots ?? {})) slots[slot] ??= []
  const children =
    testCase.children ?? (steps.some((step) => step.children !== undefined) ? [] : undefined)
  return children === undefined ? { slots } : { children, slots }
}

/**
 * The lists after a `children` step: each field the step names replaced, every other one kept.
 *
 * @param current - The lists before the step.
 * @param step - The step.
 * @returns The lists after it.
 */
export function nextChildLists(current: ChildLists, step: ChildrenStep): ChildLists {
  const children = step.children ?? current.children
  return {
    ...(children === undefined ? {} : { children }),
    slots: { ...current.slots, ...(step.slots ?? {}) },
  }
}

/**
 * Every set of lists a case renders: at mount, then after each of its `children` steps.
 *
 * @param testCase - The case.
 * @returns The lists at mount, then one entry per `children` step.
 */
export function childListStates(testCase: UICase): ChildLists[] {
  let current = initialChildLists(testCase)
  const states = [current]
  for (const step of childrenSteps(testCase)) {
    current = nextChildLists(current, step)
    states.push(current)
  }
  return states
}

/**
 * For each snapshot of a case (at mount, then after each interaction), whether a `children` step
 * has emptied a list the case mounted with nodes in. An element that takes its accessible name from
 * that list (a button's label, a dialog's title) has none then, because of the case's own input.
 *
 * @param testCase - The case.
 * @returns One entry per snapshot.
 */
export function snapshotsWithEmptiedList(testCase: UICase): boolean[] {
  const initial = initialChildLists(testCase)
  const filled = (lists: ChildLists): string[] => [
    ...((lists.children?.length ?? 0) > 0 ? ['children'] : []),
    ...Object.entries(lists.slots)
      .filter(([, list]) => list.length > 0)
      .map(([slot]) => slot),
  ]
  const atMount = filled(initial)
  let current = initial
  const out = [false]
  for (const step of testCase.interactions ?? []) {
    if (step.type === 'children') current = nextChildLists(current, step)
    const now = new Set(filled(current))
    out.push(atMount.some((list) => !now.has(list)))
  }
  return out
}

/**
 * A node's `key`, when it is an element or component node that has one.
 *
 * @param node - The node.
 * @returns Its key, or undefined.
 */
export const keyOf = (node: NodeSpec): string | undefined =>
  typeof node === 'object' && ('tag' in node || 'component' in node) ? node.key : undefined

/**
 * What identifies a node in a list across re-renders, as React matches it: its `key`, or for a
 * node without one its position. The node's content is part of it, so one identity always stands
 * for the same markup (a framework that renders every node a case may pass up front, as Angular's
 * `@switch` does, re-creates a node whose content changed, where React updates it; the DOM is the
 * same).
 *
 * @param node - The node.
 * @param index - Its position in the list.
 * @returns A string unique within a list whose keys are unique.
 */
export const nodeIdentity = (node: NodeSpec, index: number): string =>
  JSON.stringify([keyOf(node) ?? index, node])

/**
 * Fails a case whose node lists key some element or component nodes but not all, or give two
 * nodes the same key: React would warn about the list, and a keyed `{#each}` would throw.
 *
 * @param testCase - The case.
 * @throws {Error} Naming the list.
 */
export function checkNodeKeys(testCase: UICase): void {
  const check = (list: NodeSpec[] | undefined, where: string): void => {
    if (!list) return
    const nodes = list.filter((node) => typeof node !== 'string')
    const keys = nodes.map(keyOf).filter((key): key is string => key !== undefined)
    if (keys.length > 0 && keys.length < nodes.length)
      throw new Error(
        `conformance: the case "${testCase.name}" keys some nodes of ${where} but not all; key every element and component node of a list, or none`,
      )
    const duplicate = keys.find((key, index) => keys.indexOf(key) !== index)
    if (duplicate !== undefined)
      throw new Error(
        `conformance: the case "${testCase.name}" gives two nodes of ${where} the key "${duplicate}"`,
      )
    for (const node of nodes) {
      if ('probe' in node) continue
      check(node.children, `the children of a node in ${where}`)
      if ('component' in node)
        for (const [slot, nodes] of Object.entries(node.slots ?? {}))
          check(nodes, `the ${slot} slot of a node in ${where}`)
    }
  }
  check(testCase.children, 'its children')
  for (const [slot, list] of Object.entries(testCase.slots ?? {})) check(list, `its ${slot} slot`)
  childrenSteps(testCase).forEach((step, index) => {
    check(step.children, `the children of its children step ${index + 1}`)
    for (const [slot, list] of Object.entries(step.slots ?? {}))
      check(list, `the ${slot} slot of its children step ${index + 1}`)
  })
}

/**
 * Whether a case's own interactions leave the component mounted, so steps after them have a
 * component to act on.
 *
 * @param testCase - The case.
 * @returns False when its last `unmount` has no `remount` after it.
 */
const endsMounted = (testCase: UICase): boolean =>
  (testCase.interactions ?? []).reduce(
    (mounted, step) => (step.type === 'unmount' ? false : step.type === 'remount' ? true : mounted),
    true,
  )

/**
 * Whether a list holds at least two nodes, each an element or a component (no text, no probe).
 *
 * @param list - A node list.
 * @returns Whether its order, insertions and removals can be told apart in the DOM.
 */
const isNodeList = (list: NodeSpec[] | undefined): list is (ElementSpec | ComponentSpec)[] =>
  (list?.length ?? 0) >= 2 &&
  list!.every((node) => typeof node === 'object' && ('tag' in node || 'component' in node))

/**
 * A case with the `children` steps appended to its own interactions. It keeps the base case's
 * input and steps, so every snapshot of the base case is a snapshot of this one (its a11y
 * declaration still holds), and its goldens group.
 *
 * @param base - The case it starts from.
 * @param name - The derived case's name.
 * @param fields - The case's own fields to replace (its keyed children).
 * @param steps - The `children` steps.
 * @returns The derived case.
 */
const derive = (
  base: UICase,
  name: string,
  fields: Partial<UICase>,
  steps: ChildrenStep[],
): UICase => ({
  ...base,
  ...fields,
  name,
  interactions: [...(base.interactions ?? []), ...steps],
})

/**
 * The family with its `children`-step cases added, with no per-family opt-in (only while
 * {@link CHILDREN_STEP_SWITCH} is set):
 *
 * 1. For the first case whose children hold at least two element or component nodes and no text,
 *    `"<name>, then children change"`: its children keyed `"0"`…`"n-1"`, then a copy of child 0
 *    keyed `"new"` inserted at index 1, the first removed, the list reversed, `[]`, and the
 *    original list again. The copy of child 0 is used because any other node may not be a valid
 *    child (a table body, a tab list).
 * 2. When no case has such children, for the first case with any children,
 *    `"<name>, then children emptied and refilled"`: `[]`, then its children again.
 * 3. For each slot any case passes nodes in, from the first case that does,
 *    `"<name>, then <slot> emptied and refilled"`.
 *
 * A case whose own steps end unmounted is not a base. React's DOM after each step is the
 * expectation, an emptied slot included, so no component needs an exemption.
 *
 * @param family - One component's cases.
 * @returns The family with those cases added.
 * @throws {Error} When a derived name is already a case's name.
 */
export const withChildSteps = (family: UIComponentCases): UIComponentCases => {
  if (!childStepsEnabled()) return family
  const bases = family.cases.filter(endsMounted)
  const derived: UICase[] = []
  const listCase = bases.find((c) => isNodeList(c.children))
  if (listCase) {
    const keyed = (listCase.children as (ElementSpec | ComponentSpec)[]).map((node, index) => ({
      ...node,
      key: String(index),
    }))
    const inserted = [keyed[0]!, { ...keyed[0]!, key: 'new' }, ...keyed.slice(1)]
    const removed = inserted.slice(1)
    const reversed = [...removed].reverse()
    derived.push(
      derive(
        listCase,
        `${listCase.name}, then children change`,
        { children: keyed },
        [inserted, removed, reversed, [], keyed].map((children): ChildrenStep => ({
          type: 'children',
          children,
        })),
      ),
    )
  } else {
    const withChildren = bases.find((c) => (c.children?.length ?? 0) > 0)
    if (withChildren)
      derived.push(
        derive(withChildren, `${withChildren.name}, then children emptied and refilled`, {}, [
          { type: 'children', children: [] },
          { type: 'children', children: withChildren.children },
        ]),
      )
  }
  const slotNames = [...new Set(family.cases.flatMap((c) => Object.keys(c.slots ?? {})))]
  for (const slot of slotNames) {
    const base = bases.find((c) => (c.slots?.[slot]?.length ?? 0) > 0)
    if (!base) continue
    derived.push(
      derive(base, `${base.name}, then ${slot} emptied and refilled`, {}, [
        { type: 'children', slots: { [slot]: [] } },
        { type: 'children', slots: { [slot]: base.slots![slot]! } },
      ]),
    )
  }
  if (derived.length === 0) return family
  const taken = new Set(family.cases.map((c) => c.name))
  for (const added of derived) {
    if (taken.has(added.name))
      throw new Error(
        `${family.component}: the derived case "${added.name}" has the name of another case; rename that case`,
      )
    taken.add(added.name)
  }
  return { ...family, cases: [...family.cases, ...derived] }
}
