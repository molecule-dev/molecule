// @vitest-environment jsdom
/**
 * Unit tests of `RuleBuilder` — the port of
 * `@molecule/app-rule-builder-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavior and emitted trees.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import type { Rule, RuleGroup, RuleLeaf, RuleSchema } from '../types.js'
import { emptyGroup, emptyLeaf } from '../utilities.js'

const { RuleBuilder } = await import('../rule-builder.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app writes it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RuleBuilder as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-rule-builder [schema]="p['schema']" [rules]="p['rules']" [onChange]="p['onChange']" [className]="p['className']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
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

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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

/**
 * Mounts the builder with the given props and records it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

describe('<RuleBuilder>', () => {
  it('renders a labelled application root with the AND toggle', async () => {
    const m = await render({ schema, rules: emptyGroup('AND'), onChange: () => {} })
    expect(m.host.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    // The root group shows its current operator label.
    expect(m.host.textContent).toContain('AND')
  })

  it('clicking the operator toggle flips the group AND ↔ OR', async () => {
    const calls: Rule[] = []
    const root = emptyGroup('AND')
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    click(m.host.querySelector(`[data-mol-id="rule-builder-group-${root.id}-toggle"]`))
    expect(calls).toHaveLength(1)
    expect((calls[0] as RuleGroup).op).toBe('OR')
  })

  it('"add condition" appends a new empty leaf to the group', async () => {
    const calls: Rule[] = []
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    click(m.host.querySelector('[data-mol-id="rule-builder-group-root-add-condition"]'))
    expect(calls).toHaveLength(1)
    const next = calls[0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0]!.kind).toBe('leaf')
  })

  it('"add group" appends a nested group with one empty leaf', async () => {
    const calls: Rule[] = []
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    click(m.host.querySelector('[data-mol-id="rule-builder-group-root-add-group"]'))
    const next = calls[0] as RuleGroup
    expect(next.children).toHaveLength(1)
    expect(next.children[0]!.kind).toBe('group')
    expect((next.children[0] as RuleGroup).children).toHaveLength(1)
  })

  it('selecting a field auto-picks the first operator and resets value', async () => {
    const calls: Rule[] = []
    const leafId = 'leaf-1'
    const initialLeaf: RuleLeaf = { ...emptyLeaf(), id: leafId }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [initialLeaf] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    setField(m.host.querySelector(`[data-mol-id="rule-builder-leaf-${leafId}"] select`), 'spend')
    const next = calls[0] as RuleGroup
    const child = next.children[0] as RuleLeaf
    expect(child.field).toBe('spend')
    // Default number-field operator is "=" (id "eq").
    expect(child.op).toBe('eq')
    expect(child.value).toBeUndefined()
  })

  it('removing a child drops it from the group', async () => {
    const calls: Rule[] = []
    const a: RuleLeaf = { kind: 'leaf', id: 'a', field: '', op: '' }
    const b: RuleLeaf = { kind: 'leaf', id: 'b', field: '', op: '' }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [a, b] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    click(m.host.querySelector('[data-mol-id="rule-builder-leaf-a-remove"]'))
    const next = calls[0] as RuleGroup
    expect(next.children.map((c) => c.id)).toEqual(['b'])
  })

  it('renders a number value editor for number fields and serializes the value', async () => {
    const calls: Rule[] = []
    const leafId = 'leaf-1'
    const numberLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'spend',
      op: 'gt',
      value: undefined,
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [numberLeaf] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    const inputs = m.host.querySelectorAll(`[data-mol-id="rule-builder-leaf-${leafId}"] input`)
    // First input is the value (operator is a <select>).
    expect(inputs.length).toBeGreaterThan(0)
    expect((inputs[0] as HTMLInputElement).type).toBe('number')
    setField(inputs[0]!, '42')
    const next = calls[0] as RuleGroup
    expect((next.children[0] as RuleLeaf).value).toBe(42)
  })

  it('renders two value inputs for "between" operators', async () => {
    const calls: Rule[] = []
    const leafId = 'leaf-1'
    const betweenLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'spend',
      op: 'between',
      value: [0, 100],
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [betweenLeaf] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    const inputs = m.host.querySelectorAll(`[data-mol-id="rule-builder-leaf-${leafId}"] input`)
    expect(inputs.length).toBe(2)
    expect((inputs[0] as HTMLInputElement).value).toBe('0')
    expect((inputs[1] as HTMLInputElement).value).toBe('100')
    setField(inputs[1]!, '250')
    const next = calls[0] as RuleGroup
    expect((next.children[0] as RuleLeaf).value).toEqual([0, 250])
  })

  it('hides the value input for unary operators (e.g. is empty)', async () => {
    const calls: Rule[] = []
    const leafId = 'leaf-1'
    const unaryLeaf: RuleLeaf = {
      kind: 'leaf',
      id: leafId,
      field: 'plan',
      op: 'isEmpty',
      value: undefined,
    }
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [unaryLeaf] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    const inputs = m.host.querySelectorAll(`[data-mol-id="rule-builder-leaf-${leafId}"] input`)
    // No <input> rendered (only <select>s for field + operator).
    expect(inputs.length).toBe(0)
  })

  it('emits a deterministic JSON-serializable tree', async () => {
    const calls: Rule[] = []
    const root: RuleGroup = { kind: 'group', id: 'root', op: 'AND', children: [] }
    const m = await render({ schema, rules: root, onChange: (next: Rule) => calls.push(next) })
    click(m.host.querySelector('[data-mol-id="rule-builder-group-root-add-condition"]'))
    const emitted = calls[0]!
    // Must round-trip through JSON without losing structure.
    const round = JSON.parse(JSON.stringify(emitted)) as Rule
    expect(round).toEqual(emitted)
    expect(round.kind).toBe('group')
  })

  it('accepts a bare leaf as the root and wraps it in an implicit AND group', async () => {
    const single: RuleLeaf = { kind: 'leaf', id: 'only', field: '', op: '' }
    const m = await render({ schema, rules: single, onChange: () => {} })
    // The implicit root renders a toggle.
    expect(m.host.querySelector('[data-mol-id="rule-builder"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="rule-builder-leaf-only"]')).not.toBeNull()
  })
})
