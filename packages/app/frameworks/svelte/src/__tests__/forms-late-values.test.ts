import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'

import { nativeProvider } from '@molecule/app-forms'

import { createFieldStore, createFormStores, createWatchStore } from '../stores/forms.js'

interface ArticleValues {
  title: string
  body: string
}

describe('Svelte late form values', () => {
  it('keeps article edits and fills pristine fields when the record loads', () => {
    const form = createFormStores<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
    })
    form.setValue('title', 'Draft title')

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' }, { keepDirtyValues: true })

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
    form.destroy()
  })

  it('refreshes state when the first subscription arrives after updateValues', () => {
    const form = createFormStores<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
    })

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(get(form.formState).values).toEqual({ title: 'Loaded title', body: 'Loaded body' })
    form.destroy()
  })

  it('refreshes a field store when its first subscriber arrives after delivery', () => {
    const form = createFormStores<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
    })
    const title = createFieldStore(form.controller, 'title')

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(get(title).value).toBe('Loaded title')
    form.destroy()
  })

  it('refreshes a watch store when its first subscriber arrives after delivery', () => {
    const form = createFormStores<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
    })
    const title = createWatchStore(form.controller, 'title')

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(get(title)).toBe('Loaded title')
    form.destroy()
  })
})
