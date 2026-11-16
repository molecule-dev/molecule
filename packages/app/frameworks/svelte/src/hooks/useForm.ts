/**
 * Svelte hooks for form handling, porting React's `useForm` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, get, type Readable, writable } from 'svelte/store'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormResetOptions,
  FormState,
  FormUpdateOptions,
  FormValuesConstraint,
  RegisterOptions,
} from '@molecule/app-forms'
import {
  createForm as createBondedForm,
  formValuesEqual,
  snapshotFormValue,
} from '@molecule/app-forms'

import { type MaybeReadable, toReadable } from './maybe-readable.js'

/**
 * Options for useForm hook.
 *
 * Every `FormOptions` field is supported. `createForm` is only an override —
 * omit it and the hook creates the controller through the bonded forms
 * provider (`createForm` from `@molecule/app-forms`), which uses the built-in
 * native provider until the app bonds its own.
 */
export interface UseFormOptions<T extends FormValuesConstraint<T>> extends FormOptions<T> {
  /** External values preserve dirty fields by default. Set keepDirtyValues: false to replace them explicitly. */
  resetOptions?: FormResetOptions
  /** New record identity. Serialize composite keys; fresh objects/arrays must not reset drafts on each mount. */
  resetKey?: string | number | boolean | bigint | null
  /**
   * Explicit form factory for this one form. Defaults to the bonded forms
   * provider; pass it only to pin a specific provider instance.
   */
  createForm?: (options: FormOptions<T>) => FormController<T>
}

/**
 * Result of useForm hook: the state fields as readable stores, the methods as
 * plain functions.
 */
export interface UseFormResult<T extends FormValuesConstraint<T>> {
  /** The whole form state. */
  formState: Readable<FormState<T>>
  /** Whether every field passes validation. */
  isValid: Readable<boolean>
  /** Whether any field differs from the baseline. */
  isDirty: Readable<boolean>
  /** Whether a submit is running. */
  isSubmitting: Readable<boolean>

  /** Registers a field; returns its native bindings. */
  register: (
    name: keyof T,
    options?: Omit<RegisterOptions, 'name'> & { name?: string },
  ) => FieldRegistration
  /** Reads one field's value. */
  getValue: <K extends keyof T>(name: K) => T[K]
  /** Writes one field's value (marks it touched and dirty). */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  /** Reads one field's error. */
  getError: (name: keyof T) => string | undefined
  /** Sets or clears one field's error. */
  setError: (name: keyof T, error: string | undefined) => void
  /** Clears every field error. */
  clearErrors: () => void

  /** Validates and runs the handler; returns the submit runner. */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>
  /** Restores the baseline (optionally a new one) and clears touched, errors and submit state. */
  reset: (values?: Partial<T>) => void
  /** Applies externally loaded values without clearing submission state. */
  updateValues: (values: Partial<T>, resetOptions?: FormUpdateOptions) => void
  /** Whole-form state tuple: edits mark only changed fields dirty; fills preserve them. */
  asState(): readonly [
    T,
    (value: T | ((previous: T) => T)) => void,
    (value: Partial<T> | ((previous: T) => Partial<T>)) => void,
  ]
  /** One field as [value, edit, fill]. Fill preserves edits made before data arrives. */
  asState<K extends keyof T>(
    name: K,
  ): readonly [
    T[K],
    (value: T[K] | ((previous: T[K]) => T[K])) => void,
    (value: T[K] | ((previous: T[K]) => T[K])) => void,
  ]
  /** Runs every registered rule and publishes field errors. */
  validate: () => Promise<boolean>
}

/**
 * Hook for form state management, React's `useForm` in Svelte's idiom: call it
 * during component init (no provider needed — the controller comes from the
 * bonded forms provider).
 *
 * Creates its controller through the bonded forms provider, so an app wires a
 * form library once (`setProvider` from `@molecule/app-forms`) and every form
 * picks it up. Passing `createForm` overrides that for one form. When the
 * `values` option changes by content, it becomes the new baseline;
 * `resetOptions.keepDirtyValues` retains edited fields while pristine fields
 * take the loaded values. A changed `resetKey` starts a fresh form; fresh
 * `defaultValues` without one leave the drafts alone.
 *
 * The options may be a plain value or a readable store of one (a store holding
 * `undefined` means the options were omitted): setting the store re-runs the
 * work React's re-render does, on the same controller — a changed `values`
 * object is applied (dirty fields kept by default) and a changed `resetKey`
 * replaces the controller with a fresh one. Edits, touched fields and pending
 * submits survive every other change.
 *
 * @param options - Form options (or a store of them). `defaultValues`, `mode`
 *   and the form-level `validate` are forwarded to the provider.
 * @returns Form state stores and methods
 * @example
 * ```svelte
 * <script>
 *   import { useForm } from '@molecule/app-svelte'
 *   const { register, handleSubmit, formState, isSubmitting } = useForm({
 *     defaultValues: { email: '', password: '' },
 *   })
 *   const onSubmit = handleSubmit(async (values) => { await login(values) })
 * </script>
 *
 * <form onsubmit={onSubmit}>
 *   <input {...$registerNotNeeded} />
 * </form>
 * ```
 */
export function useForm<T extends FormValuesConstraint<T> = Record<string, unknown>>(
  options: MaybeReadable<UseFormOptions<T> | undefined> = {},
): UseFormResult<T> {
  const optionsStore = toReadable(options)
  const readOptions = (): UseFormOptions<T> => get(optionsStore) ?? {}

  const initial = readOptions()

  // React's mounted flag: false once the component is gone. The controller
  // itself stays as React leaves it: subscribed-to-nothing, never destroyed
  // mid-flight.
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  // The controller (React's formRef): created once, and replaced only when the
  // resetKey changes by Object.is. Every method below reads the current one at
  // call time, as React's re-created callbacks read theirs.
  const createFor = (opts: UseFormOptions<T>): FormController<T> => {
    const { createForm = createBondedForm, resetKey: _resetKey, ...formOptions } = opts
    return createForm(formOptions)
  }
  let form: FormController<T> = createFor(initial)
  let formResetKey: UseFormOptions<T>['resetKey'] = initial.resetKey

  // Subscribed state (the controller rebuilds its state object only on change),
  // read the way React's cached useSyncExternalStore snapshot is: one read at
  // creation, one re-read right after subscribing, one per notification. The
  // mirror is what asState's visible value reads (React's stateSnapshots).
  let currentState: FormState<T> = form.getState()
  const state = writable<FormState<T>>(currentState)
  let stopState: (() => void) | null = null
  const attachState = (controller: FormController<T>): void => {
    stopState?.()
    stopState = controller.subscribe(() => {
      currentState = controller.getState()
      state.set(currentState)
    })
    currentState = controller.getState()
    state.set(currentState)
  }
  attachState(form)
  onDestroy(() => {
    stopState?.()
  })

  // The last external `values` applied, compared by content (React's ref): it
  // survives an argument change; a reset may change the controller baseline
  // without making an unchanged record external again.
  let lastExternal: { form: FormController<T>; values: Partial<T> } | null = null
  const applyExternalValues = (opts: UseFormOptions<T>): void => {
    const values = opts.values
    if (values === undefined) {
      lastExternal = null
      return
    }
    if (
      lastExternal !== null &&
      lastExternal.form === form &&
      formValuesEqual(lastExternal.values, values)
    ) {
      return
    }
    lastExternal = { form, values: snapshotFormValue(values) }
    form.updateValues(values, { keepDirtyValues: opts.resetOptions?.keepDirtyValues !== false })
  }
  applyExternalValues(initial)

  // asState's [edit, fill] tuples, per controller (React's per-form Map): a
  // replaced controller starts a fresh map, so tuples are rebuilt for it.
  let stateTuples: Map<keyof T | undefined, readonly [unknown, unknown]> = new Map()

  // What a changed options source does, on the same component: a changed
  // resetKey replaces the controller (fresh defaults, fresh tuples, external
  // values re-applied); otherwise a changed `values` is applied with the
  // latest keepDirtyValues. The store calls back at once with the options the
  // form was created with, which changes nothing.
  const stopOptions = optionsStore.subscribe((next) => {
    const opts = (next ?? {}) as UseFormOptions<T>
    if (!Object.is(opts.resetKey, formResetKey)) {
      form = createFor(opts)
      formResetKey = opts.resetKey
      stateTuples = new Map()
      attachState(form)
      applyExternalValues(opts)
      return
    }
    applyExternalValues(opts)
  })
  onDestroy(stopOptions)

  // Field methods
  const register = (
    name: keyof T,
    registerOptions?: Omit<RegisterOptions, 'name'> & { name?: string },
  ): FieldRegistration =>
    form.register({ ...registerOptions, name: name as string } as RegisterOptions)

  const getValue = <K extends keyof T>(name: K): T[K] => form.getValue(name)

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    form.setValue(name as string, value)
  }

  const getError = (name: keyof T): string | undefined => form.getError(name as string)

  const setError = (name: keyof T, error: string | undefined): void => {
    if (error !== undefined) {
      form.setError(name as string, error)
    } else {
      form.clearError(name)
    }
  }

  const clearErrors = (): void => form.clearErrors()

  const reset = (values?: Partial<T>): void => form.reset(values)

  const updateValues = (values: Partial<T>, resetOptions?: FormUpdateOptions): void =>
    form.updateValues(values, resetOptions)

  const validate = (): Promise<boolean> => form.validate()

  const asState = (name?: keyof T): readonly [unknown, unknown, unknown] => {
    const read = (): T | T[keyof T] =>
      name === undefined ? form.getState().values : form.getValue(name)
    // The value the caller sees comes from the subscribed snapshot, not a
    // fresh read: a fill that lands between renders must not jump ahead.
    const visible = name === undefined ? currentState.values : currentState.values[name]
    const existing = stateTuples.get(name)
    if (existing) return [visible, ...existing] as readonly [unknown, unknown, unknown]
    const edit = (value: T | T[keyof T] | ((previous: T | T[keyof T]) => T | T[keyof T])): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => T | T[keyof T])(read())
          : value
      if (name !== undefined) {
        form.setValue(name as string, next as T[keyof T])
        return
      }
      const values = next as T
      for (const field of Object.keys(Object.assign({}, form.getState().values, values)) as Extract<
        keyof T,
        string
      >[]) {
        if (!formValuesEqual(form.getValue(field), values[field]))
          form.setValue(field, values[field])
      }
    }
    const fill = (
      value: Partial<T> | T[keyof T] | ((previous: T | T[keyof T]) => Partial<T> | T[keyof T]),
    ): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => Partial<T> | T[keyof T])(read())
          : value
      form.updateValues(
        name === undefined ? (next as Partial<T>) : ({ [name]: next } as Partial<T>),
        { keepDirtyValues: true, keepOmittedValues: name !== undefined },
      )
    }
    stateTuples.set(name, [edit, fill] as const)
    return [visible, edit, fill] as const
  }

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    // The controller this runner was created for (React's per-render form): a
    // submit runner from before a resetKey change does not call its handler.
    const boundForm = form
    return form.handleSubmit((values) => {
      if (mounted && form === boundForm) return onSubmit(values)
    }, onError)
  }

  return {
    formState: { subscribe: state.subscribe },
    isValid: derived(state, (current) => current.isValid),
    isDirty: derived(state, (current) => current.isDirty),
    isSubmitting: derived(state, (current) => current.isSubmitting),
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    updateValues,
    asState: asState as UseFormResult<T>['asState'],
    validate,
  }
}

/**
 * Hook to watch a specific field value, React's `useWatch` in Svelte's idiom:
 * a readable store of the field's current value.
 *
 * @param form - Form controller
 * @param name - Field name to watch
 * @returns A readable store of the current field value
 * @example
 * ```svelte
 * <script>
 *   import { useForm, useWatch } from '@molecule/app-svelte'
 *   const { form } = useForm({ defaultValues: { country: '' } })
 *   const country = useWatch(form, 'country')
 * </script>
 *
 * <p>{$country}</p>
 * ```
 */
export function useWatch<T extends FormValuesConstraint<T>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): Readable<T[K]> {
  // The whole state as the cached snapshot (React's useFormSnapshot over
  // getValue), one read at creation, one re-read after subscribing, one per
  // notification.
  const state = writable<FormState<T>>(form.getState())
  const refresh = (): void => {
    state.set(form.getState())
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  onDestroy(unsubscribe)

  return derived(state, (current) => current.values[name])
}

/**
 * Hook to get field-level state, React's `useFieldState` in Svelte's idiom: a
 * readable store of the field's state.
 *
 * @param form - Form controller
 * @param name - Field name
 * @returns A readable store of the field state (value, error, touched, dirty, valid, validating)
 */
export function useFieldState<T extends FormValuesConstraint<T>>(
  form: FormController<T>,
  name: keyof T,
): Readable<FieldState<T[keyof T]>> {
  const state = writable<FieldState<T[keyof T]>>(form.getFieldState(name))
  const refresh = (): void => {
    state.set(form.getFieldState(name))
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  onDestroy(unsubscribe)

  return { subscribe: state.subscribe }
}
