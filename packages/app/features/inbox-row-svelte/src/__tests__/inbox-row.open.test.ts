// @vitest-environment jsdom
/**
 * Open-button tests for the Svelte `<InboxRow>` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.open.test.tsx`.
 * Renders into a real DOM (jsdom): while `onClick` is set the row renders an
 * empty, transparent native button over itself — the whole row is the hit
 * area, and the button is named by the sender and the subject — and the inner
 * controls keep their own clicks.
 */
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InboxRow from '../InboxRow.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts an `InboxRow` with the given props, returning its open button and
 * the target it rendered into.
 *
 * @param props - The row props.
 */
const render = (
  props: ComponentProps<typeof InboxRow>,
): { button: HTMLButtonElement | null; target: HTMLElement } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(InboxRow, { target, props }))
  flushSync()
  return { button: target.querySelector('button[data-mol-id="inbox-row-open"]'), target }
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('InboxRow open button', () => {
  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const { button } = render({ sender: 'A', subject: 'S', onClick })
    if (!button) throw new Error('the open button did not render')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onToggleStar = vi.fn()
    const { target } = render({
      sender: 'A',
      subject: 'S',
      onClick,
      onToggleStar,
      labels: raw('<span data-label="">Work</span>'),
      selectionSlot: raw('<input data-select="" type="checkbox" />'),
    })
    const star = target.querySelector<HTMLElement>('button[data-mol-id="inbox-row-star"]')
    if (!star) throw new Error('the star button did not render')
    star.click()
    expect(onToggleStar).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
    const select = target.querySelector<HTMLElement>('input[data-select]')
    if (!select) throw new Error('the selection slot did not render')
    select.click()
    expect(onClick).not.toHaveBeenCalled()
    const label = target.querySelector<HTMLElement>('span[data-label]')
    if (!label) throw new Error('the labels slot did not render')
    label.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const onClick = vi.fn()
    const { button } = render({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    const labelledBy = button.getAttribute('aria-labelledby') ?? ''
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    expect(ids).toHaveLength(2)
    const name = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    expect(name).toBe('Alice Lunch?')
  })

  it('without onClick there is no open button', () => {
    const clickable = render({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable.button).toBeTruthy()
    const plain = render({ sender: 'A', subject: 'S' })
    expect(plain.button).toBeNull()
  })
})
