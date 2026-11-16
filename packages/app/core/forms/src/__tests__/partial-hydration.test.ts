import { describe, expect, it, vi } from 'vitest'

import { createNativeFormProvider } from '../controller.js'

const incremental = { keepDirtyValues: true, keepOmittedValues: true }
const create = () =>
  createNativeFormProvider().createForm({ defaultValues: { name: '', email: '', bio: '' } })

describe('incremental loaded form baselines', () => {
  it('keeps earlier pristine fields when separate responses fill sibling fields', () => {
    const form = create()
    form.updateValues({ name: 'Saved name' }, incremental)
    form.updateValues({ email: 'saved@example.test' }, incremental)
    form.updateValues({ bio: 'Loaded biography' }, incremental)
    expect(form.getValues()).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(form.getState().isDirty).toBe(false)
  })
  it('preserves edits and every loaded baseline on reset', () => {
    const form = create()
    form.updateValues({ name: 'Saved name' }, incremental)
    form.setValue('name', 'Typed name')
    form.updateValues({ email: 'saved@example.test' }, incremental)
    expect(form.getValue('name')).toBe('Typed name')
    form.reset()
    expect(form.getValues()).toEqual({ name: 'Saved name', email: 'saved@example.test', bio: '' })
  })
  it('uses the latest explicit reset as its baseline', () => {
    const form = create()
    form.reset({ name: 'Reset name', email: 'reset@example.test' })
    form.updateValues({ bio: 'Loaded biography' }, incremental)
    expect(form.getValues()).toEqual({
      name: 'Reset name',
      email: 'reset@example.test',
      bio: 'Loaded biography',
    })
  })
  it('uses the latest external record as its baseline', () => {
    const form = create()
    form.updateValues({ name: 'Loaded name', email: 'loaded@example.test' })
    form.updateValues({ bio: 'Loaded biography' }, incremental)
    expect(form.getValues()).toEqual({
      name: 'Loaded name',
      email: 'loaded@example.test',
      bio: 'Loaded biography',
    })
  })
  it('preserves errors and touched state of an unchanged dirty sibling', () => {
    const form = create()
    form.setValue('name', 'Invalid draft')
    form.setError('name', 'Invalid name')
    form.updateValues({ email: 'loaded@example.test' }, incremental)
    expect(form.getError('name')).toBe('Invalid name')
    expect(form.getFieldState('name').touched).toBe(true)
    expect(form.getState().isValid).toBe(false)
  })
  it('clears only changed fields’ stale validation state', () => {
    const form = create()
    form.setValue('email', '')
    form.setError('email', 'Required')
    form.updateValues({ email: 'loaded@example.test' }, incremental)
    expect(form.getError('email')).toBeUndefined()
    expect(form.getFieldState('email').touched).toBe(false)
    expect(form.getState().isValid).toBe(true)
  })
  it('does not notify for an identical incremental refill', () => {
    const form = create()
    form.updateValues({ name: 'Loaded' }, incremental)
    form.updateValues({ email: 'loaded@example.test' }, incremental)
    const listener = vi.fn()
    form.subscribe(listener)
    form.updateValues({ name: 'Loaded' }, incremental)
    expect(listener).not.toHaveBeenCalled()
  })
  it('keeps whole-record replacement independent of earlier incremental fills', () => {
    const form = create()
    form.updateValues({ email: 'old@example.test' }, incremental)
    form.updateValues({ name: 'New record' })
    expect(form.getValues()).toEqual({ name: 'New record', email: '', bio: '' })
  })
  it('drops omitted fields and dirty values when a loaded record id changes', () => {
    const form = createNativeFormProvider().createForm({
      defaultValues: { id: '', name: '', email: '' },
    })
    form.updateValues({ id: 'first', name: 'First', email: 'first@example.test' })
    form.setValue('name', 'First draft')
    form.updateValues({ id: 'second', name: 'Second' }, incremental)
    expect(form.getValues()).toEqual({ id: 'second', name: 'Second', email: '' })
    expect(form.getState().isDirty).toBe(false)
  })
  it('whole-record refresh with a changed id also discards the old draft', () => {
    const form = createNativeFormProvider().createForm({ defaultValues: { id: '', name: '' } })
    form.updateValues({ id: 'first', name: 'First' })
    form.setValue('name', 'First draft')
    form.updateValues({ id: 'second', name: 'Second' }, { keepDirtyValues: true })
    expect(form.getValue('name')).toBe('Second')
  })
})
