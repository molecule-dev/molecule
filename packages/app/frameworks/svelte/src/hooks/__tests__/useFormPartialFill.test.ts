// @vitest-environment jsdom
/**
 * `useForm`'s incremental `asState` fills: React's `useFormPartialFill` cases
 * in Svelte's idiom. A field fill is an explicit update that keeps the other
 * fields' pristine loaded values, and a whole-record fill still resets the
 * fields it omits.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import type { FormValuesConstraint } from '@molecule/app-forms'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import { useForm, type UseFormOptions, type UseFormResult } from '../useForm.js'

interface Fields {
  name: string
  email: string
  bio: string
}

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
 * Mounts a host that calls `useForm` once during a child's init.
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

/**
 * Lets the microtask that delivers a loaded field run.
 *
 * @returns A promise settled after the pending microtasks.
 */
const afterDelivery = (): Promise<void> => Promise.resolve()

describe('independent loaded form fields', () => {
  it('fills a multi-field editor without clearing earlier pristine fields', async () => {
    const form = mountForm<Fields>({ defaultValues: { name: '', email: '', bio: '' } })

    await afterDelivery()
    form.result.asState('name')[2]('Loaded item')
    form.result.asState('email')[2]('Loaded description')
    form.result.asState('bio')[2]('Loaded notes')

    expect(form.result.getValue('name')).toBe('Loaded item')
    expect(form.result.getValue('email')).toBe('Loaded description')
    expect(form.result.getValue('bio')).toBe('Loaded notes')
  })

  it('preserves edits as other fields arrive and reset restores every loaded baseline', () => {
    const form = mountForm<Fields>({ defaultValues: { name: '', email: '', bio: '' } })

    form.result.asState('name')[2]('Saved name')
    form.result.asState('name')[1]('Typed name')
    form.result.asState('email')[2]('saved@example.test')
    form.result.asState('bio')[2]('Loaded biography')

    expect(get(form.result.formState).values).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })

    form.result.reset()

    expect(get(form.result.formState).values).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(get(form.result.isDirty)).toBe(false)
  })

  it('whole-record replacements still reset omitted pristine fields', () => {
    const form = mountForm<{ name: string; email: string }>({
      defaultValues: { name: '', email: '' },
    })

    form.result.asState()[2]({ name: 'First', email: 'first@example.test' })
    form.result.asState()[2]({ name: 'Second' })

    expect(get(form.result.formState).values).toEqual({ name: 'Second', email: '' })
  })
})
