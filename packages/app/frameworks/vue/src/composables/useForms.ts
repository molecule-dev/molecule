/**
 * Vue composable for form handling.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  getCurrentScope,
  type MaybeRefOrGetter,
  onScopeDispose,
  type ShallowRef,
  shallowRef,
  toValue,
  triggerRef,
  watch,
} from 'vue'

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
  validate: () => Promise<boolean>

  // Form controller (for use with useWatch/useFieldState); follows a resetKey
  // change to the fresh controller.
  form: FormController<T>
}

/**
 * Composable for form state management.
 *
 * Creates its controller through the bonded forms provider, so a Vue app wires
 * a form library once (`setProvider` from `@molecule/app-forms`) and every
 * form picks it up. Passing `createForm` overrides that for one form.
 *
 * The options may be reactive (a ref or a getter) and are followed on the same
 * component, the way React re-renders `useForm`: the controller survives every
 * option change unless `resetKey` changes (a fresh form), `values` is applied
 * whenever its content differs, and fresh `defaultValues` without a new
 * `resetKey` never reset the drafts.
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
  options: MaybeRefOrGetter<UseFormOptions<T>> = {},
): UseFormReturn<T> {
  const initial = toValue(options)
  const { createForm = createBondedForm, resetKey, ...formOptions } = initial

  // The controller, kept across argument changes the way React keeps it in a
  // ref: recreated only when the resetKey changes.
  let form = createForm(formOptions)
  let currentResetKey = resetKey
  // The last external `values` applied, compared by content and per controller
  // (React's ref): a reset may change the controller baseline without making an
  // unchanged record external again, and a fresh controller re-applies.
  let lastExternal: { form: FormController<T>; values: Partial<T> } | null = null

  let mounted = true
  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
    })
  }

  // Subscribed state (the controller rebuilds its state object only on change).
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())
  const refresh = (): void => {
    state.value = form.getState()
  }
  let unsubscribe = form.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }

  // asState's [edit, fill] tuples per name, per controller: a fresh resetKey
  // starts fresh tuples, exactly like React's per-form memo.
  const stateTuples = new Map<
    keyof T | undefined,
    readonly [
      (value: T | T[keyof T] | ((previous: T | T[keyof T]) => T | T[keyof T])) => void,
      (
        value: Partial<T> | T[keyof T] | ((previous: T | T[keyof T]) => Partial<T> | T[keyof T]),
      ) => void,
    ]
  >()

  const applyExternalValues = (current: UseFormOptions<T>): void => {
    const keepDirtyValues = current.resetOptions?.keepDirtyValues !== false
    const values = current.values
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
    form.updateValues(values, { keepDirtyValues })
  }
  applyExternalValues(initial)

  // New options reach the form the way React's re-render does: a changed
  // resetKey starts a fresh controller, and changed external values are
  // applied by content. Everything else (a fresh options object with the same
  // content, new defaultValues without a resetKey) leaves the form alone.
  watch(
    () => toValue(options),
    (next) => {
      if (!Object.is(currentResetKey, next.resetKey)) {
        currentResetKey = next.resetKey
        unsubscribe()
        const { createForm: recreate = createBondedForm, resetKey: _key, ...nextFormOptions } = next
        form = recreate(nextFormOptions)
        stateTuples.clear()
        unsubscribe = form.subscribe(refresh)
        refresh()
      }
      applyExternalValues(next)
    },
    { deep: true },
  )

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

  // The controller keys fields by name string; `keyof T` may also be a number
  // or symbol for a values type that is not an interface of named fields.
  const fieldName = (name: keyof T): string => (typeof name === 'string' ? name : String(name))

  const getValue = <K extends keyof T>(name: K): T[K] => form.getValue(name)

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    form.setValue(fieldName(name), value)
  }

  const getError = (name: keyof T): string | undefined => form.getError(fieldName(name))

  const setError = (name: keyof T, error: string | undefined): void => {
    if (error !== undefined) {
      form.setError(fieldName(name), error)
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
    const visible = name === undefined ? state.value.values : state.value.values[name]
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
    // The controller this runner was created for: React blocks a submit whose
    // controller a resetKey change has since replaced.
    const activeForm = form
    return activeForm.handleSubmit((values) => {
      if (mounted && form === activeForm) return onSubmit(values)
    }, onError)
  }

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
    get form(): FormController<T> {
      // A live view: a resetKey change replaces the controller, and this
      // property must follow it (useWatch/useFieldState read it later).
      return form
    },
  }
}

/**
 * Composable to watch a specific field value.
 *
 * The controller and the field name may be reactive (a ref or a getter): a
 * change resubscribes to the new controller and reads the new field on the same
 * component, the way React follows a hook's new arguments on a re-render.
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
  form: MaybeRefOrGetter<FormController<T>>,
  name: MaybeRefOrGetter<K>,
): ComputedRef<T[K]> {
  let activeForm = toValue(form)
  let activeName = toValue(name)
  const state: ShallowRef<FormState<T>> = shallowRef(activeForm.getState())

  const refresh = (): void => {
    state.value = activeForm.getState()
  }
  let unsubscribe = activeForm.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }
  watch([() => toValue(form), () => toValue(name)], ([nextForm, nextName]) => {
    if (nextForm !== activeForm) {
      unsubscribe()
      activeForm = nextForm
      unsubscribe = nextForm.subscribe(refresh)
    }
    activeName = nextName
    refresh()
    // The watched value is read through the closure's field name, so adopting a
    // new name must re-evaluate the computed even when the state object is the
    // one it already holds.
    triggerRef(state)
  })

  return computed(() => state.value.values[activeName])
}

/**
 * Composable to get field-level state.
 *
 * The controller and the field name may be reactive (a ref or a getter): a
 * change resubscribes to the new controller and reads the new field on the same
 * component, the way React follows a hook's new arguments on a re-render.
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
  form: MaybeRefOrGetter<FormController<T>>,
  name: MaybeRefOrGetter<keyof T>,
): ComputedRef<FieldState<T[keyof T]>> {
  const activeForm = shallowRef<FormController<T>>(toValue(form))
  const activeName = shallowRef<keyof T>(toValue(name))
  const state: ShallowRef<FieldState<T[keyof T]>> = shallowRef(
    activeForm.value.getFieldState(activeName.value),
  )

  const refresh = (): void => {
    state.value = activeForm.value.getFieldState(activeName.value)
  }
  let unsubscribe = activeForm.value.subscribe(refresh)
  refresh()
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe()
    })
  }
  watch([() => toValue(form), () => toValue(name)], ([nextForm, nextName]) => {
    if (nextForm !== activeForm.value) {
      unsubscribe()
      activeForm.value = nextForm
      unsubscribe = nextForm.subscribe(refresh)
    }
    activeName.value = nextName
    refresh()
  })

  return computed(() => state.value)
}
