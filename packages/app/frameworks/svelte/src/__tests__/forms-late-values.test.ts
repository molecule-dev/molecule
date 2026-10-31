import { describe, expect, it } from 'vitest'

import { nativeProvider } from '@molecule/app-forms'

import { createFormStores } from '../stores/forms.js'

interface ArticleValues {
  title: string
  body: string
}

describe('Svelte late form values', () => {
  it('keeps article edits and fills pristine fields when the record loads', () => {
    const form = createFormStores<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    form.setValue('title', 'Draft title')

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
    form.destroy()
  })
})
