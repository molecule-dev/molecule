/**
 * Angular functions for form handling, mirroring `useForm`, `useWatch` and
 * `useFieldState` from `@molecule/app-react`.
 *
 * Like React — whose component instance survives an argument change — the
 * controller survives this site's re-creation (an argument change to the
 * hook), unless the `resetKey` changed, which starts a fresh form. See
 * `site.ts`.
 *
 * @module
 */

import { computed, DestroyRef, ElementRef, inject, type Signal } from '@angular/core'

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

import { adoptLane, captureSite, parkLane } from '../site.js'
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
  updateValues: (values: Partial<T>, resetOptions?: FormResetOptions) => void
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
 * What one site's lane carries across a re-mount of the same hook kind.
 *
 * @template T - The form's values shape.
 */
interface FormLane<T extends FormValuesConstraint<T>> {
  /** The form controller (kept unless the resetKey changed). */
  controller: FormController<T>
  /** The resetKey the controller was created for. */
  resetKey: string | number | boolean | bigint | null | undefined
  /** The last external `values` this site applied, for the change check. */
  lastExternalValues: { controller: FormController<T>; values: Partial<T> } | null
  /** Whether the current host is mounted. */
  mounted: boolean
}

/**
 * Adapts controller notifications to the external-store snapshot contract.
 * Providers may return fresh objects from their getters; reads between
 * notifications must still return the same snapshot.
 *
 * @param form - Controller that owns the subscription.
 * @param read - Reads the form state or a selected field.
 * @returns The current subscribed snapshot as a signal.
 */
function useFormSnapshot<T extends FormValuesConstraint<T>, S>(
  form: FormController<T>,
  read: () => S,
): Signal<S> {
  let snapshot = read()
  return useExternalStore(
    () => snapshot,
    (onChange) => {
      const refresh = (): void => {
        snapshot = read()
        onChange()
      }
      const unsubscribe = form.subscribe(refresh)
      // A controller can change after render but before React subscribes.
      refresh()
      return unsubscribe
    },
  )
}

/**
 * Form state management. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * Creates its controller through the bonded forms provider, so an app wires a
 * form library once (`setProvider` from `@molecule/app-forms`) and every form
 * picks it up. Passing `createForm` overrides that for one form.
 *
 * When `values` changes by content, it becomes the new baseline;
 * `resetOptions.keepDirtyValues` retains edited fields while pristine fields
 * take the loaded values. A changed `resetKey` starts a fresh form; new
 * `defaultValues` without one leave the form alone.
 *
 * @param options - Form options.
 * @returns Form state as signals and the form methods.
 */
export function useForm<T extends FormValuesConstraint<T> = Record<string, unknown>>(
  options: UseFormOptions<T> = {},
): UseFormResult<T> {
  const { createForm = createBondedForm, resetKey, ...formOptions } = options

  const destroyRef = inject(DestroyRef)
  const host = inject(ElementRef).nativeElement as HTMLElement
  let mounted = false

  // This site's lane: the controller survives an argument change unless the
  // resetKey changed, exactly like React's formRef/formKey pair.
  const adopted = adoptLane<FormLane<T>>('useForm')
  const keep = adopted !== undefined && Object.is(adopted.resetKey, resetKey)
  const lane: FormLane<T> = keep
    ? (adopted as FormLane<T>)
    : {
        controller: createForm(formOptions),
        resetKey,
        lastExternalValues: null,
        mounted: false,
      }
  const form = lane.controller

  // The site's container, recorded once the host is attached (see captureSite).
  let site: Element | null = null
  captureSite(host, (captured) => {
    site = captured
  })

  destroyRef.onDestroy(() => {
    mounted = false
    lane.mounted = false
    parkLane('useForm', lane, site)
  })
  mounted = true
  lane.mounted = true

  // External content has its own history. A reset may change the controller
  // baseline without making an unchanged record external again.
  const values = options.values
  const keepDirtyValues = options.resetOptions?.keepDirtyValues !== false
  if (values === undefined) {
    lane.lastExternalValues = null
  } else if (
    lane.lastExternalValues === null ||
    lane.lastExternalValues.controller !== form ||
    !formValuesEqual(lane.lastExternalValues.values, values)
  ) {
    lane.lastExternalValues = { controller: form, values: snapshotFormValue(values) }
    form.updateValues(values, { keepDirtyValues })
  }

  const readState = (): FormState<T> => form.getState()
  const formState = useFormSnapshot(form, readState)

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

  const updateValues = (newValues: Partial<T>, resetOpts?: FormResetOptions): void =>
    form.updateValues(newValues, resetOpts)

  // The implementation is widened to `unknown` and the object literal's cast
  // restores the overloads, like the Vue and Svelte bindings: `edit`/`fill`
  // accept a superset of the tuple's declared call shapes.
  const asState = (name?: keyof T): readonly [unknown, unknown, unknown] => {
    const read = (): T | T[keyof T] =>
      name === undefined ? form.getState().values : form.getValue(name)
    const edit = (value: SetStateInput<T | T[keyof T]>): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => T | T[keyof T])(read())
          : value
      if (name !== undefined) {
        form.setValue(name as string, next as T[keyof T])
        return
      }
      const nextValues = next as T
      for (const field of Object.keys(
        Object.assign({}, form.getState().values, nextValues),
      ) as Extract<keyof T, string>[]) {
        if (!formValuesEqual(form.getValue(field), nextValues[field]))
          form.setValue(field, nextValues[field])
      }
    }
    const fill = (value: SetStateInput<T | T[keyof T]>): void => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | T[keyof T]) => T | T[keyof T])(read())
          : value
      form.updateValues(
        name === undefined ? (next as Partial<T>) : ({ [name]: next } as Partial<T>),
        { keepDirtyValues: true },
      )
    }
    const visible = name === undefined ? form.getState().values : form.getValue(name)
    return [visible, edit, fill] as const
  }

  const validate = (): Promise<boolean> => form.validate()

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) =>
    form.handleSubmit((values) => {
      if (mounted && lane.controller === form) return onSubmit(values)
    })

  return {
    formState,
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
 * @param form - Form controller.
 * @param name - Field name to watch.
 * @returns The current field value as a signal.
 */
export function useWatch<T extends FormValuesConstraint<T>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): Signal<T[K]> {
  return useFormSnapshot(form, () => form.getValue(name))
}

/**
 * Reads one field's state. Call it in an injection context.
 *
 * @param form - Form controller.
 * @param name - Field name.
 * @returns The field state as a signal.
 */
export function useFieldState<T extends FormValuesConstraint<T>>(
  form: FormController<T>,
  name: keyof T,
): Signal<FieldState<T[keyof T]>> {
  return useFormSnapshot(form, () => form.getFieldState(name))
}
