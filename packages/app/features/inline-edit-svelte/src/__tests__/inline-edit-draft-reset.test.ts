// @vitest-environment jsdom
/**
 * `<InlineEdit>` draft resets — the port of
 * `@molecule/app-inline-edit-react/src/__tests__/inline-edit-draft-reset.test.tsx`:
 * a new `value` prop replaces the draft, while an unchanged prop leaves a
 * typed draft alone. Rendered through a real Svelte mount with a reactive
 * props bag, which is this framework's way of setting a prop again.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

const { default: InlineEdit } = await import('../InlineEdit.svelte')
const { PropBag } = await import('./props.svelte.js')
const { default: Harness } = await import('./Harness.svelte')

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** A mounted editor: its host and the writable props. */
interface Mounted {
  /** The element the harness mounted into. */
  host: HTMLElement
  /** The props the editor reads; `set` re-renders it after the write. */
  bag: InstanceType<typeof PropBag>
  /** Flushes the pending render. */
  flush(): void
}

/**
 * Mounts an {@link InlineEdit} whose `value` prop a test can change.
 *
 * @param value - The initial value prop.
 * @returns The mounted editor.
 */
function render(value: string): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const bag = new PropBag({ value, onSubmit: () => {} })
  mounted.push(mount(Harness, { target: host, props: { component: InlineEdit, bag } }))
  flushSync()
  return { host, bag, flush: flushSync }
}

/** The mounted editor input. */
function editor(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector('input')
  if (!(input instanceof HTMLInputElement)) throw new Error('no editor input rendered')
  return input
}

/** Clicks the read-state trigger open and flushes the render. */
function open(m: Mounted): void {
  m.host.querySelector('[role="button"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  m.flush()
}

/** Types a new value into the editor input and flushes the render. */
function type(m: Mounted, next: string): void {
  const input = editor(m.host)
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  m.flush()
}

describe('<InlineEdit> draft reset', () => {
  it('shows a new value prop in the same commit as the prop change', () => {
    const m = render('alpha')
    open(m)
    expect(editor(m.host).value).toBe('alpha')
    type(m, 'typed')
    expect(editor(m.host).value).toBe('typed')
    m.bag.set({ value: 'beta' })
    m.flush()
    expect(editor(m.host).value).toBe('beta')
  })

  it('keeps a typed draft when the value prop is unchanged', () => {
    const m = render('alpha')
    open(m)
    type(m, 'typed')
    m.bag.set({ value: 'alpha' })
    m.flush()
    expect(editor(m.host).value).toBe('typed')
  })
})
