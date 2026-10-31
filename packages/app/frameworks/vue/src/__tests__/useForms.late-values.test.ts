// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'

import { nativeProvider } from '@molecule/app-forms'

import { useForm, type UseFormOptions, type UseFormReturn } from '../composables/useForms.js'

interface ArticleValues {
  title: string
  body: string
}

describe('Vue late form values', () => {
  it('keeps article edits and fills pristine fields when the record loads', async () => {
    const options = reactive<UseFormOptions<ArticleValues>>({
      createForm: (formOptions) => nativeProvider.createForm(formOptions),
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    let form!: UseFormReturn<ArticleValues>
    const wrapper = mount(
      defineComponent({
        setup() {
          form = useForm(options)
          return () => h('div')
        },
      }),
    )
    form.setValue('title', 'Draft title')

    options.values = { title: 'Loaded title', body: 'Loaded body' }
    await nextTick()

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
    wrapper.unmount()
  })

  it('applies in-place reactive record changes from a detached snapshot', async () => {
    const options = reactive<UseFormOptions<ArticleValues>>({
      createForm: (formOptions) => nativeProvider.createForm(formOptions),
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    let form!: UseFormReturn<ArticleValues>
    const wrapper = mount(
      defineComponent({
        setup() {
          form = useForm(options)
          return () => h('div')
        },
      }),
    )
    form.setValue('title', 'Draft title')

    Object.assign(options.values!, { title: 'Loaded title', body: 'Loaded body' })
    await nextTick()

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
    expect(form.formState.value.values).toEqual({ title: 'Draft title', body: 'Loaded body' })
    wrapper.unmount()
  })

  it('never submits nested reactive changes that were not validated', async () => {
    interface NestedValues {
      details: { title: string }
    }
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const validated: string[] = []
    const options = reactive<UseFormOptions<NestedValues>>({
      createForm: (formOptions) => nativeProvider.createForm(formOptions),
      defaultValues: { details: { title: 'Valid A' } },
      values: { details: { title: 'Valid A' } },
      validate: async (values) => {
        validated.push(values.details.title)
        await gate
        return {}
      },
    })
    let form!: UseFormReturn<NestedValues>
    const wrapper = mount(
      defineComponent({
        setup() {
          form = useForm(options)
          return () => h('div')
        },
      }),
    )
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    options.values!.details.title = ''
    await nextTick()
    release({})
    await submission

    expect(validated).toEqual(['Valid A'])
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
