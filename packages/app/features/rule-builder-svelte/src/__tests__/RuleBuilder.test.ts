// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `RuleBuilder` — a port of
 * `@molecule/app-rule-builder-react/src/__tests__/RuleBuilder.test.tsx`: the
 * same test names and behavioral assertions, mounted with Svelte's client
 * renderer in jsdom and asserted on the markup and emitted trees the component
 * produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import RuleBuilder from '../RuleBuilder.svelte'
import type { Rule, RuleBuilderProps, RuleGroup, RuleLeaf, RuleSchema } from '../types.js'
import { emptyGroup, emptyLeaf } from '../utilities.js'

/** A mounted builder: its host element and a teardown. */
interface Mounted {
  container: HTMLElement
  unmount: () => Promise<void>
}

/**
 * Mounts a `RuleBuilder` directly in a fresh target.
 *
 * @param props - The component props.
 * @returns The mounted instance and its host element.
 */
function render(props: RuleBuilderProps): Mounted {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(RuleBuilder, { target, props })
  flushSync()
  return {
    container: target,
    unmount: async () => {
      await unmount(instance)
      target.remove()
    },
  }
}

/**
 * Clicks an element the way a user does.
 *
 * @param el - The element to click.
 */
function click(el: Element | null): void {
  if (!(el instanceof HTMLElement)) throw new Error('expected a clickable element')
  el.click()
  flushSync()
}

/**
 * Sets a field's value through its native setter and dispatches the events a
 * user's edit fires (`input`, then `change`).
 *
 * @param el - The input or select element.
 * @param value - The value to write.
 */
function setField(el: Element | null, value: string): void {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLSelectElement))
    throw new Error('expected an input or select')
  const proto = Object.getPrototypeOf(el) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  flushSync()
}

const mountedBuilders: Mounted[] = []

afterEach(async () => {
  for (const mounted of mountedBuilders.splice(0)) await mounted.unmount()
  document.body.innerHTML = ''
})

const schema: RuleSchema = {
  fields: [
    {
      name: 'country',
      label: 'Country',
      type: 'select',
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
      ],
    },
    { name: 'plan', label: 'Plan', type: 'text' },
    { name: 'spend', label: 'Spend', type: 'number' },
    { name: 'active', label: 'Active', type: 'boolean' },
  ],
}

describe('<RuleBuilder>', () => {
  it('renders a labelled application root with the AND toggle', () => {
    const mounted = render({ schema, rules: emptyGroup('AND'), onChange: () => {} })
    mountedBuilders.push(mounted)
    expect(mounted.container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    // The root group shows its current operator label.
    expect(mounted.container.textContent).toContain('AND')
  })

  it('clicking the operator toggle flips the group AND ↔ OR', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root = emptyGroup('AND')
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    click(mounted.container.querySelector(`[data-mol-id="rule-builder-group-${root.id}-toggle"]`))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.op).toBe('OR')
  })

  it('"add condition" appends a new empty leaf to the group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    click(mounted.container.querySelector('[data-mol-id="rule-builder-group-root-add-condition"]'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0]!.kind).toBe('leaf')
  })

  it('"add group" appends a nested group with one empty leaf', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    click(mounted.container.querySelector('[data-mol-id="rule-builder-group-root-add-group"]'))
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0]!.kind).toBe('group')
    expect((next.children[0] as RuleGroup).children).toHaveLength(1)
  })

  it('selecting a field auto-picks the first operator and resets value', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const leafId = 'leaf-1'
    const initialLeaf: RuleLeaf = { ...emptyLeaf(), id: leafId }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [initialLeaf] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    setField(
      mounted.container.querySelector(`[data-mol-id="rule-builder-leaf-${leafId}"] select`),
      'spend',
    )
    const next = onChange.mock.calls[0]![0] as RuleGroup
    const child = next.children[0] as RuleLeaf
    expect(child.field).toBe('spend')
    // Default number-field operator is "=" (id "eq").
    expect(child.op).toBe('eq')
    expect(child.value).toBeUndefined()
  })

  it('removing a child drops it from the group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const a: RuleLeaf = { kind: 'leaf', id: 'a', field: '', op: '' }
    const b: RuleLeaf = { kind: 'leaf', id: 'b', field: '', op: '' }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [a, b] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    click(mounted.container.querySelector('[data-mol-id="rule-builder-leaf-a-remove"]'))
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.children.map((c) => c.id)).toEqual(['b'])
  })

  it('renders a number value editor for number fields and serializes the value', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const leafId = 'leaf-1'
    const numberLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'spend',
      op: 'gt',
      value: undefined,
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [numberLeaf] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    const inputs = mounted.container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    )
    // First input is the value (operator is a <select>).
    expect(inputs.length).toBeGreaterThan(0)
    expect((inputs[0] as HTMLInputElement).type).toBe('number')
    setField(inputs[0]!, '42')
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect((next.children[0] as RuleLeaf).value).toBe(42)
  })

  it('renders two value inputs for "between" operators', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const leafId = 'leaf-1'
    const betweenLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'spend',
      op: 'between',
      value: [0, 100],
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [betweenLeaf] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    const inputs = mounted.container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    )
    expect(inputs.length).toBe(2)
    expect((inputs[0] as HTMLInputElement).value).toBe('0')
    expect((inputs[1] as HTMLInputElement).value).toBe('100')
    setField(inputs[1]!, '250')
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect((next.children[0] as RuleLeaf).value).toEqual([0, 250])
  })

  it('hides the value input for unary operators (e.g. is empty)', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const leafId = 'leaf-1'
    const unaryLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'plan',
      op: 'isEmpty',
      value: undefined,
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [unaryLeaf] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    const inputs = mounted.container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    )
    // No <input> rendered (only <select>s for field + operator).
    expect(inputs.length).toBe(0)
  })

  it('emits a deterministic JSON-serializable tree', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = render({ schema, rules: root, onChange })
    mountedBuilders.push(mounted)
    click(mounted.container.querySelector('[data-mol-id="rule-builder-group-root-add-condition"]'))
    const emitted = onChange.mock.calls[0]![0]
    // Must round-trip through JSON without losing structure.
    const round = JSON.parse(JSON.stringify(emitted)) as Rule
    expect(round).toEqual(emitted)
    expect(round.kind).toBe('group')
  })

  it('accepts a bare leaf as the root and wraps it in an implicit AND group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const single: RuleLeaf = { kind: 'leaf', id: 'only', field: '', op: '' }
    const mounted = render({ schema, rules: single, onChange })
    mountedBuilders.push(mounted)
    // The implicit root renders a toggle.
    expect(mounted.container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    expect(mounted.container.querySelector('[data-mol-id="rule-builder-leaf-only"]')).not.toBeNull()
  })
})
