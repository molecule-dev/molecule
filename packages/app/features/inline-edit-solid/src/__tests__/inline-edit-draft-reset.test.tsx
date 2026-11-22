// @vitest-environment jsdom
/**
 * `<InlineEdit>` draft resets — the port of
 * `@molecule/app-inline-edit-react/src/__tests__/inline-edit-draft-reset.test.tsx`:
 * a new `value` prop replaces the draft, while an unchanged prop leaves a
 * typed draft alone. Rendered with Solid in jsdom and asserted on the editor
 * input's value, like the React suite does.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

/** The props the field mock renders: React's controlled-input contract. */
interface FieldProps {
  /** The value the element shows. */
  value?: string
  /** Receives each typed value (React's `onChange`). */
  onChange?: (event: Event) => void
  /** Receives the Escape / Enter keys. */
  onKeyDown?: (event: KeyboardEvent) => void
  /** The field's accessible label. */
  'aria-label'?: string
}

// The same markers the React suite's UI mocks render. The field mock writes
// the `value` prop onto the element's value property (Solid's `value` DOM
// property), so the test reads what a user would see; `onInput` is the native
// event React's and the bond's `onChange` report.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
  Input: (props: FieldProps) => (
    <input
      data-input=""
      value={props.value}
      onInput={props.onChange}
      onKeyDown={props.onKeyDown}
      aria-label={props['aria-label']}
    />
  ),
  Textarea: (props: FieldProps) => (
    <textarea
      data-textarea=""
      value={props.value}
      onInput={props.onChange}
      onKeyDown={props.onKeyDown}
      aria-label={props['aria-label']}
    />
  ),
}))

const { InlineEdit } = await import('../InlineEdit.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** The props a test writes to re-render the mounted editor. */
interface Row {
  /** The `value` the parent passes to the editor. */
  value: string
}

/** A mounted editor: its container and the writable parent state. */
interface Mounted {
  /** The element the editor rendered into. */
  container: HTMLElement
  /** Replaces the parent state — a fresh equal object is a re-render with the same props. */
  setRow(next: Row): void
}

/**
 * Mounts an {@link InlineEdit} whose `value` prop a test can change.
 *
 * @param value - The initial value prop.
 * @returns The mounted editor.
 */
function mount(value: string): Mounted {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [row, setRow] = createSignal<Row>({ value })
  disposers.push(render(() => <InlineEdit value={row().value} onSubmit={() => {}} />, container))
  return { container, setRow }
}

/** The mounted editor input. */
function editor(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('[data-input]')
  if (!(input instanceof HTMLInputElement)) throw new Error('no editor input rendered')
  return input
}

describe('<InlineEdit> draft reset', () => {
  it('shows a new value prop in the same commit as the prop change', () => {
    const m = mount('alpha')
    m.container
      .querySelector('[role="button"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(editor(m.container).value).toBe('alpha')
    const input = editor(m.container)
    input.value = 'typed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(editor(m.container).value).toBe('typed')
    m.setRow({ value: 'beta' })
    expect(editor(m.container).value).toBe('beta')
  })

  it('keeps a typed draft when the value prop is unchanged', () => {
    const m = mount('alpha')
    m.container
      .querySelector('[role="button"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const input = editor(m.container)
    input.value = 'typed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    // A fresh object carrying the same value: the parent re-renders with an
    // unchanged `value` prop, as React's `rerender` does.
    m.setRow({ value: 'alpha' })
    expect(editor(m.container).value).toBe('typed')
  })
})
