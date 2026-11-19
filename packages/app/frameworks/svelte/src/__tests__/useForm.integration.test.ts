// @vitest-environment jsdom

/**
 * The form hook over the bonded provider, React's `useForm.integration` cases
 * in the Svelte binding: rendered controls in a real Svelte tree, field
 * selection on a live mount, and the submit lifecycle.
 *
 * React rerenders with new props; a Svelte hook runs once, so where React
 * rerenders, this file sets a store the hook follows on the same mount.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  FormController,
  FormOptions,
  FormProvider,
  FormValuesConstraint,
} from '@molecule/app-forms'
import { createNativeFormProvider, setProvider } from '@molecule/app-forms'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import { useFieldState, useForm, useWatch } from '../hooks/useForm.js'
import { mountInContext } from './context-host.js'
import ContactForm from './forms/ContactForm.svelte'
import FieldStatus from './forms/FieldStatus.svelte'
import NamedProfileForm from './forms/NamedProfileForm.svelte'

/** A valid provider may return fresh objects at every level of a snapshot. */
function providerWithClonedSnapshots(): FormProvider {
  const native = createNativeFormProvider()
  return {
    createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
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

const hosts: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/**
 * Mounts the binding conformance host, so a hook or component runs under a
 * real Svelte context.
 *
 * @param component - The component to render.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountComponent<T extends Record<string, unknown>>(
  component: Component<T>,
  props: T,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const tree = mountInContext({}, component, props)
  hosts.push(tree.stop)
  return tree
}

/**
 * Mounts a host that calls the hook once during a child's init.
 *
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountHook<T>(run: () => T): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

/**
 * The element matching a selector, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param selector - The CSS selector.
 * @returns The matching element.
 */
function query<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element matched ${selector}`)
  return element
}

/**
 * The element with the given `aria-label`.
 *
 * @param container - The rendered tree.
 * @param label - The element's label.
 * @returns The matching element.
 */
function labelled<T extends HTMLElement>(container: ParentNode, label: string): T {
  return query<T>(container, `[aria-label="${label}"]`)
}

/**
 * Types into a labelled control and lets the component render.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @param next - The new value.
 */
function type(container: ParentNode, label: string, next: string): void {
  const element = labelled<HTMLInputElement>(container, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

/**
 * Dispatches a form's submit event.
 *
 * @param container - The rendered tree.
 * @param label - The form's `aria-label`.
 */
function submit(container: ParentNode, label: string): void {
  query<HTMLFormElement>(container, `form[aria-label="${label}"]`).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
  flushSync()
}

describe.each([
  ['native', createNativeFormProvider],
  ['cloned snapshots', providerWithClonedSnapshots],
] as const)('Svelte form integration: %s provider', (_name, createProvider) => {
  it('mounts, validates and submits the latest typed values while keeping the input mounted', async () => {
    const provider = createProvider()
    let finishSubmit!: () => void
    const submitHandler = vi.fn<(values: { email: string }) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
        }),
    )
    const view = mountComponent(ContactForm, {
      createForm: provider.createForm,
      onSubmit: submitHandler,
    })

    const input = labelled<HTMLInputElement>(view.container, 'Email')
    const form = query<HTMLFormElement>(view.container, 'form[aria-label="Contact"]')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      flushSync()
      expect(labelled<HTMLElement>(view.container, 'Email')).toBe(input)
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Email required')
    })
    expect(submitHandler).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)

    type(view.container, 'Email', 'reader@example.test')
    submit(view.container, 'Contact')
    await vi.waitFor(() => {
      flushSync()
      expect(submitHandler).toHaveBeenCalledExactlyOnceWith({ email: 'reader@example.test' })
    })
    expect(labelled<HTMLElement>(view.container, 'Email')).toBe(input)
    expect(query<HTMLElement>(view.container, '[role="status"]').textContent).toBe('Submitting')
    expect(query<HTMLButtonElement>(view.container, 'button').disabled).toBe(true)

    finishSubmit()
    await vi.waitFor(() => {
      flushSync()
      expect(query<HTMLElement>(view.container, '[role="status"]').textContent).toBe('Idle')
    })
    expect(labelled<HTMLElement>(view.container, 'Email')).toBe(input)
    expect(input.value).toBe('reader@example.test')
    expect(view.container.querySelector('[role="alert"]')).toBeNull()
    expect(query<HTMLButtonElement>(view.container, 'button').disabled).toBe(false)
  })

  it('uses provider field semantics through edits, reset, field selection and controller switches', async () => {
    interface Values {
      email: string
      backup: string
    }
    const first = createProvider().createForm<Values>({
      defaultValues: { email: 'first', backup: 'backup' },
    })
    const second = createProvider().createForm<Values>({
      defaultValues: { email: 'second', backup: 'other' },
    })
    const readSecond = vi.spyOn(second, 'getFieldState')
    // React's `rerender` with new props: the selection is a store the hook follows.
    const form = writable<FormController<Values>>(first)
    const name = writable<'email' | 'backup'>('email')
    const { result: field, stop } = mountHook(() => useFieldState(form, name))

    expect(get(field)).toEqual(first.getFieldState('email'))
    expect(get(field).dirty).toBe(false)
    first.setValue('email', 'edited')
    expect(get(field)).toMatchObject({ value: 'edited', dirty: true, touched: true })
    first.setError('email', 'Invalid')
    expect(get(field)).toMatchObject({ error: 'Invalid', valid: false })
    first.reset()
    expect(get(field)).toEqual(first.getFieldState('email'))
    expect(get(field).dirty).toBe(false)

    name.set('backup')
    expect(get(field).value).toBe('backup')
    first.setValue('email', 'unselected')
    expect(get(field).value).toBe('backup')

    form.set(second)
    expect(get(field).value).toBe('other')
    const selected = get(field)
    first.setValue('backup', 'old controller')
    expect(get(field)).toBe(selected)
    second.setValue('backup', 'new controller')
    expect(get(field).value).toBe('new controller')

    await stop()
    readSecond.mockClear()
    second.setValue('backup', 'after unmount')
    expect(readSecond).not.toHaveBeenCalled()
  })

  it('clears submitting state when the real submit callback rejects', async () => {
    const provider = createProvider()
    const { result: form } = mountHook(() =>
      useForm({ createForm: provider.createForm, defaultValues: { email: 'reader' } }),
    )
    const failure = new Error('Submission failed')
    await expect(
      form.handleSubmit(async () => {
        throw failure
      })(),
    ).rejects.toBe(failure)
    await vi.waitFor(() => {
      flushSync()
      expect(get(form.isSubmitting)).toBe(false)
    })
    expect(get(form.formState).submitCount).toBe(1)
  })
})

describe('useForm bonded provider default', () => {
  it('creates the controller from the bonded forms provider without forwarding the factory', () => {
    const native = createNativeFormProvider()
    let bondedCalls = 0
    let receivedKeys: string[] = []
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        receivedKeys = Object.keys(options)
        return native.createForm(options)
      },
    })
    try {
      const { result: form } = mountHook(() =>
        useForm<{ email: string }>({ defaultValues: { email: 'reader@example.test' } }),
      )

      expect(bondedCalls).toBe(1)
      expect(receivedKeys).toEqual(['defaultValues'])
      expect(form.getValue('email')).toBe('reader@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('prefers an explicit createForm override over the bonded provider', () => {
    let bondedCalls = 0
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        return createNativeFormProvider().createForm(options)
      },
    })
    try {
      const native = createNativeFormProvider()
      let overrideCalls = 0
      const override = <T extends FormValuesConstraint<T>>(
        options: FormOptions<T>,
      ): FormController<T> => {
        overrideCalls++
        return native.createForm(options)
      }
      const { result: form } = mountHook(() =>
        useForm<{ email: string }>({
          createForm: override,
          defaultValues: { email: 'override@example.test' },
        }),
      )

      expect(overrideCalls).toBe(1)
      expect(bondedCalls).toBe(0)
      expect(form.getValue('email')).toBe('override@example.test')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })

  it('mounts, validates and submits through the bonded default', async () => {
    setProvider(createNativeFormProvider())
    try {
      const submitHandler = vi.fn<(values: { name: string }) => void>()
      const view = mountComponent(NamedProfileForm, { onSubmit: submitHandler })
      const input = labelled<HTMLInputElement>(view.container, 'Name')

      expect(input.value).toBe('')
      expect(query<HTMLElement>(view.container, '[role="status"]').textContent).toBe('Clean')

      submit(view.container, 'Profile')
      await vi.waitFor(() => {
        flushSync()
        expect(document.activeElement).toBe(input)
      })
      expect(submitHandler).not.toHaveBeenCalled()

      type(view.container, 'Name', 'Ada')
      expect(query<HTMLElement>(view.container, '[role="status"]').textContent).toBe('Dirty')
      submit(view.container, 'Profile')
      await vi.waitFor(() => {
        flushSync()
        expect(submitHandler).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' })
      })
      expect(input.value).toBe('Ada')
    } finally {
      setProvider(createNativeFormProvider())
    }
  })
})

describe('form subscription boundaries', () => {
  it('preserves provider validation flags instead of reconstructing them from form errors', () => {
    interface Values {
      email: string
    }
    const form = createNativeFormProvider().createForm<Values>({
      defaultValues: { email: 'initial' },
    })
    const getFieldState = form.getFieldState.bind(form)
    const providerForm: FormController<Values> = {
      ...form,
      getFieldState: (name) => ({ ...getFieldState(name), validating: true }),
    }
    const { result: field } = mountHook(() => useFieldState(providerForm, 'email'))
    expect(get(field).validating).toBe(true)
    expect(get(field).dirty).toBe(false)
  })

  it('sees a controller update between render and subscription', () => {
    interface Values {
      email: string
    }
    const native = createNativeFormProvider().createForm<Values>({
      defaultValues: { email: 'before' },
    })
    // The change lands after the hook's first read and before its subscription
    // settles: React's render→subscribe gap, reproduced on the controller.
    let changed = false
    const controller: FormController<Values> = {
      ...native,
      subscribe: (listener) => {
        if (!changed) {
          changed = true
          native.setValue('email', 'after')
        }
        return native.subscribe(listener)
      },
    }
    const view = mountComponent<{ controller: FormController<Values> }>(FieldStatus, { controller })
    expect(query<HTMLElement>(view.container, '[role="status"]').textContent).toBe('after')
  })

  it('watches cloned object values and switches field and controller without stale data', () => {
    interface Pair {
      left: { value: number }
      right: { value: number }
    }
    const provider = providerWithClonedSnapshots()
    const first = provider.createForm<Pair>({
      defaultValues: { left: { value: 1 }, right: { value: 2 } },
    })
    const second = provider.createForm<Pair>({
      defaultValues: { left: { value: 3 }, right: { value: 4 } },
    })
    const form = writable<FormController<Pair>>(first)
    const name = writable<'left' | 'right'>('left')
    const { result: watched } = mountHook(() => useWatch(form, name))

    expect(get(watched)).toEqual({ value: 1 })
    first.setValue('left', { value: 5 })
    expect(get(watched)).toEqual({ value: 5 })
    name.set('right')
    expect(get(watched)).toEqual({ value: 2 })
    form.set(second)
    expect(get(watched)).toEqual({ value: 4 })
    const selected = get(watched)
    first.setValue('right', { value: 6 })
    expect(get(watched)).toBe(selected)
  })
})
