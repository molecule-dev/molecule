// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
})
