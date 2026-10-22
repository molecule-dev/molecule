// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { StrictMode, useLayoutEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FormController, FormOptions, FormProvider } from '@molecule/app-forms'
import { createNativeFormProvider, setProvider } from '@molecule/app-forms'

import { useFieldState, useForm, useWatch } from '../hooks/useForm.js'

/** A valid provider may return fresh objects at every level of a snapshot. */
function providerWithClonedSnapshots(): FormProvider {
  const native = createNativeFormProvider()
  return {
    createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T> {
      const form = native.createForm(options)
      return {
        ...form,
        getState: () => structuredClone(form.getState()),
        getFieldState: (name) => structuredClone(form.getFieldState(name)),
        getValue: <K extends keyof T>(name: K): T[K] => structuredClone(form.getValue(name)),
      }
    },
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe.each([
  ['native', createNativeFormProvider],
  ['cloned snapshots', providerWithClonedSnapshots],
] as const)('React form integration: %s provider', (_name, createProvider) => {
  it('mounts, validates and submits the latest typed values while keeping the input mounted', async () => {
    const provider = createProvider()
    let finishSubmit!: () => void
    const submit = vi.fn<(values: { email: string }) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
        }),
    )
    function ContactForm(): React.ReactElement {
      const form = useForm({ createForm: provider.createForm, defaultValues: { email: '' } })
      const field = form.register('email', { required: 'Email required' })
      return (
        <form aria-label="Contact" onSubmit={form.handleSubmit(submit)}>
          <input aria-label="Email" {...field} value={field.value as string} />
          <button disabled={form.isSubmitting}>Submit</button>
          {form.formState.errors.email && <p role="alert">{form.formState.errors.email}</p>}
          <p role="status">{form.isSubmitting ? 'Submitting' : 'Idle'}</p>
        </form>
      )
    }
    render(
      <StrictMode>
        <ContactForm />
      </StrictMode>,
    )
    const input = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
    const form = screen.getByRole('form', { name: 'Contact' })
    await act(async () => {
      fireEvent.submit(form)
    })
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Email required')
    expect(document.activeElement).toBe(input)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'reader@example.test' } })
      fireEvent.submit(form)
    })
    expect(submit).toHaveBeenCalledExactlyOnceWith({ email: 'reader@example.test' })
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(input)
    expect(screen.getByRole('status').textContent).toBe('Submitting')
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      finishSubmit()
    })
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(input)
    expect(input.value).toBe('reader@example.test')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Idle')
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  })

  it('uses provider field semantics through edits, reset, field selection and controller switches', () => {
    const first = createProvider().createForm({
      defaultValues: { email: 'first', backup: 'backup' },
    })
    const second = createProvider().createForm({
      defaultValues: { email: 'second', backup: 'other' },
    })
    const readSecond = vi.spyOn(second, 'getFieldState')
    const { result, rerender, unmount } = renderHook(
      ({ form, name }) => useFieldState(form, name),
      { initialProps: { form: first, name: 'email' as 'email' | 'backup' } },
    )
    expect(result.current).toEqual(first.getFieldState('email'))
    expect(result.current.dirty).toBe(false)
    act(() => {
      first.setValue('email', 'edited')
    })
    expect(result.current).toMatchObject({ value: 'edited', dirty: true, touched: true })
    act(() => {
      first.setError('email', 'Invalid')
    })
    expect(result.current).toMatchObject({ error: 'Invalid', valid: false })
    act(() => {
      first.reset()
    })
    expect(result.current).toEqual(first.getFieldState('email'))
    expect(result.current.dirty).toBe(false)
    rerender({ form: first, name: 'backup' })
    expect(result.current.value).toBe('backup')
    act(() => {
      first.setValue('email', 'unselected')
    })
    expect(result.current.value).toBe('backup')
    rerender({ form: second, name: 'backup' })
    expect(result.current.value).toBe('other')
    const selected = result.current
    act(() => {
      first.setValue('backup', 'old controller')
    })
    expect(result.current).toBe(selected)
    act(() => {
      second.setValue('backup', 'new controller')
    })
    expect(result.current.value).toBe('new controller')
    unmount()
    readSecond.mockClear()
    act(() => {
      second.setValue('backup', 'after unmount')
    })
    expect(readSecond).not.toHaveBeenCalled()
  })

  it('clears submitting state when the real submit callback rejects', async () => {
    const provider = createProvider()
    const { result } = renderHook(() =>
      useForm({ createForm: provider.createForm, defaultValues: { email: 'reader' } }),
    )
    const failure = new Error('Submission failed')
    await act(async () => {
      await expect(
        result.current.handleSubmit(async () => {
          throw failure
        })(),
      ).rejects.toBe(failure)
    })
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.formState.submitCount).toBe(1)
  })
})

describe('useForm bonded provider default', () => {
  it('creates the controller from the bonded forms provider without forwarding the factory', () => {
    const native = createNativeFormProvider()
    let bondedCalls = 0
    let receivedKeys: string[] = []
    setProvider({
      createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        receivedKeys = Object.keys(options)
        return native.createForm(options)
      },
    })
    try {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { email: 'reader@example.test' } }),
      )

      expect(bondedCalls).toBe(1)
      expect(receivedKeys).toEqual(['defaultValues'])
      expect(result.current.getValue('email')).toBe('reader@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('prefers an explicit createForm override over the bonded provider', () => {
    let bondedCalls = 0
    setProvider({
      createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        return createNativeFormProvider().createForm(options)
      },
    })
    try {
      const native = createNativeFormProvider()
      let overrideCalls = 0
      const override = <T extends Record<string, unknown>>(
        options: FormOptions<T>,
      ): FormController<T> => {
        overrideCalls++
        return native.createForm(options)
      }
      const { result } = renderHook(() =>
        useForm({ createForm: override, defaultValues: { email: 'override@example.test' } }),
      )

      expect(overrideCalls).toBe(1)
      expect(bondedCalls).toBe(0)
      expect(result.current.getValue('email')).toBe('override@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('mounts, validates and submits through the bonded default', async () => {
    setProvider(createNativeFormProvider())
    try {
      const submit = vi.fn()
      function ProfileForm(): React.ReactElement {
        const form = useForm({ defaultValues: { name: '' } })
        const field = form.register('name', { required: 'Name required' })
        return (
          <form aria-label="Profile" onSubmit={form.handleSubmit(submit)}>
            <input aria-label="Name" {...field} value={field.value as string} />
            <p role="status">{form.isDirty ? 'Dirty' : 'Clean'}</p>
          </form>
        )
      }
      render(<ProfileForm />)
      const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
      const form = screen.getByRole('form', { name: 'Profile' })

      expect(input.value).toBe('')
      expect(screen.getByRole('status').textContent).toBe('Clean')

      await act(async () => {
        fireEvent.submit(form)
      })
      expect(submit).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(input)

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ada' } })
        expect(screen.getByRole('status').textContent).toBe('Dirty')
        fireEvent.submit(form)
      })
      expect(submit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' })
      expect(input.value).toBe('Ada')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })
})

describe('form subscription boundaries', () => {
  it('preserves provider validation flags instead of reconstructing them from form errors', () => {
    const form = createNativeFormProvider().createForm({ defaultValues: { email: 'initial' } })
    const getFieldState = form.getFieldState.bind(form)
    const providerForm = {
      ...form,
      getFieldState: (name: 'email') => ({ ...getFieldState(name), validating: true }),
    }
    const { result } = renderHook(() => useFieldState(providerForm, 'email'))
    expect(result.current.validating).toBe(true)
    expect(result.current.dirty).toBe(false)
  })

  it('sees a controller update between render and subscription', () => {
    const controller = createNativeFormProvider().createForm({ defaultValues: { email: 'before' } })
    function Field(): React.ReactElement {
      const state = useFieldState(controller, 'email')
      useLayoutEffect(() => {
        controller.setValue('email', 'after')
      }, [])
      return <p role="status">{state.value}</p>
    }
    render(<Field />)
    expect(screen.getByRole('status').textContent).toBe('after')
  })

  it('watches cloned object values and switches field and controller without stale data', () => {
    const provider = providerWithClonedSnapshots()
    const first = provider.createForm({
      defaultValues: { left: { value: 1 }, right: { value: 2 } },
    })
    const second = provider.createForm({
      defaultValues: { left: { value: 3 }, right: { value: 4 } },
    })
    const { result, rerender } = renderHook(({ form, name }) => useWatch(form, name), {
      initialProps: { form: first, name: 'left' as 'left' | 'right' },
    })
    expect(result.current).toEqual({ value: 1 })
    act(() => {
      first.setValue('left', { value: 5 })
    })
    expect(result.current).toEqual({ value: 5 })
    rerender({ form: first, name: 'right' })
    expect(result.current).toEqual({ value: 2 })
    rerender({ form: second, name: 'right' })
    expect(result.current).toEqual({ value: 4 })
    const selected = result.current
    act(() => {
      first.setValue('right', { value: 6 })
    })
    expect(result.current).toBe(selected)
  })
})
