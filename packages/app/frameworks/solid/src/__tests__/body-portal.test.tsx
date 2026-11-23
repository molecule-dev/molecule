// @vitest-environment jsdom
/**
 * `BodyPortal` against React's `createPortal(children, target)`: anything Solid
 * can render (`<Show>`, `<For>`, text, a conditional) goes into the target
 * unwrapped, follows its changes, and leaves the target clean when it closes.
 *
 * @module
 */

import { createSignal, For, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { BodyPortal } from '../body-portal.jsx'

/** The nodes currently under `document.body`. */
const bodyChildren = (): Node[] => Array.from(document.body.childNodes)

/** The rendered portaled `<p>` values, in body order. */
const paragraphs = (): string[] =>
  bodyChildren()
    .filter((node): node is HTMLParagraphElement => node.nodeName === 'P')
    .map((node) => node.getAttribute('data-p') ?? '')

/** Mounts a component under a container inside the body. */
const mount = (app: () => JSX.Element): { dispose: () => void; container: HTMLElement } => {
  const container = document.createElement('main')
  document.body.appendChild(container)
  const dispose = render(app, container)
  return { dispose, container }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('BodyPortal', () => {
  it('renders a <Show> child and leaves nothing behind when it closes', () => {
    const [open, setOpen] = createSignal(true)
    const { dispose } = mount(() => (
      <BodyPortal>
        <Show when={open()}>
          <div data-p="shown" />
        </Show>
      </BodyPortal>
    ))
    expect(bodyChildren().some((node) => node.nodeName === 'DIV')).toBe(true)

    setOpen(false)
    expect(bodyChildren().some((node) => node.nodeName === 'DIV')).toBe(false)

    dispose()
    expect(bodyChildren().map((node) => node.nodeName)).toEqual(['MAIN'])
  })

  it('keeps a <For> list in step as it grows and shrinks', () => {
    const [items, setItems] = createSignal(['a', 'b'])
    const { dispose } = mount(() => (
      <BodyPortal>
        <For each={items()}>{(item) => <p data-p={item} />}</For>
      </BodyPortal>
    ))
    expect(paragraphs()).toEqual(['a', 'b'])

    setItems(['a', 'x', 'b'])
    expect(paragraphs()).toEqual(['a', 'x', 'b'])

    setItems([])
    expect(paragraphs()).toEqual([])

    setItems(['z'])
    expect(paragraphs()).toEqual(['z'])

    dispose()
    expect(bodyChildren().map((node) => node.nodeName)).toEqual(['MAIN'])
  })

  it('renders a text child and does not leak an element beside a conditional', () => {
    const text = mount(() => <BodyPortal>plain text</BodyPortal>)
    expect(document.body.textContent).toContain('plain text')
    text.dispose()
    text.container.remove()
    expect(document.body.textContent).not.toContain('plain text')

    const [extra, setExtra] = createSignal(false)
    const { dispose } = mount(() => (
      <BodyPortal>
        <div data-p="overlay" />
        {extra() && <div data-p="extra" />}
      </BodyPortal>
    ))
    expect(bodyChildren().filter((node) => node.nodeName === 'DIV')).toHaveLength(1)

    setExtra(true)
    expect(bodyChildren().filter((node) => node.nodeName === 'DIV')).toHaveLength(2)

    dispose()
    expect(bodyChildren().map((node) => node.nodeName)).toEqual(['MAIN'])
  })

  it('renders into a mount target instead of the body', () => {
    const target = document.createElement('section')
    document.body.appendChild(target)
    const { dispose } = mount(() => (
      <BodyPortal mount={target}>
        <div data-p="chip" />
      </BodyPortal>
    ))
    expect(target.querySelector('div[data-p="chip"]')).not.toBeNull()
    expect(document.body.querySelector(':scope > div[data-p="chip"]')).toBeNull()

    dispose()
    expect(target.childNodes).toHaveLength(0)
  })
})
