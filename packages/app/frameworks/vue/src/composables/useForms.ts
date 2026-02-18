/**
 * Vue composable for form handling.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  onMounted,
  onUnmounted,
  type ShallowRef,
  shallowRef,
} from 'vue'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormState,
  RegisterOptions,
} from '@molecule/app-forms'

/**
 * Options for useForm composable.
 */
export interface UseFormOptions<T extends Record<string, unknown>> extends FormOptions<T> {
  /**
   * Form provider's createForm function.
   */
  createForm: (options: FormOptions<T>) => FormController<T>
}

/**
 * Return type for useForm composable.
 */
export interface UseFormReturn<T extends Record<string, unknown>> {
  // State
  formState: ComputedRef<FormState<T>>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  isSubmitting: ComputedRef<boolean>

  // Field methods
  register: (name: keyof T, options?: RegisterOptions) => FieldRegistration
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
  validate: () => Promise<boolean>

  // Form controller (for use with useWatch/useFieldState)
  form: FormController<T>
}

/**
 * Composable for form state management.
 *
 * @param options - Form options including createForm from a forms provider
 * @returns Form state, computed properties, and methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useForm } from '`@molecule/app-vue`'
 * import { createForm } from '`@molecule/app-forms-native`'
 *
 * const {
 *   register,
 *   handleSubmit,
 *   formState,
 *   isSubmitting,
 * } = useForm({
 *   createForm,
 *   defaultValues: { email: '', password: '' },
 * })
 *
 * const onSubmit = handleSubmit(async (values) => {
 *   await login(values)
 * })
 * </script>
 *
 * <template>
 *   <form @submit.prevent="onSubmit">
 *     <input v-bind="register('email', { required: true, email: true })" />
 *     <span v-if="formState.errors.email">{{ formState.errors.email }}</span>
 *
 *     <input v-bind="register('password', { required: true, minLength: 8 })" type="password" />
 *     <span v-if="formState.errors.password">{{ formState.errors.password }}</span>
 *
 *     <button type="submit" :disabled="isSubmitting">
 *       {{ isSubmitting ? 'Logging in...' : 'Log In' }}
 *     </button>
 *   </form>
 * </template>
 * ```
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>,
): UseFormReturn<T> {
  const { createForm, ...formOptions } = options

  // Create form controller once (not reactive itself, just a controller instance)
  const form = createForm(formOptions)

  // Reactive state (shallowRef avoids Vue's UnwrapRef issues with generic FormState<T>)
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())

  // Subscribe to form state changes
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = form.subscribe(() => {
      state.value = form.getState()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    form.destroy()
  })

  // Computed properties
  const formState = computed(() => state.value)
  const isValid = computed(() => state.value.isValid)
  const isDirty = computed(() => state.value.isDirty)
  const isSubmitting = computed(() => state.value.isSubmitting)

  // Field methods
  const register = (name: keyof T, registerOptions?: RegisterOptions): FieldRegistration => {
    return form.register({ ...registerOptions, name: name as string } as RegisterOptions)
  }

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

  // Form methods
  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    return form.handleSubmit(onSubmit, onError)
  }

  const reset = (values?: Partial<T>): void => form.reset(values)

  const validate = (): Promise<boolean> => form.validate()

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
 * import { useForm, useWatch } from '`@molecule/app-vue`'
 *
 * const { form, register } = useForm({
 *   createForm,
 *   defaultValues: { country: '', city: '' },
 * })
 *
 * const country = useWatch(form, 'country')
 * // country.value updates reactively when the field changes
 * </script>
 * ```
 */
export function useWatch<T extends Record<string, unknown>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): ComputedRef<T[K]> {
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = form.subscribe(() => {
      state.value = form.getState()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

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
 * import { useForm, useFieldState } from '`@molecule/app-vue`'
 *
 * const { form, register } = useForm({
 *   createForm,
 *   defaultValues: { email: '' },
 * })
 *
 * const emailState = useFieldState(form, 'email')
 * // emailState.value.touched, emailState.value.error, etc.
 * </script>
 * ```
 */
export function useFieldState<T extends Record<string, unknown>>(
  form: FormController<T>,
  name: keyof T,
): ComputedRef<FieldState<T[keyof T]>> {
  const state: ShallowRef<FormState<T>> = shallowRef(form.getState())

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = form.subscribe(() => {
      state.value = form.getState()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return computed(() => ({
    value: state.value.values[name],
    error: state.value.errors[name] as string | undefined,
    touched: state.value.touched[name] ?? false,
    dirty: state.value.values[name] !== undefined,
    valid: !state.value.errors[name],
    validating: false,
  }))
}
