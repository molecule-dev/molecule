/**
 * Angular functions for form handling, mirroring `useForm`, `useWatch` and
 * `useFieldState` from `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, type Signal, signal, untracked } from '@angular/core'

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

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { useExternalStore } from './external-store.js'

/**
 * Options for {@link useForm}.
 *
 * Every `FormOptions` field is supported. `createForm` is only an override —
 * omit it and the hook creates the controller through the bonded forms
 * provider (`createForm` from `@molecule/app-forms`), which uses the built-in
 * native provider until the app bonds its own.
 *
 * @template T - The form's values shape.
 */
export interface UseFormOptions<T extends FormValuesConstraint<T>> extends FormOptions<T> {
  /** External values preserve dirty fields by default. Set keepDirtyValues: false to replace them explicitly. */
  resetOptions?: FormResetOptions
  /** New record identity. Serialize composite keys; fresh objects/arrays must not reset drafts on each render. */
  resetKey?: string | number | boolean | bigint | null
  /**
   * Explicit form factory for this one form. Defaults to the bonded forms
   * provider; pass it only to pin a specific provider instance.
   *
   * @param options - The form options.
   * @returns The controller.
   */
  createForm?: (options: FormOptions<T>) => FormController<T>
}

/**
 * A set-state function over a form value: a value or an updater receiving the
 * previous value.
 *
 * @template T - The value's shape.
 */
export type FormSetState<T> = (value: T | ((previous: T) => T)) => void

/**
 * Result of {@link useForm}: the state fields as signals and every method as a
 * plain function.
 *
 * @template T - The form's values shape.
 */
export interface UseFormResult<T extends FormValuesConstraint<T>> {
  // State
  /** The whole-form state. */
  readonly formState: Signal<FormState<T>>
  /** Whether the form has no errors. */
  readonly isValid: Signal<boolean>
  /** Whether any field differs from its baseline. */
  readonly isDirty: Signal<boolean>
  /** Whether a submit is running. */
  readonly isSubmitting: Signal<boolean>

  // Field methods
  /**
   * Registers a field and returns its bindings.
   *
   * @param name - The field's name.
   * @param options - Registration options.
   * @returns The field registration.
   */
  register: (
    name: keyof T,
    options?: Omit<RegisterOptions, 'name'> & { name?: string },
  ) => FieldRegistration
  /**
   * Reads one field's value.
   *
   * @param name - The field's name.
   * @returns The value.
   */
  getValue: <K extends keyof T>(name: K) => T[K]
  /**
   * Writes one field's value (marks it touched).
   *
   * @param name - The field's name.
   * @param value - The new value.
   */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  /**
   * Reads one field's error.
   *
   * @param name - The field's name.
   * @returns The error message, or `undefined`.
   */
  getError: (name: keyof T) => string | undefined
  /**
   * Sets or clears one field's error.
   *
   * @param name - The field's name.
   * @param error - The message, or `undefined` to clear.
   */
  setError: (name: keyof T, error: string | undefined) => void
  /** Clears every field error. */
  clearErrors: () => void

  // Form methods
  /**
   * Builds the submit runner over the controller's validation.
   *
   * @param onSubmit - Called with the values once validation passes.
   * @returns The runner to call on submit.
   */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>
  /**
   * Resets to the baseline (or new values, which become the baseline).
   *
   * @param values - Optional new baseline.
   */
  reset: (values?: Partial<T>) => void
  /**
   * Applies outside values.
   *
   * @param values - The values to apply.
   * @param resetOptions - Whether edits survive.
   */
  updateValues: (values: Partial<T>, resetOptions?: FormUpdateOptions) => void
  /**
   * Whole-form state tuple: edits mark only changed fields dirty; fills
   * preserve them.
   *
   * @returns `[values, edit, fill]`.
   */
  asState(): readonly [T, FormSetState<T>, FormSetState<Partial<T>>]
  /**
   * One field as [value, edit, fill]. Fill preserves edits made before data
   * arrives.
   *
   * @param name - The field's name.
   * @returns `[value, edit, fill]`.
   */
  asState<K extends keyof T>(name: K): readonly [T[K], FormSetState<T[K]>, FormSetState<T[K]>]
  /**
   * Runs the whole validation.
   *
   * @returns Whether the form is valid.
   */
  validate: () => Promise<boolean>
}

/**
 * Adapts controller notifications to the external-store snapshot contract.
 * Providers may return fresh objects from their getters; reads between
 * notifications must still return the same snapshot.
 *
 * The controller and the selected name may be signals: a new one is subscribed
 * in place of the old (the old subscription is dropped first), the way React
 * re-renders `useWatch`/`useFieldState` with new arguments.
 *
 * @param form - Controller that owns the subscription (or a signal of it).
 * @param name - The selected field name (or a signal of it).
 * @param read - Reads the selected field from the controller and name.
 * @returns The current subscribed snapshot as a signal.
 */
function useFormSnapshot<T extends FormValuesConstraint<T>, K, S>(
  form: MaybeSignal<FormController<T>>,
  name: MaybeSignal<K>,
  read: (form: FormController<T>, name: K) => S,
): Signal<S> {
  let currentForm = readMaybeSignal(form)
  let currentName = readMaybeSignal(name)
  let snapshot = read(currentForm, currentName)
  let notifyStore: (() => void) | null = null
  let stop: (() => void) | null = null
  const state = useExternalStore(
    () => snapshot,
    (onChange) => {
      const refresh = (): void => {
        snapshot = read(currentForm, currentName)
        onChange()
      }
      notifyStore = onChange
      stop = currentForm.subscribe(refresh)
      // A controller can change after render but before React subscribes.
      refresh()
      return () => stop?.()
    },
  )
  effect(() => {
    const nextForm = readMaybeSignal(form)
    const nextName = readMaybeSignal(name)
    if (nextForm === currentForm && nextName === currentName) return
    currentForm = nextForm
    currentName = nextName
    untracked(() => {
      stop?.()
      snapshot = read(currentForm, currentName)
      stop = currentForm.subscribe(() => {
        snapshot = read(currentForm, currentName)
        notifyStore?.()
      })
      notifyStore?.()
    })
  })
  return state
}

/**
 * Form state management. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * Creates its controller through the bonded forms provider, so an app wires a
 * form library once (`setProvider` from `@molecule/app-forms`) and every form
 * picks it up. Passing `createForm` overrides that for one form.
 *
 * The options may be a signal, and the hook follows them the way React's
 * re-render does: when `values` changes by content, it becomes the new
 * baseline; `resetOptions.keepDirtyValues` retains edited fields while
 * pristine fields take the loaded values. A changed `resetKey` starts a fresh
 * form; new `defaultValues` without one leave the form (and its drafts) alone.
 *
 * @param options - Form options (or a signal of them).
 * @returns Form state as signals and the form methods.
 */
export function useForm<T extends FormValuesConstraint<T> = Record<string, unknown>>(
  options: MaybeSignal<UseFormOptions<T>> = {},
): UseFormResult<T> {
  const destroyRef = inject(DestroyRef)
  let mounted = false

  /**
   * Builds the controller one options object asks for, through the same fields
   * React forwards (`createForm` and `resetKey` aside).
   */
  const createControllerOf = (opts: UseFormOptions<T>): FormController<T> => {
    const { createForm = createBondedForm, resetKey: _resetKey, ...formOptions } = opts
    return createForm(formOptions)
  }

  // The controller React keeps in its formRef/formKey pair: created once,
  // replaced only when the resetKey changes (compared with Object.is, like
  // React's render-time check).
  let currentOptions = readMaybeSignal(options) ?? {}
  let formResetKey = currentOptions.resetKey
  let form = createControllerOf(currentOptions)

  // The state snapshot, cached between notifications the way React's
  // useSyncExternalStore requires, and re-keyed when the controller is
  // replaced.
  let stateSnapshot: FormState<T> = form.getState()
  const formState = signal<FormState<T>>(stateSnapshot)
  let stopState: (() => void) | null = null
  // `asState`'s [edit, fill] pair per field, cached the way React keeps them in
  // the controller's scope: the same functions across notifications and
  // rerenders, dropped with the controller they were created for.
  type AsStateActions = readonly [
    (value: SetStateInput<T | T[keyof T]>) => void,
    (value: SetStateInput<T | T[keyof T]>) => void,
  ]
  let asStateActions = new Map<keyof T | undefined, AsStateActions>()
  const bindState = (controller: FormController<T>): void => {
    stopState?.()
    stateSnapshot = controller.getState()
    formState.set(stateSnapshot)
    stopState = controller.subscribe(() => {
      const next = controller.getState()
      if (Object.is(stateSnapshot, next)) return
      stateSnapshot = next
      formState.set(next)
    })
  }
  bindState(form)
  destroyRef.onDestroy(() => {
    mounted = false
    stopState?.()
  })

  // External content has its own history. A reset may change the controller
  // baseline without making an unchanged record external again.
  let lastExternalValues: { form: FormController<T>; values: Partial<T> } | null = null
  const applyExternalValues = (opts: UseFormOptions<T>): void => {
    const values = opts.values
    if (values === undefined) {
      lastExternalValues = null
      return
    }
    const keepDirtyValues = opts.resetOptions?.keepDirtyValues !== false
    if (
      lastExternalValues !== null &&
      lastExternalValues.form === form &&
      formValuesEqual(lastExternalValues.values, values)
    ) {
      return
    }
    lastExternalValues = { form, values: snapshotFormValue(values) }
    form.updateValues(values, { keepDirtyValues })
  }
  applyExternalValues(currentOptions)

  // Follow the options the way React's re-render does: a changed resetKey
  // rebuilds the controller (and applies the new options' external values to
  // it); otherwise only the external-values check runs.
  effect(() => {
    const next = readMaybeSignal(options) ?? {}
    if (next === currentOptions) return
    currentOptions = next
    untracked(() => {
      if (!Object.is(formResetKey, next.resetKey)) {
        formResetKey = next.resetKey
        form = createControllerOf(next)
        bindState(form)
        asStateActions = new Map()
        lastExternalValues = null
      }
      applyExternalValues(next)
    })
  })

  mounted = true

  const register = (
    name: keyof T,
    registerOptions?: Omit<RegisterOptions, 'name'> & { name?: string },
  ): FieldRegistration =>
    form.register({ ...registerOptions, name: name as string } as RegisterOptions)

  const getValue = <K extends keyof T>(name: K): T[K] => form.getValue(name)

  const setValue = <K extends keyof T>(name: K, value: T[K]): void =>
    form.setValue(name as string, value)

  const getError = (name: keyof T): string | undefined => form.getError(name as string)

  const setError = (name: keyof T, error: string | undefined): void => {
    if (error !== undefined) {
      form.setError(name as string, error)
    } else {
      form.clearError(name)
    }
  }

  const clearErrors = (): void => form.clearErrors()

  const reset = (resetValues?: Partial<T>): void => form.reset(resetValues)

  const updateValues = (newValues: Partial<T>, resetOpts?: FormUpdateOptions): void =>
    form.updateValues(newValues, resetOpts)

  // The implementation is widened to `unknown` and the object literal's cast
  // restores the overloads, like the Vue and Svelte bindings: `edit`/`fill`
  // accept a superset of the tuple's declared call shapes.
  const asState = (name?: keyof T): readonly [unknown, unknown, unknown] => {
    // The value the last notification published, exactly like React's
    // `state.getSnapshot()`: a provider that clones from its getters still
    // shows the same value between notifications.
    const visible = name === undefined ? stateSnapshot.values : stateSnapshot.values[name]
    const cached = asStateActions.get(name)
    if (cached) return [visible, cached[0], cached[1]] as const
    // The pair belongs to the controller it was created for (React's per-scope
    // cache): an old action captured before a resetKey change cannot reach the
    // replacement controller or its record.
    const actionForm = form
    const read = (): T | T[keyof T] =>
      name === undefined ? actionForm.getState().values : actionForm.getValue(name)
    const edit = (value: SetStateInput<T | T[keyof T]>): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => T | T[keyof T])(read())
          : value
      if (name !== undefined) {
        actionForm.setValue(name as string, next as T[keyof T])
        return
      }
      const nextValues = next as T
      for (const field of Object.keys(
        Object.assign({}, actionForm.getState().values, nextValues),
      ) as Extract<keyof T, string>[]) {
        if (!formValuesEqual(actionForm.getValue(field), nextValues[field]))
          actionForm.setValue(field, nextValues[field])
      }
    }
    const fill = (value: SetStateInput<T | T[keyof T]>): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => T | T[keyof T])(read())
          : value
      actionForm.updateValues(
        name === undefined ? (next as Partial<T>) : ({ [name]: next } as Partial<T>),
        { keepDirtyValues: true, keepOmittedValues: name !== undefined },
      )
    }
    asStateActions.set(name, [edit, fill])
    return [visible, edit, fill] as const
  }

  const validate = (): Promise<boolean> => form.validate()

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    // React's runner is rebuilt per render and drops submissions for any
    // controller that is no longer the formRef's; the runner built here drops
    // them when the resetKey has since replaced this controller.
    const runnerForm = form
    return form.handleSubmit((values) => {
      if (mounted && runnerForm === form) return onSubmit(values)
    })
  }

  return {
    formState: formState.asReadonly(),
    isValid: computed(() => formState().isValid),
    isDirty: computed(() => formState().isDirty),
    isSubmitting: computed(() => formState().isSubmitting),
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

/** An edit/fill input: a value or an updater receiving the previous value. */
type SetStateInput<T> = T | ((previous: T) => T)

/**
 * Watches one field's value. Call it in an injection context.
 *
 * The controller and name may be signals, so a new controller or field is
 * followed the way React re-renders `useWatch` with new arguments.
 *
 * @param form - Form controller (or a signal of it).
 * @param name - Field name to watch (or a signal of it).
 * @returns The current field value as a signal.
 */
export function useWatch<T extends FormValuesConstraint<T>, K extends keyof T>(
  form: MaybeSignal<FormController<T>>,
  name: MaybeSignal<K>,
): Signal<T[K]> {
  return useFormSnapshot(form, name, (current, currentName) => current.getValue(currentName))
}

/**
 * Reads one field's state. Call it in an injection context.
 *
 * The controller and name may be signals, so a new controller or field is
 * followed the way React re-renders `useFieldState` with new arguments.
 *
 * @param form - Form controller (or a signal of it).
 * @param name - Field name (or a signal of it).
 * @returns The field state as a signal.
 */
export function useFieldState<T extends FormValuesConstraint<T>>(
  form: MaybeSignal<FormController<T>>,
  name: MaybeSignal<keyof T>,
): Signal<FieldState<T[keyof T]>> {
  return useFormSnapshot(form, name, (current, currentName) => current.getFieldState(currentName))
}
