/**
 * Vue composable for form handling.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  getCurrentInstance,
  getCurrentScope,
  onScopeDispose,
  type ShallowRef,
  shallowRef,
  watch,
} from 'vue'

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

import { adoptContinuity, type ContinuityState, offerContinuity } from './host-continuity.js'

/**
 * What one host slot owns across the mounts a host makes of this composable
 * (a host that swaps the arguments re-mounts the composable; React kept the
 * controller, the external-values history and the asState tuples on the
 * re-rendered instance). A changed `resetKey` starts a fresh controller, which
 * is a fresh lane.
 */
interface FormLane<T extends FormValuesConstraint<T>> extends ContinuityState {
  /** The controller created by the slot's first mount. */
  form: FormController<T>
  /** The resetKey the controller was created for. */
  resetKey: string | number | boolean | bigint | null | undefined
  /** The last external `values` applied, compared by content (React's ref). */
  lastExternal: { values: Partial<T> } | null
  /** asState's [edit, fill] tuples per name, per controller. */
  stateTuples: Map<keyof T | undefined, readonly [unknown, unknown]>
}

/**
 * Options for useForm composable.
 *
 * Every `FormOptions` field is supported. `createForm` is only an override —
 * omit it and the composable creates the controller through the bonded forms
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
 * Return type for useForm composable.
 */
export interface UseFormReturn<T extends FormValuesConstraint<T>> {
  // State
  formState: ComputedRef<FormState<T>>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  isSubmitting: ComputedRef<boolean>

  // Field methods
  register: (
    name: keyof T,
    options?: Omit<RegisterOptions, 'name'> & { name?: string },
  ) => FieldRegistration
  getValue: <K extends keyof T>(name: K) => T[K]
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  getError: (name: keyof T) => string | undefined
  setError: (name: keyof T, error: string | undefined) => void
  clearErrors: () => void

  // Form methods
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>
  reset: (values?: Partial<T>) => void
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
  validate: () => Promise<boolean>

  // Form controller (for use with useWatch/useFieldState)
  form: FormController<T>
}

/**
 * Composable for form state management.
 *
 * Creates its controller through the bonded forms provider, so a Vue app wires
 * a form library once (`setProvider` from `@molecule/app-forms`) and every
 * form picks it up. Passing `createForm` overrides that for one form.
 *
 * @param options - Form options. `defaultValues`, `mode` and the form-level
 * `validate` are forwarded to the provider. When `values` changes by content,
 * it becomes the new baseline; `resetOptions.keepDirtyValues` retains edited
 * fields while pristine fields take the loaded values. Omit the options entirely
 * for a form whose fields are registered with their own defaults.
 * @returns Form state and methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useForm } from '@molecule/app-vue'
 *
 * const { register, handleSubmit, formState, isSubmitting } = useForm({
 *   defaultValues: { email: '', password: '' },
 * })
 * const onSubmit = handleSubmit(async (values) => {
 *   await login(values)
 * })
 * </script>
 *
 * <template>
 *   <form @submit.prevent="onSubmit">
 *     <input v-bind="register('email', { required: true, email: true })" />
 *     <span v-if="formState.errors.email">{{ formState.errors.email }}</span>
 *     <button type="submit" :disabled="isSubmitting">
 *       {{ isSubmitting ? 'Logging in...' : 'Log In' }}
 *     </button>
 *   </form>
 * </template>
 * ```
 */
export function useForm<T extends FormValuesConstraint<T> = Record<string, unknown>>(
  options: UseFormOptions<T> = {},
): UseFormReturn<T> {
  const { createForm = createBondedForm, resetKey, ...formOptions } = options

  // The app identity keys continuity: a host re-mounting the composable with
  // new arguments adopts the previous controller (when the resetKey did not
  // change), exactly what React's re-rendered instance kept.
  const app = getCurrentInstance()?.appContext.app
  const adopted = adoptContinuity<FormLane<T>>(app)
  const sameForm = adopted !== null && Object.is(adopted.resetKey, resetKey)
  const form = sameForm ? adopted.form : createForm(formOptions)
  const lane: FormLane<T> = sameForm
    ? adopted
    : { dead: false, form, resetKey, lastExternal: null, stateTuples: new Map() }
  lane.resetKey = resetKey

  let mounted = true
  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
      // The lane lives until the tick ends (a replacing mount adopts it); a
      // real unmount marks it dead. The controller itself stays as React
      // leaves it: subscribed-to-nothing, never destroyed mid-flight.
      offerContinuity(lane, app)
    })
  }

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
  watch(
    () => options.values,
    () => applyExternalValues(),
    { deep: true },
  )

  // Subscribed state (the controller rebuilds its state object only on change).
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())
  const refresh = (): void => {
    state.value = form.getState()
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  // Computed properties
  const formState = computed(() => state.value)
  const isValid = computed(() => state.value.isValid)
  const isDirty = computed(() => state.value.isDirty)
  const isSubmitting = computed(() => state.value.isSubmitting)

  // Field methods
  const register = (
    name: keyof T,
    registerOptions?: Omit<RegisterOptions, 'name'> & { name?: string },
  ): FieldRegistration =>
    form.register({ ...registerOptions, name: name as string } as RegisterOptions)

  const getValue = <K extends keyof T>(name: K): T[K] => form.getValue(name)

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue(name as any, value as any)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getError = (name: keyof T): string | undefined => form.getError(name as any)

  const setError = (name: keyof T, error: string | undefined): void => {
    if (error !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setError(name as any, error)
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
    const visible = name === undefined ? state.value.values : state.value.values[name]
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
      if (mounted) return onSubmit(values)
    }, onError)

  return {
    formState,
    isValid,
    isDirty,
    isSubmitting,
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    updateValues,
    asState: asState as UseFormReturn<T>['asState'],
    validate,
    form,
  }
}

/**
 * Composable to watch a specific field value.
 *
 * @param form - Form controller (from useForm().form)
 * @param name - Field name to watch
 * @returns Computed reference to the field value
 *
 * @example
 * ```vue
 * <script setup>
 * import { useForm, useWatch } from '@molecule/app-vue'
 *
 * const { form, register } = useForm({
 *   defaultValues: { country: '', city: '' },
 * })
 *
 * const country = useWatch(form, 'country')
 * // country.value updates reactively when the field changes
 * </script>
 * ```
 */
export function useWatch<T extends FormValuesConstraint<T>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): ComputedRef<T[K]> {
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())

  const refresh = (): void => {
    state.value = form.getState()
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  return computed(() => state.value.values[name])
}

/**
 * Composable to get field-level state.
 *
 * @param form - Form controller (from useForm().form)
 * @param name - Field name
 * @returns Computed field state (value, error, touched, dirty, valid, validating)
 *
 * @example
 * ```vue
 * <script setup>
 * import { useForm, useFieldState } from '@molecule/app-vue'
 *
 * const { form, register } = useForm({
 *   defaultValues: { email: '' },
 * })
 *
 * const emailState = useFieldState(form, 'email')
 * // emailState.value.touched, emailState.value.error, etc.
 * </script>
 * ```
 */
export function useFieldState<T extends FormValuesConstraint<T>>(
  form: FormController<T>,
  name: keyof T,
): ComputedRef<FieldState<T[keyof T]>> {
  const state: ShallowRef<FieldState<T[keyof T]>> = shallowRef(form.getFieldState(name))

  const refresh = (): void => {
    state.value = form.getFieldState(name)
  }
  const unsubscribe = form.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  return computed(() => state.value)
}
