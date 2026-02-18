/**
 * Solid.js primitives for form handling.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormState,
  RegisterOptions,
} from '@molecule/app-forms'

/**
 * Result of createForm primitive.
 */
export interface CreateFormResult<T extends Record<string, unknown>> {
  /** Reactive form state accessor. */
  formState: Accessor<FormState<T>>

  /** Whether the form is currently valid. */
  isValid: Accessor<boolean>

  /** Whether any field has been modified. */
  isDirty: Accessor<boolean>

  /** Whether the form is currently submitting. */
  isSubmitting: Accessor<boolean>

  /** Current field errors. */
  errors: Accessor<Partial<Record<keyof T, string>>>

  /** Register a field for form management. */
  register: (name: keyof T, options?: RegisterOptions) => FieldRegistration

  /** Get the current value of a field. */
  getValue: <K extends keyof T>(name: K) => T[K]

  /** Set the value of a field. */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void

  /** Get the error message for a field. */
  getError: (name: keyof T) => string | undefined

  /** Set an error message for a field. */
  setError: (name: keyof T, error: string | undefined) => void

  /** Clear all field errors. */
  clearErrors: () => void

  /** Create a submit handler function. */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>

  /** Reset the form to initial or provided values. */
  reset: (values?: Partial<T>) => void

  /** Validate all fields. */
  validate: () => Promise<boolean>

  /** The raw FormController instance for advanced use. */
  controller: FormController<T>
}

/**
 * Create form primitives for form state management and validation.
 *
 * @param provider - Form provider that creates controllers
 * @param options - Form configuration options
 * @returns Form primitives object
 *
 * @example
 * ```tsx
 * import { createForm } from '`@molecule/app-solid`'
 * import { createNativeFormProvider } from '`@molecule/app-forms-native`'
 *
 * const provider = createNativeFormProvider()
 *
 * function LoginForm() {
 *   const { register, handleSubmit, formState, isSubmitting, errors } = createForm(provider, {
 *     defaultValues: { email: '', password: '' },
 *   })
 *
 *   const onSubmit = async (values: { email: string; password: string }) => {
 *     await login(values)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <input {...register('email', { required: true, email: true })} />
 *       <Show when={errors().email}>
 *         <span>{errors().email}</span>
 *       </Show>
 *
 *       <input {...register('password', { required: true, minLength: 8 })} type="password" />
 *       <Show when={errors().password}>
 *         <span>{errors().password}</span>
 *       </Show>
 *
 *       <button type="submit" disabled={isSubmitting()}>
 *         {isSubmitting() ? 'Logging in...' : 'Log In'}
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 */
export function createForm<T extends Record<string, unknown>>(
  provider: FormProvider,
  options: FormOptions<T>,
): CreateFormResult<T> {
  const controller = provider.createForm<T>(options)

  const [formState, setFormState] = createSignal<FormState<T>>(controller.getState())

  // Subscribe to form state changes
  createEffect(() => {
    const unsubscribe = controller.subscribe((newState: FormState<T>) => {
      setFormState(newState)
    })

    onCleanup(() => {
      unsubscribe()
      controller.destroy()
    })
  })

  // Derived accessors
  const isValid: Accessor<boolean> = () => formState().isValid
  const isDirty: Accessor<boolean> = () => formState().isDirty
  const isSubmitting: Accessor<boolean> = () => formState().isSubmitting
  const errors: Accessor<Partial<Record<keyof T, string>>> = () => formState().errors

  const register = (name: keyof T, registerOptions?: RegisterOptions): FieldRegistration => {
    return controller.register({ ...registerOptions, name: name as string } as RegisterOptions)
  }

  const getValue = <K extends keyof T>(name: K): T[K] => {
    return controller.getValue(name)
  }

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller.setValue(name as any, value as any)
  }

  const getError = <K extends keyof T>(name: K): string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return controller.getError(name as any)
  }

  const setError = <K extends keyof T>(name: K, error: string | undefined): void => {
    if (error !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      controller.setError(name as any, error)
    } else {
      controller.clearError(name)
    }
  }

  const clearErrors = (): void => {
    controller.clearErrors()
  }

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    return controller.handleSubmit(onSubmit)
  }

  const reset = (values?: Partial<T>): void => {
    controller.reset(values)
  }

  const validate = (): Promise<boolean> => {
    return controller.validate()
  }

  return {
    formState,
    isValid,
    isDirty,
    isSubmitting,
    errors,
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    validate,
    controller,
  }
}

/**
 * Create a reactive accessor for a single field's state.
 *
 * @param controller - Form controller
 * @param name - Field name to track
 * @returns Accessor for the field state
 *
 * @example
 * ```tsx
 * function EmailField(props: { controller: FormController<LoginValues> }) {
 *   const fieldState = createFieldSignal(props.controller, 'email')
 *
 *   return (
 *     <div>
 *       <input value={fieldState().value as string} />
 *       <Show when={fieldState().error}>
 *         <span class="error">{fieldState().error}</span>
 *       </Show>
 *       <Show when={fieldState().touched && !fieldState().valid}>
 *         <span class="invalid">Invalid</span>
 *       </Show>
 *     </div>
 *   )
 * }
 * ```
 */
export function createFieldSignal<T extends Record<string, unknown>>(
  controller: FormController<T>,
  name: keyof T,
): Accessor<FieldState<T[keyof T]>> {
  const [fieldState, setFieldState] = createSignal<FieldState<T[keyof T]>>(
    controller.getFieldState(name) as FieldState<T[keyof T]>,
  )

  createEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setFieldState(controller.getFieldState(name))
    })

    onCleanup(unsubscribe)
  })

  return fieldState
}

/**
 * Create a reactive accessor that tracks a single field's value.
 *
 * @param controller - Form controller
 * @param name - Field name to watch
 * @returns Accessor for the field value
 *
 * @example
 * ```tsx
 * function PasswordStrength(props: { controller: FormController<SignUpValues> }) {
 *   const password = createWatchSignal(props.controller, 'password')
 *
 *   const strength = () => {
 *     const val = password()
 *     if (!val || (val as string).length < 4) return 'weak'
 *     if ((val as string).length < 8) return 'medium'
 *     return 'strong'
 *   }
 *
 *   return <div class={`strength-${strength()}`}>Password: {strength()}</div>
 * }
 * ```
 */
export function createWatchSignal<T extends Record<string, unknown>, K extends keyof T>(
  controller: FormController<T>,
  name: K,
): Accessor<T[K]> {
  const [value, setValue] = createSignal<T[K]>(controller.getValue(name))

  createEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setValue(() => controller.getValue(name))
    })

    onCleanup(unsubscribe)
  })

  return value
}

/**
 * Create form helpers bound to a specific form provider.
 *
 * Returns a factory object so you can create multiple forms from the same provider
 * without passing it each time.
 *
 * @param provider - Form provider
 * @returns Object with a bound createForm function
 *
 * @example
 * ```tsx
 * import { createFormHelpers } from '`@molecule/app-solid`'
 * import { createNativeFormProvider } from '`@molecule/app-forms-native`'
 *
 * const { createForm } = createFormHelpers(createNativeFormProvider())
 *
 * function LoginForm() {
 *   const { register, handleSubmit, isSubmitting } = createForm({
 *     defaultValues: { email: '', password: '' },
 *   })
 *
 *   // ...
 * }
 * ```
 */

/**
 * Creates a form helpers.
 * @param provider - The provider implementation.
 * @returns The created result.
 */
export function createFormHelpers(provider: FormProvider): {
  createForm: <T extends Record<string, unknown>>(options: FormOptions<T>) => CreateFormResult<T>
} {
  return {
    createForm: <T extends Record<string, unknown>>(options: FormOptions<T>): CreateFormResult<T> =>
      createForm(provider, options),
  }
}

/**
 * Create form primitives from an existing controller.
 *
 * Useful when you have a controller created externally and want to
 * wrap it with Solid reactivity.
 *
 * @param controller - An existing FormController
 * @returns Form primitives object
 *
 * @example
 * ```tsx
 * const controller = provider.createForm({ defaultValues: { name: '' } })
 *
 * function NameForm() {
 *   const { formState, register, handleSubmit } = createFormFromController(controller)
 *   // ...
 * }
 * ```
 */
export function createFormFromController<T extends Record<string, unknown>>(
  controller: FormController<T>,
): CreateFormResult<T> {
  const [formState, setFormState] = createSignal<FormState<T>>(controller.getState())

  createEffect(() => {
    const unsubscribe = controller.subscribe((newState: FormState<T>) => {
      setFormState(newState)
    })

    onCleanup(unsubscribe)
  })

  const isValid: Accessor<boolean> = () => formState().isValid
  const isDirty: Accessor<boolean> = () => formState().isDirty
  const isSubmitting: Accessor<boolean> = () => formState().isSubmitting
  const errors: Accessor<Partial<Record<keyof T, string>>> = () => formState().errors

  const register = (name: keyof T, registerOptions?: RegisterOptions): FieldRegistration => {
    return controller.register({ ...registerOptions, name: name as string } as RegisterOptions)
  }

  const getValue = <K extends keyof T>(name: K): T[K] => {
    return controller.getValue(name)
  }

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller.setValue(name as any, value as any)
  }

  const getError = <K extends keyof T>(name: K): string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return controller.getError(name as any)
  }

  const setError = <K extends keyof T>(name: K, error: string | undefined): void => {
    if (error !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      controller.setError(name as any, error)
    } else {
      controller.clearError(name)
    }
  }

  const clearErrors = (): void => {
    controller.clearErrors()
  }

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    return controller.handleSubmit(onSubmit)
  }

  const reset = (values?: Partial<T>): void => {
    controller.reset(values)
  }

  const validate = (): Promise<boolean> => {
    return controller.validate()
  }

  return {
    formState,
    isValid,
    isDirty,
    isSubmitting,
    errors,
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    validate,
    controller,
  }
}
