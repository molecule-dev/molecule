// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useFormState.test.tsx`: the form-state
 * tuples `useForm().asState` exposes, under the same titles.
 *
 * React's `renderHook` case becomes a mounted probe whose hook result is
 * captured; a `rerender` with new arguments becomes a signal the options
 * accessor reads. The assertions and the inputs are the same.
 *
 * @module
 */

import { createEffect, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { createNativeFormProvider } from '@molecule/app-forms'

import { useForm, type UseFormResult } from '../primitives/react-forms.js'

interface Fields {
  name: string
  email: string
}

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * The labeled element, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param label - The element's `aria-label`.
 * @returns The element.
 */
function labeled(container: HTMLElement, label: string): HTMLInputElement {
  const element = container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)
  if (!element) throw new Error(`no element matched ${label}`)
  return element
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useForm state tuples', () => {
  it('external values preserve dirty fields by default', () => {
    const [values, setValues] = createSignal<Fields>({
      name: 'First',
      email: 'first@example.test',
    })
    let form!: UseFormResult<Fields>
    function Probe(): null {
      form = useForm<Fields>(() => ({ defaultValues: { name: '', email: '' }, values: values() }))
      return null
    }
    mount(() => <Probe />)

    form.asState('name')[1]('Typed')
    setValues({ name: 'Loaded', email: 'loaded@example.test' })
    expect(form.getValue('name')).toBe('Typed')
    expect(form.getValue('email')).toBe('loaded@example.test')
  })

  it('an explicit external replacement remains available', () => {
    const [values, setValues] = createSignal({ name: 'First' })
    let form!: UseFormResult<{ name: string }>
    function Probe(): null {
      form = useForm<{ name: string }>(() => ({
        defaultValues: { name: '' },
        values: values(),
        resetOptions: { keepDirtyValues: false },
      }))
      return null
    }
    mount(() => <Probe />)

    form.asState('name')[1]('Typed')
    setValues({ name: 'Replacement' })
    expect(form.getValue('name')).toBe('Replacement')
  })

  it('preserves typing before a late effect answer while pristine fields fill', () => {
    const [values, setValues] = createSignal<Fields | undefined>(undefined)
    function Preferences(): JSX.Element {
      const form = useForm<Fields>({ defaultValues: { name: '', email: '' } })
      const [, setDraft, fillDraft] = form.asState()
      createEffect(() => {
        const incoming = values()
        if (incoming) fillDraft(incoming)
      })
      return (
        <>
          <input
            aria-label="Name"
            value={form.formState().values.name}
            onInput={(event) =>
              setDraft((previous) => ({ ...previous, name: event.currentTarget.value }))
            }
          />
          <input
            aria-label="Email"
            value={form.formState().values.email}
            onInput={(event) =>
              setDraft((previous) => ({ ...previous, email: event.currentTarget.value }))
            }
          />
        </>
      )
    }
    const container = mount(() => <Preferences />)
    const name = labeled(container, 'Name')
    name.value = 'Typed name'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    setValues({ name: 'Server name', email: 'saved@example.test' })
    expect(labeled(container, 'Name').value).toBe('Typed name')
    expect(labeled(container, 'Email').value).toBe('saved@example.test')
  })

  it('single-field fill preserves an edit and accepts functional updates', () => {
    interface QuantityFields {
      quantity: number
    }
    let form!: UseFormResult<QuantityFields>
    function Probe(): null {
      form = useForm<QuantityFields>({ defaultValues: { quantity: 1 } })
      return null
    }
    mount(() => <Probe />)

    const [, edit, fill] = form.asState('quantity')
    edit((previous) => previous + 2)
    fill(10)
    expect(form.asState('quantity')[0]).toBe(3)
  })

  it('a pristine field takes a loaded value and equal edits remain pristine', () => {
    let form!: UseFormResult<Fields>
    function Probe(): null {
      form = useForm<Fields>({ defaultValues: { name: '', email: '' } })
      return null
    }
    mount(() => <Probe />)

    form.asState()[1]((previous) => ({ ...previous }))
    form.asState()[2]({ name: 'Loaded', email: 'saved@example.test' })
    expect(form.asState()[0]).toEqual({ name: 'Loaded', email: 'saved@example.test' })
  })

  it('a new record key drops the old dirty draft and an old fill cannot affect it', () => {
    const [id, setId] = createSignal<string>('first')
    let form!: UseFormResult<{ title: string }>
    function Probe(): null {
      form = useForm<{ title: string }>(() => ({ defaultValues: { title: '' }, resetKey: id() }))
      return null
    }
    mount(() => <Probe />)

    form.asState()[1]({ title: 'First draft' })
    const oldFill = form.asState()[2]
    setId('second')
    oldFill({ title: 'Late first answer' })
    form.asState()[2]({ title: 'Second record' })
    expect(form.asState()[0]).toEqual({ title: 'Second record' })
  })

  it('different records may have identical loaded field content', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) =>
      native.createForm({ ...options, values: undefined })
    const [id, setId] = createSignal<string>('first')
    let form!: UseFormResult<{ title: string }>
    function Probe(): null {
      form = useForm<{ title: string }>(() => ({
        createForm,
        defaultValues: { title: '' },
        resetKey: id(),
        values: { title: 'Shared title' },
      }))
      return null
    }
    mount(() => <Probe />)

    form.asState('title')[1]('First draft')
    setId('second')
    expect(form.getValue('title')).toBe('Shared title')
    expect(form.isDirty()).toBe(false)
  })

  it('explicit edits and form resets remain intentional replacements', () => {
    let form!: UseFormResult<{ title: string }>
    function Probe(): null {
      form = useForm<{ title: string }>({ defaultValues: { title: 'Initial' } })
      return null
    }
    mount(() => <Probe />)

    form.asState('title')[1]('Typed')
    form.reset({ title: 'Explicit reset' })
    expect(form.asState('title')[0]).toBe('Explicit reset')
  })

  it('keeps edit and fill callbacks stable across notifications and rerenders', () => {
    let form!: UseFormResult<{ title: string }>
    function Probe(): null {
      form = useForm<{ title: string }>({ defaultValues: { title: '' } })
      return null
    }
    mount(() => <Probe />)

    const edit = form.asState('title')[1]
    const fill = form.asState('title')[2]
    fill('Loaded')
    expect(form.asState('title')[1]).toBe(edit)
    expect(form.asState('title')[2]).toBe(fill)
  })

  it('functional fills read the latest baseline while preserving a dirty field', () => {
    interface DraftFields {
      name: string
      quantity: number
    }
    let form!: UseFormResult<DraftFields>
    function Probe(): null {
      form = useForm<DraftFields>({ defaultValues: { name: '', quantity: 0 } })
      return null
    }
    mount(() => <Probe />)

    form.asState()[2]({ quantity: 2 })
    form.asState()[1]((previous) => ({ ...previous, name: 'Typed' }))
    form.asState()[2]((previous) => ({
      ...previous,
      name: 'Server',
      quantity: previous.quantity + 1,
    }))
    expect(form.asState()[0]).toEqual({ name: 'Typed', quantity: 3 })
  })

  it('a provider with cloned getters retains stable displayed values between notifications', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) => {
      const form = native.createForm(options)
      return { ...form, getState: () => structuredClone(form.getState()) }
    }
    let form!: UseFormResult<{ name: string }>
    function Probe(): null {
      form = useForm<{ name: string }>({ defaultValues: { name: '' }, createForm })
      return null
    }
    mount(() => <Probe />)

    const method = form.asState
    const first = form.asState()[0]
    expect(form.asState()[0]).toBe(first)
    form.asState()[2]({ name: 'Loaded' })
    expect(form.asState).toBe(method)
    expect(form.asState()[0]).toEqual({ name: 'Loaded' })
  })
})
