// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { createNativeFormProvider } from '@molecule/app-forms'

import { useForm, type UseFormOptions } from '../useForm.js'

const stableIdentity: UseFormOptions<{ title: string }> = {
  resetKey: JSON.stringify(['tenant', 'record']),
}
const unstableIdentity: UseFormOptions<{ title: string }> = {
  // @ts-expect-error A newly allocated composite identity must not discard edits every render.
  resetKey: ['tenant', 'record'],
}
void stableIdentity
void unstableIdentity

afterEach(cleanup)

describe('useForm state tuples', () => {
  it('external values preserve dirty fields by default', () => {
    const { result, rerender } = renderHook(
      ({ values }) => useForm({ defaultValues: { name: '', email: '' }, values }),
      { initialProps: { values: { name: 'First', email: 'first@example.test' } } },
    )
    act(() => result.current.setValue('name', 'Typed'))
    rerender({ values: { name: 'Loaded', email: 'loaded@example.test' } })
    expect(result.current.getValue('name')).toBe('Typed')
    expect(result.current.getValue('email')).toBe('loaded@example.test')
  })
  it('an explicit external replacement remains available', () => {
    const { result, rerender } = renderHook(
      ({ values }) =>
        useForm({ defaultValues: { name: '' }, values, resetOptions: { keepDirtyValues: false } }),
      { initialProps: { values: { name: 'First' } } },
    )
    act(() => result.current.setValue('name', 'Typed'))
    rerender({ values: { name: 'Replacement' } })
    expect(result.current.getValue('name')).toBe('Replacement')
  })
  it('preserves typing before a late effect answer while pristine fields fill', () => {
    function Preferences({ values }: { values?: { name: string; email: string } }) {
      const [draft, setDraft, fillDraft] = useForm({
        defaultValues: { name: '', email: '' },
      }).asState()
      useEffect(() => {
        if (values) fillDraft(values)
      }, [values, fillDraft])
      return (
        <>
          <input
            aria-label="Name"
            value={draft.name}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, name: event.target.value }))
            }
          />
          <input
            aria-label="Email"
            value={draft.email}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, email: event.target.value }))
            }
          />
        </>
      )
    }
    const { rerender } = render(
      <StrictMode>
        <Preferences />
      </StrictMode>,
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Typed name' } })
    rerender(
      <StrictMode>
        <Preferences values={{ name: 'Server name', email: 'saved@example.test' }} />
      </StrictMode>,
    )
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Typed name')
    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'saved@example.test')
  })
  it('single-field fill preserves an edit and accepts functional updates', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { quantity: 1 } }).asState('quantity'),
    )
    act(() => result.current[1]((previous) => previous + 2))
    act(() => result.current[2](10))
    expect(result.current[0]).toBe(3)
  })
  it('a pristine field takes a loaded value and equal edits remain pristine', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '', email: '' } }).asState(),
    )
    act(() => result.current[1]((previous) => ({ ...previous })))
    act(() => result.current[2]({ name: 'Loaded', email: 'saved@example.test' }))
    expect(result.current[0]).toEqual({ name: 'Loaded', email: 'saved@example.test' })
  })
  it('a new record key drops the old dirty draft and an old fill cannot affect it', () => {
    const { result, rerender } = renderHook(
      ({ id }) => useForm({ defaultValues: { title: '' }, resetKey: id }).asState(),
      { initialProps: { id: 'first' } },
    )
    act(() => result.current[1]({ title: 'First draft' }))
    const oldFill = result.current[2]
    rerender({ id: 'second' })
    act(() => oldFill({ title: 'Late first answer' }))
    act(() => result.current[2]({ title: 'Second record' }))
    expect(result.current[0]).toEqual({ title: 'Second record' })
  })
  it('different records may have identical loaded field content', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) =>
      native.createForm({ ...options, values: undefined })
    const { result, rerender } = renderHook(
      ({ id }) =>
        useForm({
          createForm,
          defaultValues: { title: '' },
          resetKey: id,
          values: { title: 'Shared title' },
        }),
      { initialProps: { id: 'first' } },
    )
    act(() => result.current.setValue('title', 'First draft'))
    rerender({ id: 'second' })
    expect(result.current.getValue('title')).toBe('Shared title')
    expect(result.current.isDirty).toBe(false)
  })
  it('explicit edits and form resets remain intentional replacements', () => {
    const { result } = renderHook(() => useForm({ defaultValues: { title: 'Initial' } }))
    act(() => result.current.asState('title')[1]('Typed'))
    act(() => result.current.reset({ title: 'Explicit reset' }))
    expect(result.current.asState('title')[0]).toBe('Explicit reset')
  })
  it('keeps edit and fill callbacks stable across notifications and rerenders', () => {
    const { result, rerender } = renderHook(() =>
      useForm({ defaultValues: { title: '' } }).asState('title'),
    )
    const edit = result.current[1]
    const fill = result.current[2]
    act(() => fill('Loaded'))
    rerender()
    expect(result.current[1]).toBe(edit)
    expect(result.current[2]).toBe(fill)
  })
  it('functional fills read the latest baseline while preserving a dirty field', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '', quantity: 0 } }).asState(),
    )
    act(() => result.current[2]({ quantity: 2 }))
    act(() => result.current[1]((previous) => ({ ...previous, name: 'Typed' })))
    act(() =>
      result.current[2]((previous) => ({
        ...previous,
        name: 'Server',
        quantity: previous.quantity + 1,
      })),
    )
    expect(result.current[0]).toEqual({ name: 'Typed', quantity: 3 })
  })
  it('a provider with cloned getters retains stable displayed values between notifications', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) => {
      const form = native.createForm(options)
      return { ...form, getState: () => structuredClone(form.getState()) }
    }
    const { result, rerender } = renderHook(() =>
      useForm({ defaultValues: { name: '' }, createForm }),
    )
    const method = result.current.asState
    const first = result.current.asState()[0]
    rerender()
    expect(result.current.asState()[0]).toBe(first)
    act(() => result.current.asState()[2]({ name: 'Loaded' }))
    expect(result.current.asState).toBe(method)
    expect(result.current.asState()[0]).toEqual({ name: 'Loaded' })
  })
})
