// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useForm, type UseFormOptions } from '../useForm.js'

const invalidResetOptions: UseFormOptions<{ name: string }> = {
  resetOptions: {
    // @ts-expect-error Incremental field fills are explicit updates, never a record reset option.
    keepOmittedValues: true,
  },
}
void invalidResetOptions

afterEach(cleanup)

describe('independent loaded form fields', () => {
  it('fills a multi-field editor without clearing earlier pristine fields', async () => {
    function InventoryEditor() {
      const form = useForm({ defaultValues: { name: '', description: '', notes: '' } })
      const [name, editName, fillName] = form.asState('name')
      const [description, , fillDescription] = form.asState('description')
      const [notes, , fillNotes] = form.asState('notes')
      useEffect(() => {
        void Promise.resolve().then(() => {
          fillName('Loaded item')
          fillDescription('Loaded description')
          fillNotes('Loaded notes')
        })
      }, [fillName, fillDescription, fillNotes])
      return (
        <>
          <input
            aria-label="Name"
            value={name}
            onChange={(event) => editName(event.target.value)}
          />
          <output aria-label="Description">{description}</output>
          <output aria-label="Notes">{notes}</output>
        </>
      )
    }
    render(
      <StrictMode>
        <InventoryEditor />
      </StrictMode>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Loaded item')
    expect(screen.getByLabelText('Description').textContent).toBe('Loaded description')
    expect(screen.getByLabelText('Notes').textContent).toBe('Loaded notes')
  })

  it('preserves edits as other fields arrive and reset restores every loaded baseline', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '', email: '', bio: '' } }),
    )
    act(() => result.current.asState('name')[2]('Saved name'))
    act(() => result.current.asState('name')[1]('Typed name'))
    act(() => result.current.asState('email')[2]('saved@example.test'))
    act(() => result.current.asState('bio')[2]('Loaded biography'))
    expect(result.current.formState.values).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    act(() => result.current.reset())
    expect(result.current.formState.values).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(result.current.isDirty).toBe(false)
  })

  it('whole-record replacements still reset omitted pristine fields', () => {
    const { result } = renderHook(() => useForm({ defaultValues: { name: '', email: '' } }))
    act(() => result.current.asState()[2]({ name: 'First', email: 'first@example.test' }))
    act(() => result.current.asState()[2]({ name: 'Second' }))
    expect(result.current.formState.values).toEqual({ name: 'Second', email: '' })
  })
})
