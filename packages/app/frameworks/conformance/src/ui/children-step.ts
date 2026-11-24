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
  LifetimeSpec,
  NodeSpec,
  ProbeSpec,
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
 * The name of a case {@link withChildSteps} derives: `"<name>, then children change"`,
 * `"<name>, then <children or slot> emptied and refilled"` or
 * `"<name>, with a stateful <children or slot>"`, or for a declared item list
 * `"<name>, with a stateful <list> item rendering a fragment"` and
 * `"<name>, with a stateful <list> item rendering nothing until it changes"`.
 */
export const CHILD_STEP_CASE_NAME =
  /(?:, then (?:children change|[\w-]+ emptied and refilled)|, with a stateful [\w-]+(?: item rendering (?:a fragment|nothing until it changes))?)$/

/** The derived item cases of a declared item list: a probe at the list's top with each root. */
const ITEM_ROOTS: readonly [NonNullable<LifetimeSpec['root']>, string][] = [
  ['fragment', 'item rendering a fragment'],
  ['conditional', 'item rendering nothing until it changes'],
]

/** A `children` step. */
export type ChildrenStep = Extract<Interaction, { type: 'children' }>

/**
 * The node lists a case renders as its consumer's children and node-valued props. `null` is a list
 * a `children` step stopped passing; `[]` is a list passed with no nodes.
 */
export interface ChildLists {
  /** The children, when the case or one of its steps passes any. */
  children?: NodeSpec[] | null
  /** Every slot the case or one of its steps passes, by name. */
  slots: Record<string, NodeSpec[] | null>
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
  const slots: Record<string, NodeSpec[] | null> = { ...(testCase.slots ?? {}) }
  for (const step of steps) for (const slot of Object.keys(step.slots ?? {})) slots[slot] ??= []
  const children =
    testCase.children ?? (steps.some((step) => step.children !== undefined) ? [] : undefined)
  return children === undefined ? { slots } : { children, slots }
}

/**
 * The lists after a `children` step: each field the step names replaced (`null` included: the
 * list is no longer passed), every other one kept.
 *
 * @param current - The lists before the step.
 * @param step - The step.
 * @returns The lists after it.
 */
export function nextChildLists(current: ChildLists, step: ChildrenStep): ChildLists {
  const children = step.children !== undefined ? step.children : current.children
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
      .filter(([, list]) => (list?.length ?? 0) > 0)
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
    // A lifetime probe is the kit's own node, never keyed.
    const nodes = list.filter(
      (node): node is ElementSpec | ComponentSpec | ProbeSpec =>
        typeof node !== 'string' && !('lifetime' in node),
    )
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
    // A list a step stops passing (`null`) has no nodes to check.
    check(step.children ?? undefined, `the children of its children step ${index + 1}`)
    for (const [slot, list] of Object.entries(step.slots ?? {}))
      check(list ?? undefined, `the ${slot} slot of its children step ${index + 1}`)
  })
}

/** The name of a case rule 2 or 3 of {@link withChildSteps} derives; group 1 is the list. */
const EMPTIED_CASE_NAME = /, then ([\w-]+) emptied and refilled$/

/**
 * Fails when React renders a derived `"<name>, then <list> emptied and refilled"` case differently
 * with the list no longer passed (`null`) and passed as an empty list (`[]`). Both render nothing,
 * so by the `slot(node)` rule a component treats them alike. A React component that tests the prop
 * by truthiness (`title && <h3>…</h3>`) draws an empty wrapper for `[]`, and every port that
 * follows the rule would then fail against that golden. The recorders call it on React's result
 * before they record or compare it.
 *
 * @param testCase - The case React ran.
 * @param snapshots - React's snapshots of it: at mount, then after each interaction.
 * @param where - The component (and package), for the message.
 * @throws {Error} Naming the list and the fix.
 */
export function assertEmptiedListAlike(
  testCase: UICase,
  snapshots: readonly string[],
  where: string,
): void {
  const list = EMPTIED_CASE_NAME.exec(testCase.name)?.[1]
  if (list === undefined) return
  const steps = testCase.interactions ?? []
  const listOf = (step: Interaction | undefined): NodeSpec[] | null | undefined =>
    step?.type !== 'children' ? undefined : list === 'children' ? step.children : step.slots?.[list]
  const taken = steps.length - 3
  if (listOf(steps[taken]) !== null || listOf(steps[taken + 1])?.length !== 0) return
  // Snapshot 0 is the mount, so the one after step i is i + 1.
  if (snapshots[taken + 1] === snapshots[taken + 2]) return
  const prop = list === 'children' ? 'children' : list
  throw new Error(
    `${where} / ${testCase.name}: React renders an empty ${prop} list ([]) differently from ${prop} not passed. Both render nothing: read the prop through slot() from @molecule/app-react/render where the props are destructured (const ${prop} = slot(${prop}Prop)), so the component treats them alike.`,
  )
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
 * Elements a lifetime probe is not put in: void elements, SVG (its children are not HTML), and
 * elements whose content model takes no phrasing element (table parts, form option lists, raw text).
 */
const NO_PROBE_HOST = new Set([
  'area',
  'base',
  'br',
  'canvas',
  'col',
  'colgroup',
  'embed',
  'hr',
  'iframe',
  'img',
  'input',
  'link',
  'meta',
  'optgroup',
  'option',
  'script',
  'select',
  'source',
  'style',
  'svg',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'wbr',
])

/** Elements whose children are list items: the probe goes inside one of their items. */
const LIST_CONTAINERS = new Set(['dl', 'menu', 'ol', 'ul'])

/**
 * A node list with a lifetime probe for `name` placed inside its first node that holds content
 * (an element that takes children, or a component given children). Inside a node, the probe lives
 * exactly as long as that node, the list keeps its length, and the case's steps still find what
 * they target (the probe is an empty element). Every list keeps its length on the way down: a list
 * element (`ul`) gets the probe inside one of its items, and a component given one element child
 * (a FormField, which gives that child its id) gets it inside that child, or not at all when the
 * child cannot hold one. A list with no such node (text, or components given no children) holds
 * nothing with a lifetime, and a probe beside its text would change what a component reads from
 * it as a string.
 *
 * @param list - The list.
 * @param name - The probe's name.
 * @returns The list with the probe, or undefined when no node of it can hold one.
 */
const withLifetimeProbe = (list: NodeSpec[], name: string): NodeSpec[] | undefined => {
  const probe: LifetimeSpec = { lifetime: name }
  for (const [at, node] of list.entries()) {
    if (typeof node !== 'object' || 'lifetime' in node) continue
    const children = 'children' in node ? (node.children ?? []) : []
    let placed: NodeSpec[] | undefined
    if ('tag' in node) {
      if (NO_PROBE_HOST.has(node.tag)) continue
      placed = LIST_CONTAINERS.has(node.tag)
        ? withLifetimeProbe(children, name)
        : [...children, probe]
    } else if ('component' in node) {
      if (children.length === 0) continue
      const only = children.length === 1 ? children[0] : undefined
      placed =
        typeof only === 'object' && ('tag' in only || 'component' in only)
          ? withLifetimeProbe(children, name)
          : [...children, probe]
    }
    if (placed !== undefined) {
      return list.map((other, index) => (index === at ? { ...node, children: placed } : other))
    }
  }
  return undefined
}

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
 *    `"<name>, then children emptied and refilled"`: the children no longer passed (`null`), then
 *    passed as an empty list (`[]`), then passed again.
 * 3. For each slot any case passes nodes in, from the first case that does,
 *    `"<name>, then <slot> emptied and refilled"`: the slot no longer passed, then passed as an
 *    empty list, then passed again.
 * 4. For each case and each of its lists with nodes (its children, each slot) that none of its own
 *    steps replaces, `"<name>, with a stateful <list>"`: the same case, with a lifetime probe
 *    (`LifetimeSpec`) placed in that list, and a last `lifetime` step that flips the probe's
 *    state. Its snapshots count the probe's creations and disposals, so a port that creates the
 *    list's components while they are hidden (a closed dialog's footer), keeps one instance across
 *    close and reopen where React mounts them only while shown and again each time, or replaces
 *    one when what it renders changes (its state is then lost), is caught. For a list the family
 *    declares in `itemLists`, the same case twice more with the probe as the list's first item:
 *    `"<name>, with a stateful <list> item rendering a fragment"` and `"…rendering nothing until
 *    it changes"` (`LifetimeSpec.root`): items are anything a consumer writes, a component whose
 *    root is a fragment or a conditional included.
 *
 * Rules 2 and 3 first take the list away (`null`), as a consumer's `cond && <X/>` that became
 * false does, then pass a list that became empty (`[]`, a map over no rows). Both render nothing,
 * so a component treats them alike in every framework (React's `slot(node)` rule): a wrapper
 * that stays for one and not the other is caught. Rule 1's `[]` is the same empty list (a
 * component that takes its children as an array, as a carousel does, is given one).
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
          { type: 'children', children: null },
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
        { type: 'children', slots: { [slot]: null } },
        { type: 'children', slots: { [slot]: [] } },
        { type: 'children', slots: { [slot]: base.slots![slot]! } },
      ]),
    )
  }
  for (const base of bases) {
    const replaced = new Set(
      childrenSteps(base).flatMap((step) => [
        ...(step.children !== undefined ? ['children'] : []),
        ...Object.keys(step.slots ?? {}),
      ]),
    )
    const lists: [string, NodeSpec[]][] = [
      ...(base.children?.length ? [['children', base.children] as [string, NodeSpec[]]] : []),
      ...Object.entries(base.slots ?? {}).filter(([, list]) => list.length > 0),
    ]
    for (const [list, nodes] of lists) {
      if (replaced.has(list)) continue
      const stateful = (name: string, probed: NodeSpec[]): UICase => ({
        ...base,
        name: `${base.name}, with a stateful ${name}`,
        ...(list === 'children'
          ? { children: probed }
          : { slots: { ...base.slots, [list]: probed } }),
        interactions: [...(base.interactions ?? []), { type: 'lifetime', name: list }],
      })
      const probed = withLifetimeProbe(nodes, list)
      if (probed) derived.push(stateful(list, probed))
      if (family.itemLists?.[list] === undefined) continue
      for (const [root, suffix] of ITEM_ROOTS)
        derived.push(stateful(`${list} ${suffix}`, [{ lifetime: list, root }, ...nodes]))
    }
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
