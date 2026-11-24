// @vitest-environment jsdom
/**
 * `resolveNode`: Solid's `children()` with each function read in a scope of its own, so an
 * accessor item is created once and keeps its state whatever its root renders.
 *
 * @module
 */

import { createSignal, type JSX, mapArray, onCleanup, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { resolveNode } from '../resolve-node.js'

const disposers: (() => void)[] = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a component into a fresh container. */
const mount = (app: () => JSX.Element): HTMLElement => {
  const container = document.createElement('main')
  document.body.appendChild(container)
  disposers.push(render(app, container))
  return container
}

/** Inserts its resolved children, as a component that resolves a node prop does. */
const Host = (props: { children?: unknown }): JSX.Element => {
  const node = resolveNode(() => props.children)
  return <div data-host="">{node()}</div>
}

/** The roots a row component returns. */
type Root = 'element' | 'fragment' | 'show'

/** A row with its own toggle, counting its creations and disposals. */
const rows = (root: Root) => {
  const counts = { created: 0, disposed: 0 }
  const Row = (props: { label?: string }): JSX.Element => {
    counts.created += 1
    onCleanup(() => (counts.disposed += 1))
    const [on, setOn] = createSignal(false)
    const button = (
      <button type="button" onClick={() => setOn((value) => !value)}>
        {props.label ?? 'row'}
      </button>
    )
    const shown = (
      <Show when={on()}>
        <span data-on="">on</span>
      </Show>
    )
    if (root === 'element')
      return (
        <p>
          {button}
          {shown}
        </p>
      )
    if (root === 'fragment')
      return (
        <>
          {button}
          {shown}
        </>
      )
    return (
      <Show when={on()} fallback={button}>
        <span data-on="">on</span>
        {button}
      </Show>
    )
  }
  return { counts, Row }
}

describe('resolveNode', () => {
  for (const root of ['element', 'fragment', 'show'] as const)
    it(`keeps an accessor item and its state when its ${root} root changes`, () => {
      const { counts, Row } = rows(root)
      const container = mount(() => <Host>{[() => <Row />]}</Host>)
      container.querySelector('button')!.click()
      expect(counts).toEqual({ created: 1, disposed: 0 })
      expect(container.querySelector('[data-on]')).not.toBeNull()
    })

  it('reads a function returned by a function in a scope of its own', () => {
    const { counts, Row } = rows('show')
    const container = mount(() => <Host>{() => () => <Row />}</Host>)
    container.querySelector('button')!.click()
    expect(counts).toEqual({ created: 1, disposed: 0 })
    expect(container.querySelector('[data-on]')).not.toBeNull()
  })

  it('creates only the added row of a mapped list of accessor rows, and disposes a removed one', () => {
    const { counts, Row } = rows('show')
    const [labels, setLabels] = createSignal(['a', 'b'])
    // `mapArray` keeps a row's accessor while the row stays, as a typed consumer builds the list.
    const items = mapArray(labels, (label) => () => <Row label={label} />)
    const container = mount(() => <Host>{items()}</Host>)
    container.querySelector('button')!.click()
    setLabels(['a', 'b', 'c'])
    expect(counts).toEqual({ created: 3, disposed: 0 })
    expect(container.querySelector('[data-on]')).not.toBeNull()
    setLabels(['a', 'c'])
    expect(counts).toEqual({ created: 3, disposed: 1 })
    // Row a is on (its text, then its button), row c is not.
    expect(container.textContent).toBe('onac')
  })

  it('calls a function again when a signal it reads itself changes', () => {
    const a = rows('element')
    const b = rows('element')
    const [first, setFirst] = createSignal(true)
    mount(() => <Host>{[() => (first() ? <a.Row /> : <b.Row />)]}</Host>)
    setFirst(false)
    expect(a.counts).toEqual({ created: 1, disposed: 1 })
    expect(b.counts).toEqual({ created: 1, disposed: 0 })
  })

  it("keeps Solid's shape: one node as itself, a list flattened, toArray as children() gives it", () => {
    const one = document.createElement('i')
    const [x, y, z] = ['x', 'y', 'z'].map((tag) => document.createElement(tag))
    const read = (value: unknown) => {
      let resolved!: ReturnType<typeof resolveNode>
      mount(() => {
        resolved = resolveNode(() => value)
        return null
      })
      return resolved
    }
    expect(read(one)()).toBe(one)
    expect(read(() => one)()).toBe(one)
    expect(read([x, [y, () => z]])()).toEqual([x, y, z])
    expect(read(undefined).toArray()).toEqual([])
    expect(read(one).toArray()).toEqual([one])
    // A function that takes arguments is a value, as in Solid.
    const render = (row: unknown): unknown => row
    expect(read(render)()).toBe(render)
  })
})
