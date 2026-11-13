import { describe, expect, it, vi } from 'vitest'

import { nativeProvider } from '../controller.js'

describe('rejected form submissions', () => {
  it('retains a server rejection separately from field validation and keeps edited values', async () => {
    const form = nativeProvider.createForm({ defaultValues: { email: 'new@example.test' } })
    const error = { status: 400, data: { errors: { email: ['is already taken'] } } }
    await expect(form.handleSubmit(() => Promise.reject(error))()).rejects.toBe(error)
    expect(form.getState().submitError).toBe(error)
    expect(form.getState()).toMatchObject({
      values: { email: 'new@example.test' },
      errors: {},
      isSubmitting: false,
      submitCount: 1,
    })
  })

  it('clears the previous server failure when retrying and succeeds with the current values', async () => {
    const form = nativeProvider.createForm({ defaultValues: { subject: 'Invoice' } })
    await expect(
      form.handleSubmit(() => {
        throw new Error('Offline')
      })(),
    ).rejects.toThrow('Offline')
    form.setValue('subject', 'Corrected invoice')
    const save = vi.fn(() => {
      expect(form.getState().submitError).toBeUndefined()
    })
    await form.handleSubmit(save)()
    expect(save).toHaveBeenCalledExactlyOnceWith({ subject: 'Corrected invoice' })
    expect(form.getState().submitError).toBeUndefined()
  })

  it.each(['reset', 'clearErrors'] as const)('clears the failure on %s', async (method) => {
    const form = nativeProvider.createForm({ defaultValues: { name: 'Luke' } })
    await expect(form.handleSubmit(() => Promise.reject('Try again'))()).rejects.toBe('Try again')
    expect(form.getState().submitError).toBe('Try again')
    form[method]()
    expect(form.getState().submitError).toBeUndefined()
  })

  it('keeps client validation in field errors without reporting a server failure', async () => {
    const form = nativeProvider.createForm({ defaultValues: { name: '' } })
    form.register({ name: 'name', required: 'Name is required' })
    const save = vi.fn()
    await form.handleSubmit(save)()
    expect(save).not.toHaveBeenCalled()
    expect(form.getState().errors).toEqual({ name: 'Name is required' })
    expect(form.getState().submitError).toBeUndefined()
  })

  it('does not publish an old record failure after replacement', async () => {
    const form = nativeProvider.createForm({ defaultValues: { id: 'one', name: 'First' } })
    let reject!: (error: Error) => void
    const pending = new Promise<void>((_resolve, fail) => {
      reject = fail
    })
    const called = vi.fn(() => pending)
    const submission = form.handleSubmit(called)()
    await vi.waitFor(() => expect(called).toHaveBeenCalledOnce())
    form.reset({ id: 'two', name: 'Second' })
    reject(new Error('Old record rejected'))
    await expect(submission).rejects.toThrow('Old record rejected')
    expect(form.getState().submitError).toBeUndefined()
    expect(form.getValues().id).toBe('two')
  })

  it('clears a completed rejection when external values select another record', async () => {
    const form = nativeProvider.createForm({ defaultValues: { id: 'one', name: 'First' } })
    await expect(form.handleSubmit(() => Promise.reject('Rejected'))()).rejects.toBe('Rejected')
    expect(form.getState().submitError).toBe('Rejected')
    form.updateValues({ id: 'two', name: 'Second' }, { keepDirtyValues: true })
    expect(form.getState().submitError).toBeUndefined()
    expect(form.getValues().id).toBe('two')
  })

  it('makes a rejection with no reason visible while retaining the programmatic rejection', async () => {
    const form = nativeProvider.createForm({ defaultValues: { name: 'Draft' } })
    await expect(form.handleSubmit(() => Promise.reject(undefined))()).rejects.toBeUndefined()
    expect(form.getState().submitError).toBeInstanceOf(Error)
    expect((form.getState().submitError as Error).message).toBe(
      'Unable to submit. Please try again.',
    )
  })
})
