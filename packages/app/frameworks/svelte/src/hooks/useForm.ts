/**
 * Svelte hooks for form handling, porting React's `useForm` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormResetOptions,
  FormState,
  FormValuesConstraint,
  RegisterOptions,
} from '@molecule/app-forms'
import {
  createForm as createBondedForm,
  formValuesEqual,
  snapshotFormValue,
} from '@molecule/app-forms'

/**
 * What one host owns across the mounts an `args` step makes of the hook:
 * React re-renders ONE instance when its arguments change, while a Svelte host
 * re-mounts, so the replacing mount adopts this lane — the controller
 * continues, the external-values history stays, and the asState tuples are
 * kept. A changed `resetKey` starts a fresh controller, which is a fresh lane.
 * A mount after the lane's disarm timer has cleared it (an unmount with no
 * replacement in the same turn) is a genuinely new component and starts fresh.
 */
interface FormLane<T extends FormValuesConstraint<T>> {
  /** React's mounted flag: false once the host is gone with no replacement. */
  dead: boolean
  /** The controller created by the host's first mount. */
  form: FormController<T>
  /** The resetKey the controller was created for. */
  resetKey: string | number | boolean | bigint | null | undefined
  /** The last external `values` applied, compared by content (React's ref). */
  lastExternal: { values: Partial<T> } | null
  /** asState's [edit, fill] tuples per name, per controller. */
  stateTuples: Map<keyof T | undefined, readonly [unknown, unknown]>
}

/** The previous host's lane, alive until its disarm timer runs. */
let formHandoff: FormLane<never> | null = null

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
  updateValues: (values: Partial<T>, resetOptions?: FormResetOptions) => void
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
 * @param options - Form options. `defaultValues`, `mode` and the form-level
 * `validate` are forwarded to the provider.
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
  options: UseFormOptions<T> = {},
): UseFormResult<T> {
  const { createForm = createBondedForm, resetKey, ...formOptions } = options

  // A mount in the same turn as the previous host's destroy is React's
  // re-render (an args step), not a new component: adopt its lane (when the
  // resetKey did not change) so the controller and its state continue.
  const adopted = formHandoff as unknown as FormLane<T> | null
  formHandoff = null
  const sameForm = adopted !== null && Object.is(adopted.resetKey, resetKey)
  const form: FormController<T> = sameForm ? (adopted as FormLane<T>).form : createForm(formOptions)
  const lane: FormLane<T> = sameForm
    ? (adopted as FormLane<T>)
    : { dead: false, form, resetKey, lastExternal: null, stateTuples: new Map() }
  lane.resetKey = resetKey
  if (sameForm) lane.dead = false

  // React's mounted flag: false once the host is gone with no replacement.
  let mounted = !lane.dead
  onDestroy(() => {
    mounted = false
    lane.dead = true
    // Offer the lane to a mount in the same turn (React's re-render); the
    // timer clears it when no replacement adopted, so a mount after a settled
    // teardown starts fresh. The controller itself stays as React leaves it:
    // subscribed-to-nothing, never destroyed mid-flight.
    formHandoff = lane as unknown as FormLane<never>
    const offered = lane as unknown as FormLane<never>
    setTimeout(() => {
      if (formHandoff === offered) formHandoff = null
    }, 0)
  })

  const keepDirtyValues = options.resetOptions?.keepDirtyValues !== false
  // External content has its own history. A reset may change the controller
  // baseline without making an unchanged record external again.
  const applyExternalValues = (): void => {
    const values = options.values
    if (values === undefined) {
      lane.lastExternal = null
      return
    }
    if (lane.lastExternal !== null && formValuesEqual(lane.lastExternal.values, values)) return
    lane.lastExternal = { values: snapshotFormValue(values) }
    form.updateValues(values, { keepDirtyValues })
  }
  applyExternalValues()

  // Subscribed state (the controller rebuilds its state object only on change),
  // read the way React's cached useSyncExternalStore snapshot is: one read at
  // creation, one re-read right after subscribing, one per notification. The
  // mirror is what asState's visible value reads (React's stateSnapshots).
  let currentState: FormState<T> = form.getState()
  const state = writable<FormState<T>>(currentState)
  const refresh = (): void => {
    currentState = form.getState()
    state.set(currentState)
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  onDestroy(unsubscribe)

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

  const updateValues = (values: Partial<T>, resetOptions?: FormResetOptions): void =>
    form.updateValues(values, resetOptions)

  const validate = (): Promise<boolean> => form.validate()

  const asState = (name?: keyof T): readonly [unknown, unknown, unknown] => {
    const read = (): T | T[keyof T] =>
      name === undefined ? form.getState().values : form.getValue(name)
    // The value the caller sees comes from the subscribed snapshot, not a
    // fresh read: a fill that lands between renders must not jump ahead.
    const visible = name === undefined ? currentState.values : currentState.values[name]
    const existing = lane.stateTuples.get(name)
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
        { keepDirtyValues: true },
      )
    }
    lane.stateTuples.set(name, [edit, fill] as const)
    return [visible, edit, fill] as const
  }

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) =>
    form.handleSubmit((values) => {
      if (mounted && lane.form === form) return onSubmit(values)
    }, onError)

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
