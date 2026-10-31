// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { FormEvent, FormEventHandler } from 'react'
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
