// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useForm } from '../index.js'

interface ArticleValues {
  title: string
  body: string
}

describe('React Native inherited late form values', () => {
  it('uses React late values to preserve edits and fill pristine fields', () => {
    const { result, rerender } = renderHook(
      ({ values }: { values: ArticleValues }) =>
        useForm<ArticleValues>({
          defaultValues: { title: '', body: '' },
          values,
          resetOptions: { keepDirtyValues: true },
        }),
      { initialProps: { values: { title: '', body: '' } } },
    )
    act(() => result.current.setValue('title', 'Draft title'))

    rerender({ values: { title: 'Loaded title', body: 'Loaded body' } })

    expect(result.current.getValue('title')).toBe('Draft title')
    expect(result.current.getValue('body')).toBe('Loaded body')
  })

  it('inherits React reset behavior without reapplying unchanged external values', () => {
    const { result, rerender } = renderHook(() =>
      useForm<ArticleValues>({
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues: true },
      }),
    )

    act(() => result.current.reset({ title: 'Saved', body: 'Saved body' }))
    rerender()

    expect(result.current.getValue('title')).toBe('Saved')
    expect(result.current.getValue('body')).toBe('Saved body')
  })
})
