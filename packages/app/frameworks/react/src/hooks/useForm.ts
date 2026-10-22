/**
 * React hook for form handling.
 *
 * @module
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormState,
  RegisterOptions,
} from '@molecule/app-forms'
import { createForm as createBondedForm } from '@molecule/app-forms'

/**
 * Adapt controller notifications to React's stable snapshot contract. Providers
 * may return fresh objects from their getters; reads between notifications must
 * still return the same snapshot to useSyncExternalStore.
 *
 * @param form - Controller that owns the subscription.
 * @param read - Reads the form state or a selected field.
 * @returns The current subscribed snapshot.
 */
function useFormSnapshot<T extends Record<string, unknown>, S>(
  form: FormController<T>,
  read: () => S,
): S {
  const store = useMemo(() => {
    let snapshot = read()
    return {
      getSnapshot: () => snapshot,
      subscribe: (onChange: () => void) => {
        const refresh = (): void => {
          snapshot = read()
          onChange()
        }
        const unsubscribe = form.subscribe(refresh)
        // A controller can change after render but before React subscribes.
        refresh()
        return unsubscribe
      },
    }
  }, [form, read])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

/**
 * Options for useForm hook.
 *
 * Every `FormOptions` field is supported. `createForm` is only an override —
 * omit it and the hook creates the controller through the bonded forms
 * provider (`createForm` from `@molecule/app-forms`), which uses the built-in
 * native provider until the app bonds its own.
 */
export interface UseFormOptions<T extends Record<string, unknown>> extends FormOptions<T> {
  /**
   * Explicit form factory for this one form. Defaults to the bonded forms
   * provider; pass it only to pin a specific provider instance.
   */
  createForm?: (options: FormOptions<T>) => FormController<T>
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
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (event?: React.FormEvent) => void
  reset: (values?: Partial<T>) => void
  validate: () => Promise<boolean>
}

/**
 * Hook for form state management.
 *
 * Creates its controller through the bonded forms provider, so a React app
 * wires a form library once (`setProvider` from `@molecule/app-forms`) and
 * every form picks it up. Passing `createForm` overrides that for one form.
 *
 * @param options - Form options. `defaultValues`, `mode` and the form-level
 * `validate` are forwarded to the provider; omit the options entirely for a
 * form whose fields are registered with their own defaults.
 * @returns Form state and methods
 *
 * @example
 * ```tsx
 * import { useForm } from '@molecule/app-react'
 *
 * function LoginForm() {
 *   const { register, handleSubmit, formState, isSubmitting } = useForm({
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
  options: UseFormOptions<T> = {},
): UseFormResult<T> {
  const { createForm = createBondedForm, ...formOptions } = options

  // Create form controller once
  const formRef = useRef<FormController<T> | null>(null)
  if (!formRef.current) {
    formRef.current = createForm(formOptions)
  }
  const form = formRef.current

  const readState = useCallback(() => form.getState(), [form])
  const formState = useFormSnapshot(form, readState)

  // Memoized methods
  const register = useCallback(
    (name: keyof T, registerOptions?: Omit<RegisterOptions, 'name'> & { name?: string }) => {
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
  const readValue = useCallback(() => form.getValue(name), [form, name])
  return useFormSnapshot(form, readValue)
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
  const readField = useCallback(() => form.getFieldState(name), [form, name])
  return useFormSnapshot(form, readField)
}
