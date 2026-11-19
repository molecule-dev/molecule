// @vitest-environment jsdom
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, type PropType, ref, shallowRef, watch } from 'vue'

import type { FormValuesConstraint } from '@molecule/app-forms'
import { createNativeFormProvider, nativeProvider } from '@molecule/app-forms'

import type { UseFormOptions, UseFormReturn } from '../useForms.js'
import { useForm } from '../useForms.js'

interface PreferencesValues {
  name: string
  email: string
}

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts one component that creates the form in setup, Vue's counterpart of
 * `renderHook`: the composable runs once, and a re-render does not re-run it.
 *
 * @param options - The form options, or a getter so setup builds them.
 * @returns The composable result and a re-render trigger.
 */
function mountForm<T extends FormValuesConstraint<T>>(
  options: UseFormOptions<T> | (() => UseFormOptions<T>),
): { form: UseFormReturn<T>; rerender: () => Promise<void> } {
  let form!: UseFormReturn<T>
  const tick = ref(0)
  const Page = defineComponent({
    setup() {
      form = useForm<T>(typeof options === 'function' ? options : () => options)
      return () => h('div', String(tick.value))
    },
  })
  wrappers.push(mount(Page))
  return {
    form,
    rerender: async () => {
      tick.value++
      await nextTick()
    },
  }
}

/** The preferences editor whose late fill React's state test drives, as Vue. */
const Preferences = defineComponent({
  props: {
    values: { type: Object as PropType<PreferencesValues>, required: false },
  },
  setup(props) {
    const form = useForm<PreferencesValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', email: '' },
    }))
    const [, setDraft, fillDraft] = form.asState()
    watch(
      () => props.values,
      (next) => {
        if (next) fillDraft(next)
      },
    )
    return () =>
      h('div', [
        h('input', {
          'aria-label': 'Name',
          value: form.formState.value.values.name,
          onInput: (event: Event) => {
            const name = (event.target as HTMLInputElement).value
            setDraft((previous) => ({ ...previous, name }))
          },
        }),
        h('input', {
          'aria-label': 'Email',
          value: form.formState.value.values.email,
          onInput: (event: Event) => {
            const email = (event.target as HTMLInputElement).value
            setDraft((previous) => ({ ...previous, email }))
          },
        }),
      ])
  },
})

describe('useForm state tuples', () => {
  it('external values preserve dirty fields by default', async () => {
    const values = shallowRef<Partial<PreferencesValues>>({
      name: 'First',
      email: 'first@example.test',
    })
    const { form } = mountForm<PreferencesValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', email: '' },
      values: values.value,
    }))
    form.setValue('name', 'Typed')
    values.value = { name: 'Loaded', email: 'loaded@example.test' }
    await nextTick()
    expect(form.getValue('name')).toBe('Typed')
    expect(form.getValue('email')).toBe('loaded@example.test')
  })

  it('an explicit external replacement remains available', async () => {
    const values = shallowRef<Partial<PreferencesValues>>({ name: 'First' })
    const { form } = mountForm<PreferencesValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '' },
      values: values.value,
      resetOptions: { keepDirtyValues: false },
    }))
    form.setValue('name', 'Typed')
    values.value = { name: 'Replacement' }
    await nextTick()
    expect(form.getValue('name')).toBe('Replacement')
  })

  it('preserves typing before a late effect answer while pristine fields fill', async () => {
    const wrapper = mount(Preferences)
    wrappers.push(wrapper)
    await wrapper.get('input[aria-label="Name"]').setValue('Typed name')

    await wrapper.setProps({ values: { name: 'Server name', email: 'saved@example.test' } })

    expect((wrapper.get('input[aria-label="Name"]').element as HTMLInputElement).value).toBe(
      'Typed name',
    )
    expect((wrapper.get('input[aria-label="Email"]').element as HTMLInputElement).value).toBe(
      'saved@example.test',
    )
  })

  it('single-field fill preserves an edit and accepts functional updates', () => {
    const { form } = mountForm<{ quantity: number }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { quantity: 1 },
    }))
    const [, edit, fill] = form.asState('quantity')
    edit((previous) => previous + 2)
    fill(10)
    expect(form.asState('quantity')[0]).toBe(3)
  })

  it('a pristine field takes a loaded value and equal edits remain pristine', () => {
    const { form } = mountForm<PreferencesValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', email: '' },
    }))
    form.asState()[1]((previous) => ({ ...previous }))
    form.asState()[2]({ name: 'Loaded', email: 'saved@example.test' })
    expect(form.asState()[0]).toEqual({ name: 'Loaded', email: 'saved@example.test' })
  })

  it('a new record key drops the old dirty draft and an old fill cannot affect it', async () => {
    const resetKey = shallowRef('first')
    const { form } = mountForm<{ title: string }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: '' },
      resetKey: resetKey.value,
    }))
    form.asState()[1]({ title: 'First draft' })
    const oldFill = form.asState()[2]
    resetKey.value = 'second'
    await nextTick()
    oldFill({ title: 'Late first answer' })
    form.asState()[2]({ title: 'Second record' })
    expect(form.asState()[0]).toEqual({ title: 'Second record' })
  })

  it('different records may have identical loaded field content', async () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) =>
      native.createForm({ ...options, values: undefined })
    const resetKey = shallowRef('first')
    const { form } = mountForm<{ title: string }>(() => ({
      createForm,
      defaultValues: { title: '' },
      resetKey: resetKey.value,
      values: { title: 'Shared title' },
    }))
    form.setValue('title', 'First draft')
    resetKey.value = 'second'
    await nextTick()
    expect(form.getValue('title')).toBe('Shared title')
    expect(form.isDirty.value).toBe(false)
  })

  it('explicit edits and form resets remain intentional replacements', () => {
    const { form } = mountForm<{ title: string }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: 'Initial' },
    }))
    form.asState('title')[1]('Typed')
    form.reset({ title: 'Explicit reset' })
    expect(form.asState('title')[0]).toBe('Explicit reset')
  })

  it('keeps edit and fill callbacks stable across notifications and rerenders', async () => {
    const { form, rerender } = mountForm<{ title: string }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: '' },
    }))
    const edit = form.asState('title')[1]
    const fill = form.asState('title')[2]
    fill('Loaded')
    await rerender()
    expect(form.asState('title')[1]).toBe(edit)
    expect(form.asState('title')[2]).toBe(fill)
  })

  it('functional fills read the latest baseline while preserving a dirty field', () => {
    const { form } = mountForm<{ name: string; quantity: number }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', quantity: 0 },
    }))
    form.asState()[2]({ quantity: 2 })
    form.asState()[1]((previous) => ({ ...previous, name: 'Typed' }))
    form.asState()[2]((previous) => ({
      ...previous,
      name: 'Server',
      quantity: previous.quantity + 1,
    }))
    expect(form.asState()[0]).toEqual({ name: 'Typed', quantity: 3 })
  })

  it('a provider with cloned getters retains stable displayed values between notifications', async () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) => {
      const form = native.createForm(options)
      return { ...form, getState: () => structuredClone(form.getState()) }
    }
    const { form, rerender } = mountForm(() => ({
      createForm,
      defaultValues: { name: '' },
    }))
    const method = form.asState
    const first = form.asState()[0]
    await rerender()
    expect(form.asState()[0]).toBe(first)
    form.asState()[2]({ name: 'Loaded' })
    expect(form.asState).toBe(method)
    expect(form.asState()[0]).toEqual({ name: 'Loaded' })
  })
})
