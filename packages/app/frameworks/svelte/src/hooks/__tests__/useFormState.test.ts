// @vitest-environment jsdom
/**
 * `useForm`'s state tuples: React's `useFormState` cases in Svelte's idiom. A
 * Svelte hook runs once during component init, so where React rerenders with
 * new props this file sets the options store the hook follows on the same
 * mount.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import { createNativeFormProvider, type FormValuesConstraint } from '@molecule/app-forms'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import { useForm, type UseFormOptions, type UseFormResult } from '../useForm.js'

/** One mounted hook: its result, its reactive options, and its teardown. */
interface FormHandle<T extends FormValuesConstraint<T>> {
  /** The hook's result (field state is read through its stores). */
  result: UseFormResult<T>
  /** Gives the mounted hook new options (React's rerender with new props). */
  setOptions: (next: UseFormOptions<T>) => void
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `useForm` once during a child's init, following an
 * options store for the life of the mount.
 *
 * @param initialOptions - The options the hook is created with.
 * @returns The hook's result and its options setter.
 */
function mountForm<T extends FormValuesConstraint<T>>(
  initialOptions: UseFormOptions<T>,
): FormHandle<T> {
  // React's `rerender` with new props: the options are a store the hook follows.
  const options = writable<UseFormOptions<T>>(initialOptions)
  const captured: { result?: UseFormResult<T> } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = useForm<T>(options)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return { result, setOptions: (next) => options.set(next) }
}

describe('useForm state tuples', () => {
  it('external values preserve dirty fields by default', () => {
    const form = mountForm<{ name: string; email: string }>({
      defaultValues: { name: '', email: '' },
      values: { name: 'First', email: 'first@example.test' },
    })
    form.result.setValue('name', 'Typed')
    form.setOptions({
      defaultValues: { name: '', email: '' },
      values: { name: 'Loaded', email: 'loaded@example.test' },
    })
    expect(form.result.getValue('name')).toBe('Typed')
    expect(form.result.getValue('email')).toBe('loaded@example.test')
  })

  it('an explicit external replacement remains available', () => {
    const form = mountForm<{ name: string }>({
      defaultValues: { name: '' },
      values: { name: 'First' },
      resetOptions: { keepDirtyValues: false },
    })
    form.result.setValue('name', 'Typed')
    form.setOptions({
      defaultValues: { name: '' },
      values: { name: 'Replacement' },
      resetOptions: { keepDirtyValues: false },
    })
    expect(form.result.getValue('name')).toBe('Replacement')
  })

  it('preserves typing before a late effect answer while pristine fields fill', () => {
    const form = mountForm<{ name: string; email: string }>({
      defaultValues: { name: '', email: '' },
    })
    form.result.asState()[1]((previous) => ({ ...previous, name: 'Typed name' }))
    form.setOptions({
      defaultValues: { name: '', email: '' },
      values: { name: 'Server name', email: 'saved@example.test' },
    })
    expect(form.result.asState()[0]).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
    })
  })

  it('single-field fill preserves an edit and accepts functional updates', () => {
    const form = mountForm<{ quantity: number }>({ defaultValues: { quantity: 1 } })
    form.result.asState('quantity')[1]((previous) => previous + 2)
    form.result.asState('quantity')[2](10)
    expect(form.result.asState('quantity')[0]).toBe(3)
  })

  it('a pristine field takes a loaded value and equal edits remain pristine', () => {
    const form = mountForm<{ name: string; email: string }>({
      defaultValues: { name: '', email: '' },
    })
    form.result.asState()[1]((previous) => ({ ...previous }))
    form.result.asState()[2]({ name: 'Loaded', email: 'saved@example.test' })
    expect(form.result.asState()[0]).toEqual({ name: 'Loaded', email: 'saved@example.test' })
  })

  it('a new record key drops the old dirty draft and an old fill cannot affect it', () => {
    const form = mountForm<{ title: string }>({
      defaultValues: { title: '' },
      resetKey: 'first',
    })
    form.result.asState()[1]({ title: 'First draft' })
    const oldFill = form.result.asState()[2]
    form.setOptions({ defaultValues: { title: '' }, resetKey: 'second' })
    oldFill({ title: 'Late first answer' })
    form.result.asState()[2]({ title: 'Second record' })
    expect(form.result.asState()[0]).toEqual({ title: 'Second record' })
  })

  it('different records may have identical loaded field content', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) =>
      native.createForm({ ...options, values: undefined })
    const form = mountForm<{ title: string }>({
      createForm,
      defaultValues: { title: '' },
      resetKey: 'first',
      values: { title: 'Shared title' },
    })
    form.result.setValue('title', 'First draft')
    form.setOptions({
      createForm,
      defaultValues: { title: '' },
      resetKey: 'second',
      values: { title: 'Shared title' },
    })
    expect(form.result.getValue('title')).toBe('Shared title')
    expect(get(form.result.isDirty)).toBe(false)
  })

  it('explicit edits and form resets remain intentional replacements', () => {
    const form = mountForm<{ title: string }>({ defaultValues: { title: 'Initial' } })
    form.result.asState('title')[1]('Typed')
    form.result.reset({ title: 'Explicit reset' })
    expect(form.result.asState('title')[0]).toBe('Explicit reset')
  })

  it('keeps edit and fill callbacks stable across notifications and rerenders', () => {
    const form = mountForm<{ title: string }>({ defaultValues: { title: '' } })
    const edit = form.result.asState('title')[1]
    const fill = form.result.asState('title')[2]
    fill('Loaded')
    form.setOptions({ defaultValues: { title: '' } })
    expect(form.result.asState('title')[1]).toBe(edit)
    expect(form.result.asState('title')[2]).toBe(fill)
  })

  it('functional fills read the latest baseline while preserving a dirty field', () => {
    const form = mountForm<{ name: string; quantity: number }>({
      defaultValues: { name: '', quantity: 0 },
    })
    form.result.asState()[2]({ quantity: 2 })
    form.result.asState()[1]((previous) => ({ ...previous, name: 'Typed' }))
    form.result.asState()[2]((previous) => ({
      ...previous,
      name: 'Server',
      quantity: previous.quantity + 1,
    }))
    expect(form.result.asState()[0]).toEqual({ name: 'Typed', quantity: 3 })
  })

  it('a provider with cloned getters retains stable displayed values between notifications', () => {
    const native = createNativeFormProvider()
    const createForm: typeof native.createForm = (options) => {
      const form = native.createForm(options)
      return { ...form, getState: () => structuredClone(form.getState()) }
    }
    const form = mountForm<{ name: string }>({ defaultValues: { name: '' }, createForm })
    const method = form.result.asState
    const first = form.result.asState()[0]
    form.setOptions({ defaultValues: { name: '' }, createForm })
    expect(form.result.asState()[0]).toBe(first)
    form.result.asState()[2]({ name: 'Loaded' })
    expect(form.result.asState).toBe(method)
    expect(form.result.asState()[0]).toEqual({ name: 'Loaded' })
  })
})
