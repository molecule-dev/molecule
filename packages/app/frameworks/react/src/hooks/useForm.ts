/**
 * React hook for form handling.
 *
 * @module
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormState,
  RegisterOptions,
} from '@molecule/app-forms'

/**
 * Options for useForm hook.
 */
export interface UseFormOptions<T extends Record<string, unknown>> extends FormOptions<T> {
  /**
   * Form provider's createForm function.
   */
  createForm: (options: FormOptions<T>) => FormController<T>
}

/**
 * Result of useForm hook.
 */
export interface UseFormResult<T extends Record<string, unknown>> {
  // State
  formState: FormState<T>
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean

  // Field methods
  register: (name: keyof T, options?: RegisterOptions) => FieldRegistration
  getValue: <K extends keyof T>(name: K) => T[K]
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  getError: (name: keyof T) => string | undefined
  setError: (name: keyof T, error: string | undefined) => void
  clearErrors: () => void

  // Form methods
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (event?: React.FormEvent) => void
  reset: (values?: Partial<T>) => void
  validate: () => Promise<boolean>
}

/**
 * Hook for form state management.
 *
 * @param options - Form options including createForm from a forms provider
 * @returns Form state and methods
 *
 * @example
 * ```tsx
 * import { createForm } from '`@molecule/app-forms-native`'
 *
 * function LoginForm() {
 *   const { register, handleSubmit, formState, isSubmitting } = useForm({
 *     createForm,
 *     defaultValues: { email: '', password: '' },
 *   })
 *
 *   const onSubmit = async (values: LoginValues) => {
 *     await login(values)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <input {...register('email', { required: true, email: true })} />
 *       {formState.errors.email && <span>{formState.errors.email}</span>}
 *
 *       <input {...register('password', { required: true, minLength: 8 })} type="password" />
 *       {formState.errors.password && <span>{formState.errors.password}</span>}
 *
 *       <button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? 'Logging in...' : 'Log In'}
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>,
): UseFormResult<T> {
  const { createForm, ...formOptions } = options

  // Create form controller once
  const formRef = useRef<FormController<T> | null>(null)
  if (!formRef.current) {
    formRef.current = createForm(formOptions)
  }
  const form = formRef.current

  // Subscribe to form state changes
  const getSnapshot = useCallback(() => form.getState(), [form])

  const subscribe = useCallback(
    (onChange: () => void) => {
      // The form controller should have a subscribe method
      // If not available, we'll use a polling approach
      if ('subscribe' in form && typeof form.subscribe === 'function') {
        return (form as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(
          onChange,
        )
      }
      // Fallback: no-op unsubscribe (state won't auto-update)
      return () => {}
    },
    [form],
  )

  const formState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Memoized methods
  const register = useCallback(
    (name: keyof T, registerOptions?: RegisterOptions) => {
      return form.register({ ...registerOptions, name: name as string } as RegisterOptions)
    },
    [form],
  )

  const getValue = useCallback(<K extends keyof T>(name: K) => form.getValue(name), [form])

  const setValue = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <K extends keyof T>(name: K, value: T[K]) => form.setValue(name as any, value as any),
    [form],
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getError = useCallback((name: keyof T) => form.getError(name as any), [form])

  const setError = useCallback(
    (name: keyof T, error: string | undefined) => {
      if (error !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.setError(name as any, error)
      } else {
        form.clearError(name)
      }
    },
    [form],
  )

  const clearErrors = useCallback(() => form.clearErrors(), [form])

  const reset = useCallback((values?: Partial<T>) => form.reset(values), [form])

  const validate = useCallback(() => form.validate(), [form])

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return form.handleSubmit(onSubmit)
    },
    [form],
  )

  return {
    formState,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    isSubmitting: formState.isSubmitting,
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    validate,
  }
}

/**
 * Hook to watch a specific field value.
 *
 * @param form - Form controller
 * @param name - Field name to watch
 * @returns Current field value
 */
export function useWatch<T extends Record<string, unknown>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): T[K] {
  const getSnapshot = useCallback(() => form.getValue(name), [form, name])

  const subscribe = useCallback(
    (onChange: () => void) => {
      if ('subscribe' in form && typeof form.subscribe === 'function') {
        return (form as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(
          onChange,
        )
      }
      return () => {}
    },
    [form],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get field-level state.
 *
 * @param form - Form controller
 * @param name - Field name
 * @returns Field state (value, error, touched, dirty, valid)
 */
export function useFieldState<T extends Record<string, unknown>>(
  form: FormController<T>,
  name: keyof T,
): FieldState<T[keyof T]> {
  const getSnapshot = useCallback(() => {
    const state = form.getState()
    return {
      value: state.values[name],
      error: state.errors[name] as string | undefined,
      touched: state.touched[name] ?? false,
      dirty: state.values[name] !== undefined,
      valid: !state.errors[name],
      validating: false,
    }
  }, [form, name])

  const subscribe = useCallback(
    (onChange: () => void) => {
      if ('subscribe' in form && typeof form.subscribe === 'function') {
        return (form as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(
          onChange,
        )
      }
      return () => {}
    },
    [form],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
