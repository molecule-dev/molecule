import { createRoot, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { nativeProvider } from '@molecule/app-forms'

import {
  createFieldSignal,
  createForm,
  createFormFromController,
  type CreateFormResult,
  createWatchSignal,
} from '../primitives/forms.js'

const effectCallbacks: (() => void)[] = []

// Node loads Solid's server export, whose createEffect is a no-op. Queue the
// effects explicitly to test their browser order around the initial render.
vi.mock('solid-js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createEffect: (callback: () => void): void => {
      effectCallbacks.push(callback)
    },
  }
})

beforeEach(() => {
  effectCallbacks.length = 0
})

interface ArticleValues {
  title: string
  body: string
}

describe('Solid late form values', () => {
  it('keeps article edits and fills pristine fields when the record loads', () => {
    const form = createForm<ArticleValues>(nativeProvider, {
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    form.setValue('title', 'Draft title')

    form.updateValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
    form.controller.destroy()
  })

  it('publishes values delivered before the subscription effect', () => {
    let form!: CreateFormResult<ArticleValues>
    const dispose = createRoot((disposeRoot) => {
      const [values, setValues] = createSignal<ArticleValues>({ title: '', body: '' })
      form = createForm<ArticleValues>(nativeProvider, {
        defaultValues: { title: '', body: '' },
        get values() {
          return values()
        },
        resetOptions: { keepDirtyValues: true },
      })
      form.setValue('title', 'Draft title')
      setValues({ title: 'Loaded title', body: 'Loaded body' })
      return disposeRoot
    })
    for (const callback of effectCallbacks) callback()

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.formState().values).toEqual({ title: 'Draft title', body: 'Loaded body' })
    dispose()
  })

  it('refreshes createFormFromController after pre-effect delivery', () => {
    const controller = nativeProvider.createForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
    })
    let form!: CreateFormResult<ArticleValues>
    const dispose = createRoot((disposeRoot) => {
      form = createFormFromController(controller)
      return disposeRoot
    })

    controller.updateValues({ title: 'Loaded title', body: 'Loaded body' })
    for (const callback of effectCallbacks) callback()

    expect(form.getValue('title')).toBe('Loaded title')
    expect(form.formState().values).toEqual({ title: 'Loaded title', body: 'Loaded body' })
    dispose()
  })

  it('refreshes createWatchSignal after pre-effect delivery', () => {
    const controller = nativeProvider.createForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
    })
    let title!: () => string
    const dispose = createRoot((disposeRoot) => {
      title = createWatchSignal(controller, 'title')
      return disposeRoot
    })

    controller.updateValues({ title: 'Loaded title', body: 'Loaded body' })
    for (const callback of effectCallbacks) callback()

    expect(title()).toBe('Loaded title')
    dispose()
  })

  it('refreshes createFieldSignal after pre-effect delivery', () => {
    const controller = nativeProvider.createForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
    })
    let title!: () => { value: string }
    const dispose = createRoot((disposeRoot) => {
      title = createFieldSignal(controller, 'title') as () => { value: string }
      return disposeRoot
    })

    controller.updateValues({ title: 'Loaded title', body: 'Loaded body' })
    for (const callback of effectCallbacks) callback()

    expect(title().value).toBe('Loaded title')
    dispose()
  })
})
