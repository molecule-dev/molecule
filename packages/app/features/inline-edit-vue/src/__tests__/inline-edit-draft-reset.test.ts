// @vitest-environment jsdom
/**
 * `<InlineEdit>` draft resets — the port of
 * `@molecule/app-inline-edit-react/src/__tests__/inline-edit-draft-reset.test.tsx`:
 * a new `value` prop replaces the draft before the editor next renders, while
 * an unchanged prop leaves a typed draft alone. Rendered with Vue in jsdom and
 * asserted on the editor input's value, like the React suite does.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The same markers the React suite's UI mocks render. The field mock keeps the
// `value` prop on the element's value property (React's controlled input), and
// fires `onChange` on the native `input` event the real Vue Input reports.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      props: { variant: String, size: String, color: String, disabled: Boolean },
      emits: ['click'],
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Input: defineComponent({
      name: 'Input',
      inheritAttrs: false,
      props: { type: String, value: String },
      setup(props, { attrs }) {
        return () =>
          h('input', {
            'data-input': '',
            ref: (node: unknown) => {
              if (node instanceof HTMLInputElement && props.value !== undefined)
                node.value = String(props.value)
            },
            onInput: (event: Event) => {
              ;(attrs.onChange as ((event: Event) => void) | undefined)?.(event)
            },
            onKeydown: (event: KeyboardEvent) => {
              ;(attrs.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event)
            },
            'aria-label': attrs['aria-label'],
          })
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      inheritAttrs: false,
      props: { value: String },
      setup(props, { attrs }) {
        return () =>
          h('textarea', {
            'data-textarea': '',
            ref: (node: unknown) => {
              if (node instanceof HTMLTextAreaElement && props.value !== undefined)
                node.value = String(props.value)
            },
            onInput: (event: Event) => {
              ;(attrs.onChange as ((event: Event) => void) | undefined)?.(event)
            },
            onKeydown: (event: KeyboardEvent) => {
              ;(attrs.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event)
            },
            'aria-label': attrs['aria-label'],
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick, reactive } from 'vue'

import { InlineEdit } from '../InlineEdit.js'

/** The props a test writes to re-render the mounted editor. */
interface EditorState {
  /** The `value` prop the parent passes. */
  value: string
  /** Bumped to re-render the parent with the same props, React's `rerender`. */
  tick: number
}

/** A mounted editor: its host, the writable props, and a teardown. */
interface Mounted {
  /** The element the app mounted into. */
  host: HTMLElement
  /** The props the parent renders with. */
  state: EditorState
  /** Tears the app down and removes the host. */
  unmount(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
})

/**
 * Mounts an {@link InlineEdit} whose `value` prop a test can change.
 *
 * @param value - The initial value prop.
 * @returns The mounted editor.
 */
function render(value: string): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const state = reactive<EditorState>({ value, tick: 0 })
  const app = createApp(
    defineComponent({
      setup() {
        return () => {
          // Reading `tick` re-renders the parent while passing the same
          // `value` — React's `rerender` with unchanged props.
          void state.tick
          return h(InlineEdit, { value: state.value, onSubmit: () => {} })
        }
      },
    }),
  )
  app.mount(host)
  const entry = {
    host,
    state,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

/** The mounted editor input. */
function editor(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector('[data-input]')
  if (!(input instanceof HTMLInputElement)) throw new Error('no editor input rendered')
  return input
}

describe('<InlineEdit> draft reset', () => {
  it('shows a new value prop in the same commit as the prop change', async () => {
    const m = render('alpha')
    m.host
      .querySelector('[role="button"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(editor(m.host).value).toBe('alpha')
    const input = editor(m.host)
    input.value = 'typed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(editor(m.host).value).toBe('typed')
    m.state.value = 'beta'
    await nextTick()
    expect(editor(m.host).value).toBe('beta')
  })

  it('keeps a typed draft when the value prop is unchanged', async () => {
    const m = render('alpha')
    m.host
      .querySelector('[role="button"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    const input = editor(m.host)
    input.value = 'typed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    m.state.tick += 1
    await nextTick()
    expect(editor(m.host).value).toBe('typed')
  })
})
