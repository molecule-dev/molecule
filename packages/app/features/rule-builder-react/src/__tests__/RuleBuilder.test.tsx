// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { RuleBuilder } from '../RuleBuilder.js'
import type { Rule, RuleGroup, RuleLeaf, RuleSchema } from '../types.js'
import { emptyGroup, emptyLeaf } from '../utilities.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns an empty style object, every other property/method
 * access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
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
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // The Select primitive resolves a "chevron-down" icon at render time;
  // bond a minimal icon set so the component renders in jsdom.
  setIconSet({ 'chevron-down': { paths: [{ d: 'M0 0L10 10' }] } })
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
    const { container, getByText } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={emptyGroup('AND')} onChange={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    // The root group shows its current operator label.
    expect(getByText('AND')).toBeTruthy()
  })

  it('clicking the operator toggle flips the group AND ↔ OR', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root = emptyGroup('AND')
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    const toggle = container.querySelector(
      `[data-mol-id="rule-builder-group-${root.id}-toggle"]`,
    ) as HTMLButtonElement
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as RuleGroup
    expect(next.op).toBe('OR')
  })

  it('"add condition" appends a new empty leaf to the group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector(
        '[data-mol-id="rule-builder-group-root-add-condition"]',
      ) as HTMLButtonElement,
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0].kind).toBe('leaf')
  })

  it('"add group" appends a nested group with one empty leaf', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector(
        '[data-mol-id="rule-builder-group-root-add-group"]',
      ) as HTMLButtonElement,
    )
    const next = onChange.mock.calls[0][0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0].kind).toBe('group')
    expect((next.children[0] as RuleGroup).children).toHaveLength(1)
  })

  it('selecting a field auto-picks the first operator and resets value', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const leafId = 'leaf-1'
    const initialLeaf: RuleLeaf = { ...emptyLeaf(), id: leafId }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [initialLeaf] }
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    const fieldSelect = container.querySelector(
      `[data-mol-id="rule-builder-leaf-${leafId}"] select`,
    ) as HTMLSelectElement
    fireEvent.change(fieldSelect, { target: { value: 'spend' } })
    const next = onChange.mock.calls[0][0] as RuleGroup
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
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector('[data-mol-id="rule-builder-leaf-a-remove"]') as HTMLButtonElement,
    )
    const next = onChange.mock.calls[0][0] as RuleGroup
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
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    const inputs = container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    ) as NodeListOf<HTMLInputElement>
    // First input is the value (operator is a <select>).
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs[0].type).toBe('number')
    fireEvent.change(inputs[0], { target: { value: '42' } })
    const next = onChange.mock.calls[0][0] as RuleGroup
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
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    const inputs = container.querySelectorAll(
      `[data-mol-id="rule-builder-leaf-${leafId}"] input`,
    ) as NodeListOf<HTMLInputElement>
    expect(inputs.length).toBe(2)
    expect(inputs[0].value).toBe('0')
    expect(inputs[1].value).toBe('100')
    fireEvent.change(inputs[1], { target: { value: '250' } })
    const next = onChange.mock.calls[0][0] as RuleGroup
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
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    const inputs = container.querySelectorAll(`[data-mol-id="rule-builder-leaf-${leafId}"] input`)
    // No <input> rendered (only <select>s for field + operator).
    expect(inputs.length).toBe(0)
  })

  it('emits a deterministic JSON-serializable tree', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={root} onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector(
        '[data-mol-id="rule-builder-group-root-add-condition"]',
      ) as HTMLButtonElement,
    )
    const emitted = onChange.mock.calls[0][0]
    // Must round-trip through JSON without losing structure.
    const round = JSON.parse(JSON.stringify(emitted)) as Rule
    expect(round).toEqual(emitted)
    expect(round.kind).toBe('group')
  })

  it('accepts a bare leaf as the root and wraps it in an implicit AND group', () => {
    const onChange = vi.fn<(next: Rule) => void>()
    const single: RuleLeaf = { kind: 'leaf', id: 'only', field: '', op: '' }
    const { container } = render(
      <Wrap>
        <RuleBuilder schema={schema} rules={single} onChange={onChange} />
      </Wrap>,
    )
    // The implicit root renders a toggle.
    expect(container.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="rule-builder-leaf-only"]')).not.toBeNull()
  })
})
