// @vitest-environment jsdom

/**
 * `useForm` over the bonded forms provider: submit, validation, field
 * selection, controller switches and bonded-provider defaults.
 *
 * Mirrors the React package's `useForm.integration.test.tsx`.
 *
 * @module
 */

import { type Accessor, createComponent, createSignal, type JSX, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormValuesConstraint,
} from '@molecule/app-forms'
import { createNativeFormProvider, setProvider } from '@molecule/app-forms'

import { useFieldState, useForm, type UseFormResult, useWatch } from '../primitives/react-forms.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
})

/** A valid provider may return fresh objects at every level of a snapshot. */
function providerWithClonedSnapshots(): FormProvider {
  const native = createNativeFormProvider()
  return {
    createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
      const form = native.createForm(options)
      return {
        ...form,
        getState: () => structuredClone(form.getState()),
        getFieldState: (name) => structuredClone(form.getFieldState(name)),
        getValue: <K extends keyof T>(name: K): T[K] => structuredClone(form.getValue(name)),
      }
    },
  }
}

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
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * The element matching a selector, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param selector - The CSS selector.
 * @returns The matching element.
 */
function query<T extends Element>(container: HTMLElement, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element matched ${selector}`)
  return element
}

/**
 * Dispatches a submit through the form element the way a person's button press
 * does.
 *
 * @param container - The rendered tree.
 * @param label - The form's `aria-label`.
 */
function submitForm(container: HTMLElement, label: string): void {
  query(container, `form[aria-label="${label}"]`).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
}

/**
 * Types into a labeled control the way a person does.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @param next - The text to type.
 */
function typeInto(container: HTMLElement, label: string, next: string): void {
  const element = query<HTMLInputElement | HTMLTextAreaElement>(
    container,
    `[aria-label="${label}"]`,
  )
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * The text of the labeled status element.
 *
 * @param container - The rendered tree.
 * @param label - The element's `aria-label`, or its default `status` role.
 * @returns The element's text.
 */
function statusText(container: HTMLElement, label = 'Status'): string {
  return query<HTMLElement>(container, `[aria-label="${label}"]`).textContent ?? ''
}

describe.each([
  ['native', createNativeFormProvider],
  ['cloned snapshots', providerWithClonedSnapshots],
] as const)('Solid form integration: %s provider', (_name, createProvider) => {
  it('mounts, validates and submits the latest typed values while keeping the input mounted', async () => {
    const provider = createProvider()
    let finishSubmit!: () => void
    const submit = vi.fn<(values: { email: string }) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
        }),
    )
    function ContactForm(): JSX.Element {
      const form = useForm({ createForm: provider.createForm, defaultValues: { email: '' } })
      const field = form.register('email', { required: 'Email required' })
      return (
        <form aria-label="Contact" onSubmit={form.handleSubmit(submit)}>
          <input
            aria-label="Email"
            name="email"
            value={field.value as string}
            onInput={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
          <button disabled={form.isSubmitting()}>Submit</button>
          {form.formState().errors.email && <p role="alert">{form.formState().errors.email}</p>}
          <output aria-label="Status">{form.isSubmitting() ? 'Submitting' : 'Idle'}</output>
        </form>
      )
    }
    const container = mount(() => createComponent(ContactForm, {}))
    const input = query<HTMLInputElement>(container, 'input[aria-label="Email"]')

    submitForm(container, 'Contact')
    await settle()
    expect(submit).not.toHaveBeenCalled()
    expect(query<HTMLElement>(container, '[role="alert"]').textContent).toBe('Email required')
    expect(document.activeElement).toBe(input)

    typeInto(container, 'Email', 'reader@example.test')
    submitForm(container, 'Contact')
    await settle()
    expect(submit).toHaveBeenCalledExactlyOnceWith({ email: 'reader@example.test' })
    expect(query(container, 'input[aria-label="Email"]')).toBe(input)
    expect(statusText(container)).toBe('Submitting')
    expect(query<HTMLButtonElement>(container, 'button').disabled).toBe(true)

    finishSubmit()
    await settle()
    expect(query(container, 'input[aria-label="Email"]')).toBe(input)
    expect(input.value).toBe('reader@example.test')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(statusText(container)).toBe('Idle')
    expect(query<HTMLButtonElement>(container, 'button').disabled).toBe(false)
  })

  it('uses provider field semantics through edits, reset, field selection and controller switches', () => {
    type Values = { email: string; backup: string }
    const first = createProvider().createForm<Values>({
      defaultValues: { email: 'first', backup: 'backup' },
    })
    const second = createProvider().createForm<Values>({
      defaultValues: { email: 'second', backup: 'other' },
    })
    const readSecond = vi.spyOn(second, 'getFieldState')
    // The selection is the probe's reactive argument: React's `rerender` with
    // new props, which a Solid primitive follows through an accessor.
    const [selection, setSelection] = createSignal<{
      form: FormController<Values>
      name: keyof Values
    }>({ form: first, name: 'email' })
    let state!: Accessor<FieldState<Values[keyof Values]>>
    function FieldProbe(): null {
      state = useFieldState(
        () => selection().form,
        () => selection().name,
      )
      return null
    }
    mount(() => createComponent(FieldProbe, {}))

    expect(state()).toEqual(first.getFieldState('email'))
    expect(state().dirty).toBe(false)
    first.setValue('email', 'edited')
    expect(state()).toMatchObject({ value: 'edited', dirty: true, touched: true })
    first.setError('email', 'Invalid')
    expect(state()).toMatchObject({ error: 'Invalid', valid: false })
    first.reset()
    expect(state()).toEqual(first.getFieldState('email'))
    expect(state().dirty).toBe(false)

    setSelection({ form: first, name: 'backup' })
    expect(state().value).toBe('backup')
    first.setValue('email', 'unselected')
    expect(state().value).toBe('backup')

    setSelection({ form: second, name: 'backup' })
    expect(state().value).toBe('other')
    first.setValue('backup', 'old controller')
    expect(state().value).toBe('other')
    second.setValue('backup', 'new controller')
    expect(state().value).toBe('new controller')

    for (const dispose of disposers.splice(0)) dispose()
    readSecond.mockClear()
    second.setValue('backup', 'after unmount')
    expect(readSecond).not.toHaveBeenCalled()
  })

  it('clears submitting state when the real submit callback rejects', async () => {
    const provider = createProvider()
    let form!: UseFormResult<{ email: string }>
    function Probe(): null {
      form = useForm({ createForm: provider.createForm, defaultValues: { email: 'reader' } })
      return null
    }
    mount(() => createComponent(Probe, {}))
    const failure = new Error('Submission failed')
    await expect(
      form.handleSubmit(async () => {
        throw failure
      })(),
    ).rejects.toBe(failure)
    expect(form.isSubmitting()).toBe(false)
    expect(form.formState().submitCount).toBe(1)
  })
})

describe('useForm bonded provider default', () => {
  it('creates the controller from the bonded forms provider without forwarding the factory', () => {
    const native = createNativeFormProvider()
    let bondedCalls = 0
    let receivedKeys: string[] = []
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        receivedKeys = Object.keys(options)
        return native.createForm(options)
      },
    })
    try {
      let form!: UseFormResult<{ email: string }>
      function Probe(): null {
        form = useForm({ defaultValues: { email: 'reader@example.test' } })
        return null
      }
      mount(() => createComponent(Probe, {}))

      expect(bondedCalls).toBe(1)
      expect(receivedKeys).toEqual(['defaultValues'])
      expect(form.getValue('email')).toBe('reader@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('prefers an explicit createForm override over the bonded provider', () => {
    let bondedCalls = 0
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        return createNativeFormProvider().createForm(options)
      },
    })
    try {
      const native = createNativeFormProvider()
      let overrideCalls = 0
      const override = <T extends FormValuesConstraint<T>>(
        options: FormOptions<T>,
      ): FormController<T> => {
        overrideCalls++
        return native.createForm(options)
      }
      let form!: UseFormResult<{ email: string }>
      function Probe(): null {
        form = useForm({ createForm: override, defaultValues: { email: 'override@example.test' } })
        return null
      }
      mount(() => createComponent(Probe, {}))

      expect(overrideCalls).toBe(1)
      expect(bondedCalls).toBe(0)
      expect(form.getValue('email')).toBe('override@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('mounts, validates and submits through the bonded default', async () => {
    setProvider(createNativeFormProvider())
    try {
      const submit = vi.fn<(values: { name: string }) => void>()
      function ProfileForm(): JSX.Element {
        const form = useForm({ defaultValues: { name: '' } })
        const field = form.register('name', { required: 'Name required' })
        return (
          <form aria-label="Profile" onSubmit={form.handleSubmit(submit)}>
            <input
              aria-label="Name"
              name="name"
              value={field.value as string}
              onInput={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
            <output aria-label="Status">{form.isDirty() ? 'Dirty' : 'Clean'}</output>
          </form>
        )
      }
      const container = mount(() => createComponent(ProfileForm, {}))
      const input = query<HTMLInputElement>(container, 'input[aria-label="Name"]')

      expect(input.value).toBe('')
      expect(statusText(container)).toBe('Clean')

      submitForm(container, 'Profile')
      await settle()
      expect(submit).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(input)

      typeInto(container, 'Name', 'Ada')
      expect(statusText(container)).toBe('Dirty')
      submitForm(container, 'Profile')
      await settle()
      expect(submit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' })
      expect(input.value).toBe('Ada')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })
})

describe('form subscription boundaries', () => {
  it('preserves provider validation flags instead of reconstructing them from form errors', () => {
    type Values = { email: string }
    const form = createNativeFormProvider().createForm<Values>({
      defaultValues: { email: 'initial' },
    })
    const getFieldState = form.getFieldState.bind(form)
    const providerForm: FormController<Values> = {
      ...form,
      getFieldState: (name) => ({ ...getFieldState(name), validating: true }),
    }
    let state!: Accessor<FieldState<Values[keyof Values]>>
    function Probe(): null {
      state = useFieldState(providerForm, 'email')
      return null
    }
    mount(() => createComponent(Probe, {}))
    expect(state().validating).toBe(true)
    expect(state().dirty).toBe(false)
  })

  it('sees a controller update between render and subscription', async () => {
    type Values = { email: string }
    const controller = createNativeFormProvider().createForm<Values>({
      defaultValues: { email: 'before' },
    })
    function Field(): JSX.Element {
      const state = useFieldState(controller, 'email')
      onMount(() => {
        controller.setValue('email', 'after')
      })
      return <output aria-label="Status">{state().value as string}</output>
    }
    const container = mount(() => createComponent(Field, {}))
    await settle()
    expect(statusText(container)).toBe('after')
  })

  it('watches cloned object values and switches field and controller without stale data', () => {
    type Values = { left: { value: number }; right: { value: number } }
    const provider = providerWithClonedSnapshots()
    const first = provider.createForm<Values>({
      defaultValues: { left: { value: 1 }, right: { value: 2 } },
    })
    const second = provider.createForm<Values>({
      defaultValues: { left: { value: 3 }, right: { value: 4 } },
    })
    let watched!: Accessor<{ value: number }>
    const [selection, setSelection] = createSignal<{
      form: FormController<Values>
      name: 'left' | 'right'
    }>({ form: first, name: 'left' })
    function Probe(): null {
      watched = useWatch(
        () => selection().form,
        () => selection().name,
      )
      return null
    }
    mount(() => createComponent(Probe, {}))
    expect(watched()).toEqual({ value: 1 })
    first.setValue('left', { value: 5 })
    expect(watched()).toEqual({ value: 5 })
    setSelection({ form: first, name: 'right' })
    expect(watched()).toEqual({ value: 2 })
    setSelection({ form: second, name: 'right' })
    expect(watched()).toEqual({ value: 4 })
    const selected = watched()
    first.setValue('right', { value: 6 })
    expect(watched()).toBe(selected)
  })
})
