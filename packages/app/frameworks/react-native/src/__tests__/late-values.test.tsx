// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

  it('inherits the unmount guard while validation is pending', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const { result, unmount } = renderHook(() =>
      useForm({ defaultValues: { title: 'Article' }, validate: () => gate }),
    )
    const onSubmit = vi.fn()
    let submission!: Promise<void>
    act(() => {
      submission = result.current.handleSubmit(onSubmit)()
    })

    unmount()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
