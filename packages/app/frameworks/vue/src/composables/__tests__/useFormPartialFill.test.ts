// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'

import type { FormValuesConstraint } from '@molecule/app-forms'
import { nativeProvider } from '@molecule/app-forms'

import type { UseFormOptions, UseFormReturn } from '../useForms.js'
import { useForm } from '../useForms.js'

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts one component that creates the form in setup, Vue's counterpart of
 * `renderHook`: the composable runs once, and a re-render does not re-run it.
 *
 * @param options - The form options, or a getter so setup builds them.
 * @returns The composable result.
 */
function mountForm<T extends FormValuesConstraint<T>>(
  options: UseFormOptions<T> | (() => UseFormOptions<T>),
): UseFormReturn<T> {
  let form!: UseFormReturn<T>
  const Page = defineComponent({
    setup() {
      form = useForm<T>(typeof options === 'function' ? options : () => options)
      return () => h('div')
    },
  })
  wrappers.push(mount(Page))
  return form
}

describe('independent loaded form fields', () => {
  it('fills a multi-field editor without clearing earlier pristine fields', async () => {
    const InventoryEditor = defineComponent({
      setup() {
        const form = useForm({
          createForm: nativeProvider.createForm,
          defaultValues: { name: '', description: '', notes: '' },
        })
        const [, editName, fillName] = form.asState('name')
        const [, , fillDescription] = form.asState('description')
        const [, , fillNotes] = form.asState('notes')
        onMounted(() => {
          void Promise.resolve().then(() => {
            fillName('Loaded item')
            fillDescription('Loaded description')
            fillNotes('Loaded notes')
          })
        })
        return () =>
          h('div', [
            h('input', {
              'aria-label': 'Name',
              value: form.formState.value.values.name,
              onInput: (event: Event) => {
                editName((event.target as HTMLInputElement).value)
              },
            }),
            h('output', { 'aria-label': 'Description' }, form.formState.value.values.description),
            h('output', { 'aria-label': 'Notes' }, form.formState.value.values.notes),
          ])
      },
    })
    const wrapper = mount(InventoryEditor)
    wrappers.push(wrapper)

    await flushPromises()
    await nextTick()

    expect((wrapper.get('input[aria-label="Name"]').element as HTMLInputElement).value).toBe(
      'Loaded item',
    )
    expect(wrapper.get('output[aria-label="Description"]').text()).toBe('Loaded description')
    expect(wrapper.get('output[aria-label="Notes"]').text()).toBe('Loaded notes')
  })

  it('preserves edits as other fields arrive and reset restores every loaded baseline', () => {
    const form = mountForm<{ name: string; email: string; bio: string }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', email: '', bio: '' },
    }))
    form.asState('name')[2]('Saved name')
    form.asState('name')[1]('Typed name')
    form.asState('email')[2]('saved@example.test')
    form.asState('bio')[2]('Loaded biography')
    expect(form.formState.value.values).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    form.reset()
    expect(form.formState.value.values).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(form.isDirty.value).toBe(false)
  })

  it('whole-record replacements still reset omitted pristine fields', () => {
    const form = mountForm<{ name: string; email: string }>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { name: '', email: '' },
    }))
    form.asState()[2]({ name: 'First', email: 'first@example.test' })
    form.asState()[2]({ name: 'Second' })
    expect(form.formState.value.values).toEqual({ name: 'Second', email: '' })
  })
})
