// @vitest-environment jsdom

/**
 * The form composables over the bonded provider: rendered controls, field
 * selection on a live component, and the submit lifecycle.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type ComponentPublicInstance,
  type ComputedRef,
  defineComponent,
  h,
  nextTick,
  onBeforeMount,
  shallowRef,
} from 'vue'

import type {
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormValuesConstraint,
} from '@molecule/app-forms'
import { createNativeFormProvider, setProvider } from '@molecule/app-forms'

import {
  useFieldState,
  useForm,
  type UseFormOptions,
  type UseFormReturn,
  useWatch,
} from '../composables/useForms.js'

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

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.restoreAllMocks()
})

/**
 * Mounts one component whose setup runs `capture`.
 *
 * @param capture - Runs the composables inside setup.
 * @returns The mounted wrapper.
 */
function mountProbe(capture: () => void): VueWrapper {
  const Page = defineComponent({
    setup() {
      capture()
      return () => h('div')
    },
  })
  const wrapper = mount(Page)
  wrappers.push(wrapper)
  return wrapper
}

/**
 * Mounts one component that creates a form in setup and returns it.
 *
 * @param options - The form options, or a getter so setup builds them.
 * @returns The composable result.
 */
function openForm<T extends FormValuesConstraint<T>>(
  options: UseFormOptions<T> | (() => UseFormOptions<T>),
): UseFormReturn<T> {
  let form!: UseFormReturn<T>
  mountProbe(() => {
    form = useForm(typeof options === 'function' ? options : () => options)
  })
  return form
}

/**
 * Renders a native registration on an input, the way a template binds it.
 *
 * @param field - The registration the controller returned.
 * @returns The input props.
 */
function fieldProps(field: {
  name: string
  onChange: (event: unknown) => void
  ref?: (element: HTMLElement | null) => void
}): Record<string, unknown> {
  return {
    name: field.name,
    onInput: field.onChange,
    ref: (element: Element | ComponentPublicInstance | null) => {
      field.ref?.(element instanceof HTMLElement ? element : null)
    },
  }
}

describe.each([
  ['native', createNativeFormProvider],
  ['cloned snapshots', providerWithClonedSnapshots],
] as const)('Vue form integration: %s provider', (_name, createProvider) => {
  it('mounts, validates and submits the latest typed values while keeping the input mounted', async () => {
    const provider = createProvider()
    let finishSubmit!: () => void
    const submit = vi.fn<(values: { email: string }) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
        }),
    )
    const ContactForm = defineComponent({
      setup() {
        const form = useForm({ createForm: provider.createForm, defaultValues: { email: '' } })
        const field = form.register('email', { required: 'Email required' })
        return () =>
          h('form', { 'aria-label': 'Contact', onSubmit: form.handleSubmit(submit) }, [
            h('input', {
              'aria-label': 'Email',
              ...fieldProps(field),
              value: form.formState.value.values.email,
            }),
            h('button', { disabled: form.isSubmitting.value }, 'Submit'),
            form.formState.value.errors.email
              ? h('p', { role: 'alert' }, form.formState.value.errors.email)
              : null,
            h('p', { role: 'status' }, form.isSubmitting.value ? 'Submitting' : 'Idle'),
          ])
      },
    })
    const wrapper = mount(ContactForm, { attachTo: document.body })
    wrappers.push(wrapper)

    const input = wrapper.get('input[aria-label="Email"]').element as HTMLInputElement
    const form = wrapper.get('form[aria-label="Contact"]')
    await form.trigger('submit')
    expect(submit).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toBe('Email required')
    expect(document.activeElement).toBe(input)
    await wrapper.get('input[aria-label="Email"]').setValue('reader@example.test')
    await form.trigger('submit')
    expect(submit).toHaveBeenCalledExactlyOnceWith({ email: 'reader@example.test' })
    expect(wrapper.get('input[aria-label="Email"]').element).toBe(input)
    expect(wrapper.get('[role="status"]').text()).toBe('Submitting')
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(true)
    finishSubmit()
    await vi.waitFor(() => expect(wrapper.get('[role="status"]').text()).toBe('Idle'))
    expect(wrapper.get('input[aria-label="Email"]').element).toBe(input)
    expect(input.value).toBe('reader@example.test')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('uses provider field semantics through edits, reset, field selection and controller switches', async () => {
    interface Fields {
      email: string
      backup: string
    }
    const first = createProvider().createForm<Fields>({
      defaultValues: { email: 'first', backup: 'backup' },
    })
    const second = createProvider().createForm<Fields>({
      defaultValues: { email: 'second', backup: 'other' },
    })
    const readSecond = vi.spyOn(second, 'getFieldState')
    const form = shallowRef<FormController<Fields>>(first)
    const name = shallowRef<'email' | 'backup'>('email')
    let field!: ComputedRef<FieldState<string>>
    const wrapper = mountProbe(() => {
      field = useFieldState(form, name)
    })
    expect(field.value).toEqual(first.getFieldState('email'))
    expect(field.value.dirty).toBe(false)
    first.setValue('email', 'edited')
    expect(field.value).toMatchObject({ value: 'edited', dirty: true, touched: true })
    first.setError('email', 'Invalid')
    expect(field.value).toMatchObject({ error: 'Invalid', valid: false })
    first.reset()
    expect(field.value).toEqual(first.getFieldState('email'))
    expect(field.value.dirty).toBe(false)
    name.value = 'backup'
    await nextTick()
    expect(field.value.value).toBe('backup')
    first.setValue('email', 'unselected')
    expect(field.value.value).toBe('backup')
    form.value = second
    await nextTick()
    expect(field.value.value).toBe('other')
    const selected = field.value
    first.setValue('backup', 'old controller')
    expect(field.value).toBe(selected)
    second.setValue('backup', 'new controller')
    expect(field.value.value).toBe('new controller')
    wrapper.unmount()
    readSecond.mockClear()
    second.setValue('backup', 'after unmount')
    expect(readSecond).not.toHaveBeenCalled()
  })

  it('clears submitting state when the real submit callback rejects', async () => {
    const provider = createProvider()
    const form = openForm(() => ({
      createForm: provider.createForm,
      defaultValues: { email: 'reader' },
    }))
    const failure = new Error('Submission failed')
    await expect(
      form.handleSubmit(async () => {
        throw failure
      })(),
    ).rejects.toBe(failure)
    expect(form.isSubmitting.value).toBe(false)
    expect(form.formState.value.submitCount).toBe(1)
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
      const form = openForm(() => ({ defaultValues: { email: 'reader@example.test' } }))

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
      const form = openForm<{ email: string }>(() => ({
        createForm: override,
        defaultValues: { email: 'override@example.test' },
      }))

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
      const submit = vi.fn()
      const ProfileForm = defineComponent({
        setup() {
          const form = useForm({ defaultValues: { name: '' } })
          const field = form.register('name', { required: 'Name required' })
          return () =>
            h('form', { 'aria-label': 'Profile', onSubmit: form.handleSubmit(submit) }, [
              h('input', {
                'aria-label': 'Name',
                ...fieldProps(field),
                value: form.formState.value.values.name,
              }),
              h('p', { role: 'status' }, form.isDirty.value ? 'Dirty' : 'Clean'),
            ])
        },
      })
      const wrapper = mount(ProfileForm, { attachTo: document.body })
      wrappers.push(wrapper)
      const input = wrapper.get('input[aria-label="Name"]').element as HTMLInputElement
      const form = wrapper.get('form[aria-label="Profile"]')

      expect(input.value).toBe('')
      expect(wrapper.get('[role="status"]').text()).toBe('Clean')

      await form.trigger('submit')
      expect(submit).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(input)

      await wrapper.get('input[aria-label="Name"]').setValue('Ada')
      expect(wrapper.get('[role="status"]').text()).toBe('Dirty')
      await form.trigger('submit')
      expect(submit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' })
      expect(input.value).toBe('Ada')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })
})

describe('form subscription boundaries', () => {
  it('preserves provider validation flags instead of reconstructing them from form errors', () => {
    interface Fields {
      email: string
    }
    const form = createNativeFormProvider().createForm<Fields>({
      defaultValues: { email: 'initial' },
    })
    const getFieldState = form.getFieldState.bind(form)
    const providerForm: FormController<Fields> = {
      ...form,
      getFieldState: (name) => ({ ...getFieldState(name), validating: true }),
    }
    let field!: ComputedRef<FieldState<string>>
    mountProbe(() => {
      field = useFieldState(providerForm, 'email')
    })
    expect(field.value.validating).toBe(true)
    expect(field.value.dirty).toBe(false)
  })

  it('sees a controller update between render and subscription', () => {
    interface Fields {
      email: string
    }
    const controller = createNativeFormProvider().createForm<Fields>({
      defaultValues: { email: 'before' },
    })
    const Field = defineComponent({
      setup() {
        const state = useFieldState(controller, 'email')
        onBeforeMount(() => {
          controller.setValue('email', 'after')
        })
        return () => h('p', { role: 'status' }, state.value.value)
      },
    })
    const wrapper = mount(Field)
    wrappers.push(wrapper)
    expect(wrapper.get('[role="status"]').text()).toBe('after')
  })

  it('watches cloned object values and switches field and controller without stale data', async () => {
    interface Pair {
      left: { value: number }
      right: { value: number }
    }
    const provider = providerWithClonedSnapshots()
    const first = provider.createForm<Pair>({
      defaultValues: { left: { value: 1 }, right: { value: 2 } },
    })
    const second = provider.createForm<Pair>({
      defaultValues: { left: { value: 3 }, right: { value: 4 } },
    })
    const form = shallowRef<FormController<Pair>>(first)
    const name = shallowRef<'left' | 'right'>('left')
    let watched!: ComputedRef<{ value: number }>
    mountProbe(() => {
      watched = useWatch(form, name)
    })
    expect(watched.value).toEqual({ value: 1 })
    first.setValue('left', { value: 5 })
    expect(watched.value).toEqual({ value: 5 })
    name.value = 'right'
    await nextTick()
    expect(watched.value).toEqual({ value: 2 })
    form.value = second
    await nextTick()
    expect(watched.value).toEqual({ value: 4 })
    const selected = watched.value
    first.setValue('right', { value: 6 })
    expect(watched.value).toBe(selected)
  })
})
