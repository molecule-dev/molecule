// @vitest-environment jsdom
/**
 * Unit tests for the Solid `RuleBuilder` — a port of
 * `@molecule/app-rule-builder-react/src/__tests__/RuleBuilder.test.tsx`: the
 * same test names and behavioral assertions, rendered with Solid in jsdom and
 * asserted on the markup and emitted trees the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`, `surface`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React suite uses.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop): unknown {
        if (prop === 'cn') {
          return (...classes: unknown[]) =>
            classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        if (prop === 'sp') {
          return () => ({})
        }
        const token = String(prop)
        const fn = (..._args: unknown[]): string => token
        return new Proxy(fn, {
          get(_t, key) {
            if (key === Symbol.toPrimitive || key === 'toString') return () => token
            return undefined
          },
        })
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'

import { RuleBuilder } from '../RuleBuilder.jsx'
import type { Rule, RuleGroup, RuleLeaf, RuleSchema } from '../types.js'
import { emptyGroup, emptyLeaf } from '../utilities.js'

/** A mounted builder: its host element and a teardown. */
interface Mounted {
  container: HTMLElement
  unmount: () => void
}

const disposers: Array<() => void> = []

/**
 * Mounts a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The JSX to render.
 * @returns The mounted instance and its host element.
 */
function mount(view: () => JSX.Element): Mounted {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(view, container)
  disposers.push(dispose)
  return {
    container,
    unmount: () => {
      dispose()
      container.remove()
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
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
  // The Select primitive resolves a "chevron-down" icon at render time;
  // bond a minimal icon set so the component renders in jsdom.
  setIconSet({ 'chevron-down': { paths: [{ d: 'M0 0L10 10' }] } })
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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
    const mounted = mount(() => (
      <RuleBuilder schema={schema} rules={emptyGroup('AND')} onChange={() => {}} />
    ))
    expect(mounted.container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    // The root group shows its current operator label.
    expect(mounted.container.textContent).toContain('AND')
  })

  it('clicking the operator toggle flips the group AND ↔ OR', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root = emptyGroup('AND')
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
    click(mounted.container.querySelector(`[data-mol-id="rule-builder-group-${root.id}-toggle"]`))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.op).toBe('OR')
  })

  it('"add condition" appends a new empty leaf to the group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
    click(mounted.container.querySelector('[data-mol-id="rule-builder-group-root-add-condition"]'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0]!.kind).toBe('leaf')
  })

  it('"add group" appends a nested group with one empty leaf', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
    const inputs = mounted.container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    )
    // No <input> rendered (only <select>s for field + operator).
    expect(inputs.length).toBe(0)
  })

  it('emits a deterministic JSON-serializable tree', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const mounted = mount(() => <RuleBuilder schema={schema} rules={root} onChange={onChange} />)
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
    const mounted = mount(() => <RuleBuilder schema={schema} rules={single} onChange={onChange} />)
    // The implicit root renders a toggle.
    expect(mounted.container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    expect(mounted.container.querySelector('[data-mol-id="rule-builder-leaf-only"]')).not.toBeNull()
  })
})
