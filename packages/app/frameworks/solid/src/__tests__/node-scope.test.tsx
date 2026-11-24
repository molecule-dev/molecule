// @vitest-environment jsdom
/**
 * `PresentWhileNode` and `ResolveNode` read a node prop where it renders: the wrapper follows
 * React's `slot(node)` rule, and the node's components are created and disposed with the branch
 * that shows them, as React mounts them.
 *
 * @module
 */

import { createSignal, For, type JSX, onCleanup, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { createNodePresence, PresentWhileNode, ResolveNode } from '../node-scope.jsx'

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

/** A component that counts its own creations and disposals. */
const probe = (): { Probe: () => JSX.Element; created: () => number; disposed: () => number } => {
  let created = 0
  let disposed = 0
  return {
    Probe: () => {
      created++
      onCleanup(() => disposed++)
      return <b>{`probe ${created}`}</b>
    },
    created: () => created,
    disposed: () => disposed,
  }
}

/** A dialog-like component: the footer shows only while open, read through PresentWhileNode. */
const Dialog = (props: { open: boolean; footer?: unknown }): JSX.Element => (
  <Show when={props.open}>
    <section>
      <PresentWhileNode node={props.footer}>
        {(footer) => <footer>{footer()}</footer>}
      </PresentWhileNode>
    </section>
  </Show>
)

describe('PresentWhileNode', () => {
  it('renders the wrapper only while the node renders something', () => {
    const [rows, setRows] = createSignal<string[]>(['Save'])
    const container = mount(() => (
      <Dialog open footer={<For each={rows()}>{(row) => <button>{row}</button>}</For>} />
    ))
    expect(container.innerHTML).toBe('<section><footer><button>Save</button></footer></section>')
    setRows([])
    expect(container.innerHTML).toBe('<section></section>')
    setRows(['Done'])
    expect(container.innerHTML).toBe('<section><footer><button>Done</button></footer></section>')
  })

  it('renders no wrapper for any node that renders nothing', () => {
    for (const nothing of [undefined, null, false, '', [], [null, false]]) {
      const container = mount(() => <Dialog open footer={nothing} />)
      expect(container.innerHTML).toBe('<section></section>')
    }
  })

  it("creates the node's components only while the branch shows them, again on each opening", () => {
    const { Probe, created, disposed } = probe()
    const [open, setOpen] = createSignal(false)
    const container = mount(() => <Dialog open={open()} footer={<Probe />} />)
    expect(created()).toBe(0)
    expect(container.innerHTML).toBe('')
    setOpen(true)
    expect(created()).toBe(1)
    expect(container.innerHTML).toBe('<section><footer><b>probe 1</b></footer></section>')
    setOpen(false)
    expect(disposed()).toBe(1)
    setOpen(true)
    expect(created()).toBe(2)
    expect(container.innerHTML).toBe('<section><footer><b>probe 2</b></footer></section>')
  })
})

describe('ResolveNode', () => {
  it('always renders its callback, with presence that follows the node', () => {
    const [label, setLabel] = createSignal<unknown>('Email')
    const container = mount(() => (
      <ResolveNode node={label()}>
        {(node, present) => (
          <span data-present={String(present())}>
            <Show when={present()} fallback="default">
              <i>{node()}</i>
            </Show>
          </span>
        )}
      </ResolveNode>
    ))
    expect(container.innerHTML).toBe('<span data-present="true"><i>Email</i></span>')
    setLabel([])
    expect(container.innerHTML).toBe('<span data-present="false">default</span>')
    setLabel('Name')
    expect(container.innerHTML).toBe('<span data-present="true"><i>Name</i></span>')
  })
})

describe('createNodePresence', () => {
  it('reports presence out of the branch while the scope renders, and false once it is gone', () => {
    const [open, setOpen] = createSignal(true)
    const [title, setTitle] = createSignal<unknown>('Rename')
    const presence = createNodePresence()
    const container = mount(() => (
      <div data-labelled={String(presence.present())}>
        <Show when={open()}>
          <ResolveNode node={title()}>
            {(node, present) => {
              presence.report(present)
              return <h2>{node()}</h2>
            }}
          </ResolveNode>
        </Show>
      </div>
    ))
    expect(container.innerHTML).toBe('<div data-labelled="true"><h2>Rename</h2></div>')
    setTitle([])
    expect(container.innerHTML).toBe('<div data-labelled="false"><h2></h2></div>')
    setTitle('Move')
    setOpen(false)
    expect(container.innerHTML).toBe('<div data-labelled="false"></div>')
    setOpen(true)
    expect(container.innerHTML).toBe('<div data-labelled="true"><h2>Move</h2></div>')
  })
})
