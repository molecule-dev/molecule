// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
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
