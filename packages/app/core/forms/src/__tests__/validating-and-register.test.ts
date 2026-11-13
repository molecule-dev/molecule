import { describe, expect, it, vi } from 'vitest'

import { nativeProvider } from '../controller.js'
import type { FormState } from '../types.js'

/**
 * A validator that stays pending until the test settles it.
 *
 * @returns The validator and functions that pass or throw the pending call.
 */
function heldValidator(): {
  validate: (value: unknown) => Promise<boolean | string>
  pass: () => void
  fail: (message: string) => void
  explode: (error: Error) => void
} {
  const pending: Array<{ resolve: (r: boolean | string) => void; reject: (e: Error) => void }> = []
  return {
    validate: () =>
      new Promise<boolean | string>((resolve, reject) => {
        pending.push({ resolve, reject })
      }),
    pass: () => pending.shift()?.resolve(true),
    fail: (message) => pending.shift()?.resolve(message),
    explode: (error) => pending.shift()?.reject(error),
  }
}

// An empty optional value skips validation, so each field holds a value when it validates.
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('FieldState.validating', () => {
  it('is true while a direct validateField call runs, and announces both edges', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: 'ada' } })
    form.register({ name: 'name', validate: held.validate })
    const seen: boolean[] = []
    form.subscribe(() => seen.push(form.getFieldState('name').validating))

    const result = form.validateField('name')
    expect(form.getFieldState('name').validating).toBe(true)
    held.fail('Taken')
    expect(await result).toBe(false)

    expect(form.getFieldState('name')).toMatchObject({ validating: false, error: 'Taken' })
    expect(seen).toEqual([true, false])
  })

  it('follows a change-mode validation through setValue without an extra notification', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: '' }, mode: 'onChange' })
    const field = form.register({ name: 'name', validate: held.validate })
    const seen: boolean[] = []
    form.subscribe(() => seen.push(form.getFieldState('name').validating))

    field.onChange({ target: { name: 'name', value: 'ada' } })
    expect(seen).toEqual([true])
    held.pass()
    await settle()

    expect(seen).toEqual([true, false])
  })

  it('is true while a submission validates and false while its handler runs', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: 'ada' } })
    form.register({ name: 'name', validate: held.validate })
    let validatingInHandler: boolean | undefined
    const submit = form.handleSubmit(() => {
      validatingInHandler = form.getFieldState('name').validating
    })()

    expect(form.getFieldState('name').validating).toBe(true)
    held.pass()
    await submit

    expect(validatingInHandler).toBe(false)
    expect(form.getFieldState('name').validating).toBe(false)
  })

  it('is true for a whole-form validate() until the form validator settles', async () => {
    let release!: (errors: Record<string, string>) => void
    const form = nativeProvider.createForm({
      defaultValues: { name: 'ada' },
      validate: () =>
        new Promise<Record<string, string>>((resolve) => {
          release = resolve
        }),
    })
    const listener = vi.fn()
    form.subscribe(listener)

    const result = form.validate()
    expect(form.getFieldState('name').validating).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    release({})
    expect(await result).toBe(true)

    expect(form.getFieldState('name').validating).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reports the newer validation when one supersedes another', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: 'ada' } })
    form.register({ name: 'name', validate: held.validate })

    const first = form.validateField('name')
    const second = form.validateField('name')
    held.pass()
    expect(await first).toBe(false)
    expect(form.getFieldState('name').validating).toBe(true)
    held.pass()
    expect(await second).toBe(true)

    expect(form.getFieldState('name').validating).toBe(false)
  })

  it('clears and announces the flag when a reset outdates the running validation', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: 'ada' } })
    form.register({ name: 'name', validate: held.validate })
    const pending = form.validateField('name')
    form.reset({ name: 'grace' })
    const listener = vi.fn()
    form.subscribe(listener)

    held.fail('Taken')
    expect(await pending).toBe(false)

    expect(form.getFieldState('name')).toMatchObject({ validating: false, error: undefined })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ends the flag when the validator throws, and rejects with its error', async () => {
    const held = heldValidator()
    const form = nativeProvider.createForm({ defaultValues: { name: 'ada' } })
    form.register({ name: 'name', validate: held.validate })
    const listener = vi.fn()
    form.subscribe(listener)

    const pending = form.validateField('name')
    held.explode(new Error('lookup service down'))

    await expect(pending).rejects.toThrow('lookup service down')
    expect(form.getFieldState('name').validating).toBe(false)
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ errors: {} }))
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('register', () => {
  it('announces a default it fills in once, after the current task, not synchronously', async () => {
    const form = nativeProvider.createForm<{ name: string; city: string }>({})
    const states: Array<FormState<{ name: string; city: string }>> = []
    form.subscribe((state) => states.push(state))

    form.register({ name: 'name', defaultValue: 'Ada' })
    form.register({ name: 'city', defaultValue: 'London' })
    expect(states).toHaveLength(0)
    await Promise.resolve()

    expect(states).toHaveLength(1)
    expect(states[0]?.values).toEqual({ name: 'Ada', city: 'London' })
    expect(states[0]?.isDirty).toBe(false)
  })

  it('does not notify when the field already has a value', async () => {
    const form = nativeProvider.createForm({ defaultValues: { name: 'Grace' } })
    const listener = vi.fn()
    form.subscribe(listener)

    form.register({ name: 'name', defaultValue: 'Ada' })
    await Promise.resolve()

    expect(listener).not.toHaveBeenCalled()
    expect(form.getValue('name')).toBe('Grace')
  })

  it('does not notify a destroyed form', async () => {
    const form = nativeProvider.createForm<{ name: string }>({})
    const listener = vi.fn()
    form.subscribe(listener)
    form.register({ name: 'name', defaultValue: 'Ada' })
    form.destroy()
    await Promise.resolve()

    expect(listener).not.toHaveBeenCalled()
  })

  it('accepts the name-first form the interface declares', async () => {
    const form = nativeProvider.createForm({ defaultValues: { email: '' } })
    const field = form.register('email', { required: 'Email is required' })

    expect(field.name).toBe('email')
    expect(await form.validateField('email')).toBe(false)
    expect(form.getFieldState('email').error).toBe('Email is required')
  })
})
