/**
 * Svelte stores for form management.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

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
 * Form stores and actions return type.
 */
interface FormStores<T extends Record<string, unknown>> {
  formState: Readable<FormState<T>>
  isValid: Readable<boolean>
  isDirty: Readable<boolean>
  isSubmitting: Readable<boolean>
  errors: Readable<Partial<Record<keyof T, string>>>
  register: (name: string | RegisterOptions, registerOptions?: RegisterOptions) => FieldRegistration
  getValue: <K extends keyof T>(name: K) => T[K]
  setValue: <K extends keyof T>(
    name: K,
    value: T[K],
    opts?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean },
  ) => void
  getError: <K extends keyof T>(name: K) => string | undefined
  setError: <K extends keyof T>(name: K, error: string | undefined) => void
  clearErrors: () => void
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>
  reset: (values?: Partial<T>) => void
  validate: () => Promise<boolean>
  destroy: () => void
  controller: FormController<T>
}

/**
 * Create form stores from a form provider and options.
 *
 * @param provider - Form provider instance
 * @param options - Form creation options
 * @returns Form stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormStores } from '`@molecule/app-svelte`'
 *   import { nativeProvider } from '`@molecule/app-forms`'
 *
 *   const {
 *     formState, isValid, isDirty, isSubmitting, errors,
 *     register, setValue, handleSubmit, reset
 *   } = createFormStores(nativeProvider, {
 *     defaultValues: { name: '', email: '' },
 *     mode: 'onChange',
 *   })
 *
 *   const nameField = register('name', { required: true })
 *   const emailField = register('email', { required: true, email: true })
 *
 *   const onSubmit = handleSubmit(async (values) => {
 *     console.log('Submitted:', values)
 *   })
 * </script>
 *
 * <form on:submit|preventDefault={onSubmit}>
 *   <input {...nameField} />
 *   {#if $errors.name}<span>{$errors.name}</span>{/if}
 *
 *   <input {...emailField} />
 *   {#if $errors.email}<span>{$errors.email}</span>{/if}
 *
 *   <button type="submit" disabled={!$isValid || $isSubmitting}>Submit</button>
 * </form>
 * ```
 */
export function createFormStores<T extends Record<string, unknown>>(
  provider: FormProvider,
  options: FormOptions<T>,
): FormStores<T> {
  const controller = provider.createForm<T>(options)

  // Main form state store
  const formState: Readable<FormState<T>> = readable(
    controller.getState(),
    (set: (value: FormState<T>) => void) => {
      return controller.subscribe((state: FormState<T>) => {
        set(state)
      })
    },
  )

  // Derived stores
  const isValid = derived(formState, ($state: FormState<T>) => $state.isValid)
  const isDirty = derived(formState, ($state: FormState<T>) => $state.isDirty)
  const isSubmitting = derived(formState, ($state: FormState<T>) => $state.isSubmitting)
  const errors = derived(formState, ($state: FormState<T>) => $state.errors)

  // Actions (plain functions, not stores)
  const register = (
    name: string | RegisterOptions,
    registerOptions?: RegisterOptions,
  ): FieldRegistration => {
    if (typeof name === 'string') {
      return controller.register({ ...registerOptions, name } as RegisterOptions)
    }
    return controller.register(name)
  }

  const getValue = <K extends keyof T>(name: K): T[K] => {
    return controller.getValue(name)
  }

  const setValue = <K extends keyof T>(
    name: K,
    value: T[K],
    opts?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean },
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    controller.setValue(name as any, value as any, opts)
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
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): ((event?: { preventDefault?: () => void }) => Promise<void>) => {
    return controller.handleSubmit(onSubmit, onError)
  }

  const reset = (values?: Partial<T>): void => {
    controller.reset(values)
  }

  const validate = (): Promise<boolean> => {
    return controller.validate()
  }

  const destroy = (): void => {
    controller.destroy()
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
    destroy,
    /** The underlying controller, for advanced use or passing to createFieldStore/createWatchStore. */
    controller,
  }
}

/**
 * Create a readable store that tracks a single field's state.
 *
 * @param controller - Form controller
 * @param name - Field name to track
 * @returns Readable store of the field state
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormStores, createFieldStore } from '`@molecule/app-svelte`'
 *
 *   const { controller } = createFormStores(provider, { defaultValues: { email: '' } })
 *   const emailField = createFieldStore(controller, 'email')
 * </script>
 *
 * <p>Value: {$emailField.value}</p>
 * <p>Error: {$emailField.error}</p>
 * <p>Touched: {$emailField.touched}</p>
 * ```
 */
export function createFieldStore<T extends Record<string, unknown>, K extends keyof T>(
  controller: FormController<T>,
  name: K,
): Readable<FieldState<T[K]>> {
  return readable(controller.getFieldState(name), (set: (value: FieldState<T[K]>) => void) => {
    return controller.subscribe(() => {
      set(controller.getFieldState(name))
    })
  })
}

/**
 * Create a readable store that tracks a single field's value.
 *
 * @param controller - Form controller
 * @param name - Field name to watch
 * @returns Readable store of the field value
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormStores, createWatchStore } from '`@molecule/app-svelte`'
 *
 *   const { controller } = createFormStores(provider, { defaultValues: { plan: 'free' } })
 *   const plan = createWatchStore(controller, 'plan')
 * </script>
 *
 * {#if $plan === 'pro'}
 *   <ProFeatures />
 * {/if}
 * ```
 */
export function createWatchStore<T extends Record<string, unknown>, K extends keyof T>(
  controller: FormController<T>,
  name: K,
): Readable<T[K]> {
  return readable(controller.getValue(name), (set: (value: T[K]) => void) => {
    return controller.subscribe(() => {
      set(controller.getValue(name))
    })
  })
}
