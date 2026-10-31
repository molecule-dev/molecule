// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { type FormEvent, type FormEventHandler, StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { UseFormResult } from '../../index.js'
import { useForm } from '../useForm.js'

interface InventoryValues {
  sku: string
  quantity: number
}

// Compile-time public API control for a representative non-X1 inventory form.
function assertPublicHandleSubmitContract(form: UseFormResult<InventoryValues>): void {
  const syncSubmit: (event?: FormEvent) => Promise<void> = form.handleSubmit((values) => {
    values.sku.toUpperCase()
    values.quantity.toFixed()
  })
  const asyncSubmit: (event?: FormEvent) => Promise<void> = form.handleSubmit(async (values) => {
    await Promise.resolve(values.sku)
  })
  const reactSubmit: FormEventHandler<HTMLFormElement> = form.handleSubmit(() => {})

  void syncSubmit
  void asyncSubmit
  void reactSubmit
}

void assertPublicHandleSubmitContract

const defaultValues: InventoryValues = { sku: 'KIT-7', quantity: 2 }

interface ArticleValues {
  title: string
  body: string
}

function ArticleEditor({
  values,
  keepDirtyValues = true,
}: {
  values?: ArticleValues
  keepDirtyValues?: boolean
}) {
  const form = useForm<ArticleValues>({
    defaultValues: { title: '', body: '' },
    values,
    resetOptions: { keepDirtyValues },
  })
  const title = form.register('title')
  const body = form.register('body')

  return (
    <>
      <input aria-label="Title" {...title} value={String(title.value ?? '')} />
      <textarea aria-label="Body" {...body} value={String(body.value ?? '')} />
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
    </>
  )
}

describe('useForm late values', () => {
  it('keeps an edited article field and fills pristine fields when its record loads', () => {
    const { rerender } = render(<ArticleEditor values={{ title: '', body: '' }} />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft title' } })
    rerender(<ArticleEditor values={{ title: 'Loaded title', body: 'Loaded body' }} />)

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Draft title')
    expect(screen.getByLabelText('Body')).toHaveProperty('value', 'Loaded body')
  })

  it('replaces edits for a new record when keepDirtyValues is false', () => {
    const { rerender } = render(
      <ArticleEditor values={{ title: 'First', body: 'First body' }} keepDirtyValues={false} />,
    )
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft title' } })

    rerender(
      <ArticleEditor values={{ title: 'Second', body: 'Second body' }} keepDirtyValues={false} />,
    )

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Second')
    expect(screen.getByLabelText('Body')).toHaveProperty('value', 'Second body')
  })

  it('uses the latest values as the baseline for reset()', () => {
    const { rerender } = render(<ArticleEditor values={{ title: '', body: '' }} />)
    rerender(<ArticleEditor values={{ title: 'Loaded title', body: 'Loaded body' }} />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft title' } })

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Loaded title')
    expect(screen.getByLabelText('Body')).toHaveProperty('value', 'Loaded body')
  })

  it('does not reset for a new values reference with equal content', () => {
    const { rerender } = render(<ArticleEditor values={{ title: 'Loaded', body: 'Body' }} />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft title' } })

    rerender(<ArticleEditor values={{ title: 'Loaded', body: 'Body' }} />)

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Draft title')
  })

  it('leaves a form without values unchanged across rerenders', () => {
    const { rerender } = render(<ArticleEditor />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft title' } })

    rerender(<ArticleEditor />)

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Draft title')
    expect(screen.getByLabelText('Body')).toHaveProperty('value', '')
  })
})

describe('useForm late-value regressions', () => {
  it('delivers a changed nested record behind a new outer reference', () => {
    interface NestedValues {
      details: { title: string }
    }
    const record: NestedValues = { details: { title: 'A' } }
    const { result, rerender } = renderHook(
      ({ values }: { values: NestedValues }) =>
        useForm<NestedValues>({ defaultValues: record, values }),
      { initialProps: { values: record } },
    )

    record.details.title = 'B'
    rerender({ values: { ...record } })

    expect(result.current.getValue('details')).toEqual({ title: 'B' })
  })

  it('preserves an in-flight submission when late values arrive', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { result, rerender } = renderHook(
      ({ values }: { values: ArticleValues }) =>
        useForm<ArticleValues>({
          defaultValues: { title: '', body: '' },
          values,
          resetOptions: { keepDirtyValues: true },
          validate: async () => {
            await gate
            return {}
          },
        }),
      { initialProps: { values: { title: '', body: '' } } },
    )
    let submission!: Promise<void>
    const onSubmit = vi.fn()

    act(() => {
      submission = result.current.handleSubmit(onSubmit)()
    })
    await vi.waitFor(() => expect(result.current.isSubmitting).toBe(true))
    expect(result.current.formState.submitCount).toBe(1)

    rerender({ values: { title: 'Loaded title', body: 'Loaded body' } })

    expect(result.current.isSubmitting).toBe(true)
    expect(result.current.formState.submitCount).toBe(1)

    await act(async () => {
      release()
      await submission
    })
    expect(onSubmit).toHaveBeenCalledWith({ title: '', body: '' })
  })

  it('keeps a typed validated save through a same-account refresh', async () => {
    interface AccountValues {
      id: string
      bio: string
      name: string
    }
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const initial = { id: 'same-account', bio: 'Initial', name: 'Before' }
    const { result, rerender } = renderHook(
      ({ values }: { values: AccountValues }) =>
        useForm<AccountValues>({
          defaultValues: initial,
          values,
          resetOptions: { keepDirtyValues: true },
          validate: () => gate,
        }),
      { initialProps: { values: initial } },
    )
    const onSubmit = vi.fn()
    let submission!: Promise<void>

    act(() => {
      result.current.setValue('bio', 'Typed biography')
      submission = result.current.handleSubmit(onSubmit)()
    })
    rerender({ values: { ...initial, name: 'Background refresh' } })
    expect(result.current.getValue('bio')).toBe('Typed biography')
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      release({})
      await submission
    })

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, bio: 'Typed biography' })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('preserves cleared populated tags and typed text on refresh', () => {
    interface EditorValues {
      title: string
      tags: string[]
      body: string
    }
    const initial = { title: 'Server title', tags: ['old'], body: '' }
    const { result, rerender } = renderHook(
      ({ values }: { values: EditorValues }) =>
        useForm<EditorValues>({
          defaultValues: { title: '', tags: [], body: '' },
          values,
          resetOptions: { keepDirtyValues: true },
        }),
      { initialProps: { values: initial } },
    )

    act(() => {
      result.current.setValue('tags', [])
      result.current.setValue('title', 'Typed title')
    })
    rerender({
      values: { title: 'Refreshed title', tags: ['restored'], body: 'Loaded body' },
    })

    expect(result.current.formState.values).toEqual({
      title: 'Typed title',
      tags: [],
      body: 'Loaded body',
    })
  })

  it('drops fields removed by a replacement record', () => {
    interface ReplacementValues {
      title: string
      subtitle?: string
    }
    const initialValues: Partial<ReplacementValues> = { title: 'A', subtitle: 'Old' }
    const { result, rerender } = renderHook(
      ({ values }: { values: Partial<ReplacementValues> }) =>
        useForm<ReplacementValues>({
          defaultValues: { title: '' },
          values,
          resetOptions: { keepDirtyValues: false },
        }),
      { initialProps: { values: initialValues } },
    )

    rerender({ values: { title: 'B' } })

    expect(result.current.getValue('title')).toBe('B')
    expect(result.current.getValue('subtitle')).toBeUndefined()
  })

  it('takes late composites after edited arrays and nested objects revert by content', () => {
    interface CompositeValues {
      tags: string[]
      metadata: { category: string }
    }
    const initial: CompositeValues = { tags: [], metadata: { category: 'none' } }
    const { result, rerender } = renderHook(
      ({ values }: { values: CompositeValues }) =>
        useForm<CompositeValues>({
          defaultValues: initial,
          values,
          resetOptions: { keepDirtyValues: true },
        }),
      { initialProps: { values: initial } },
    )

    act(() => {
      result.current.setValue('tags', ['draft'])
      result.current.setValue('metadata', { category: 'draft' })
      result.current.setValue('tags', [])
      result.current.setValue('metadata', { category: 'none' })
    })
    expect(result.current.isDirty).toBe(false)

    rerender({ values: { tags: ['loaded'], metadata: { category: 'loaded' } } })

    expect(result.current.getValue('tags')).toEqual(['loaded'])
    expect(result.current.getValue('metadata')).toEqual({ category: 'loaded' })
  })

  it('replaces a pristine file with a different file by identity', () => {
    interface AttachmentValues {
      attachment: File
    }
    const first = new File(['first'], 'first.txt')
    const second = new File(['second'], 'second.txt')
    const { result, rerender } = renderHook(
      ({ values }: { values: AttachmentValues }) =>
        useForm<AttachmentValues>({
          defaultValues: { attachment: first },
          values,
          resetOptions: { keepDirtyValues: true },
        }),
      { initialProps: { values: { attachment: first } } },
    )

    rerender({ values: { attachment: second } })

    expect(result.current.getValue('attachment')).toBe(second)
  })
})

describe('useForm handleSubmit', () => {
  it('submits inventory values through a synchronous callback', async () => {
    const { result } = renderHook(() => useForm<InventoryValues>({ defaultValues }))
    const onSubmit = vi.fn()

    await act(async () => {
      await result.current.handleSubmit(onSubmit)()
    })

    expect(onSubmit).toHaveBeenCalledWith(defaultValues)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('returns a promise that awaits asynchronous submission', async () => {
    const { result } = renderHook(() => useForm<InventoryValues>({ defaultValues }))
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let started = false
    let completed = false
    let submission!: Promise<void>

    act(() => {
      submission = result.current.handleSubmit(async () => {
        started = true
        await gate
        completed = true
      })()
    })
    await vi.waitFor(() => expect(started).toBe(true))
    expect(completed).toBe(false)

    await act(async () => {
      release()
      await submission
    })

    expect(completed).toBe(true)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('preserves controller rejection and submission cleanup semantics', async () => {
    const { result } = renderHook(() => useForm<InventoryValues>({ defaultValues }))
    const failure = new Error('Inventory unavailable')

    await act(async () => {
      await expect(
        result.current.handleSubmit(() => {
          throw failure
        })(),
      ).rejects.toBe(failure)
    })

    expect(result.current.isSubmitting).toBe(false)
  })
})

describe('useForm asynchronous disposal', () => {
  it('does not invoke onSubmit after unmount while validation is pending', async () => {
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

  it('still submits after StrictMode replays the mounted effect', async () => {
    const { result } = renderHook(() => useForm({ defaultValues: { title: 'Article' } }), {
      wrapper: StrictMode,
    })
    const onSubmit = vi.fn()

    await act(async () => result.current.handleSubmit(onSubmit)())

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Article' })
  })
})

describe('useForm external values versus reset baselines', () => {
  it.each([true, false])(
    'does not undo reset values with unchanged inline values (keepDirtyValues=%s)',
    (keepDirtyValues) => {
      const { result, rerender } = renderHook(() =>
        useForm<ArticleValues>({
          defaultValues: { title: '', body: '' },
          values: { title: 'Server', body: 'Server body' },
          resetOptions: { keepDirtyValues },
        }),
      )

      act(() => result.current.reset({ title: 'Saved', body: 'Saved body' }))
      rerender()

      expect(result.current.getValue('title')).toBe('Saved')
      expect(result.current.getValue('body')).toBe('Saved body')
    },
  )

  it.each([true, false])(
    'does not erase async defaults delivered through reset (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      const { result, rerender } = renderHook(() =>
        useForm<ArticleValues>({
          defaultValues: { title: '', body: '' },
          values: { title: 'Server', body: 'Server body' },
          resetOptions: { keepDirtyValues },
        }),
      )

      await act(async () => {
        const record = await Promise.resolve({ title: 'Async', body: 'Async body' })
        result.current.reset(record)
      })
      rerender()

      expect(result.current.getValue('title')).toBe('Async')
      expect(result.current.getValue('body')).toBe('Async body')
    },
  )
})
