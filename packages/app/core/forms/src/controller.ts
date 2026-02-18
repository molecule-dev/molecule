/**
 * Form controller creation for molecule.dev.
 *
 * @module
 */

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormState,
  RegisterOptions,
  ValidationSchema,
} from './types.js'
import { validateValue } from './validation.js'

/**
 * Creates a native form provider that manages form state, validation,
 * and field registration without any external library. This is the
 * built-in default used when no form library bond is configured.
 *
 * @returns A `FormProvider` backed by vanilla JavaScript state management.
 */
export const createNativeFormProvider = (): FormProvider => {
  return {
    createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T> {
      const defaultValues = (options.defaultValues || {}) as T
      const mode = options.mode || 'onSubmit'

      let values = { ...defaultValues }
      let errors: Partial<Record<keyof T, string>> = {}
      let touched: Partial<Record<keyof T, boolean>> = {}
      let submitCount = 0
      let isSubmitting = false

      const fieldSchemas = new Map<string, ValidationSchema>()
      const fieldRefs = new Map<string, HTMLElement>()
      const listeners = new Set<(state: FormState<T>) => void>()

      const notify = (): void => {
        const state = controller.getState()
        listeners.forEach((callback) => callback(state))
      }

      const shouldValidate = (event: 'change' | 'blur' | 'submit'): boolean => {
        if (mode === 'all') return true
        if (mode === 'onSubmit') return event === 'submit'
        if (mode === 'onChange') return event === 'change' || event === 'submit'
        if (mode === 'onBlur') return event === 'blur' || event === 'submit'
        return false
      }

      const controller: FormController<T> = {
        getState(): FormState<T> {
          return {
            values,
            errors,
            touched,
            isValid: Object.keys(errors).length === 0,
            isDirty: JSON.stringify(values) !== JSON.stringify(defaultValues),
            isSubmitting,
            submitCount,
          }
        },

        getValue<K extends keyof T>(name: K): T[K] {
          return values[name]
        },

        getValues(): T {
          return { ...values }
        },

        setValue<K extends keyof T>(
          name: K,
          value: T[K],
          opts: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean } = {},
        ): void {
          values = { ...values, [name]: value }

          if (opts.shouldTouch !== false) {
            touched = { ...touched, [name]: true }
          }

          if (opts.shouldValidate && shouldValidate('change')) {
            this.validateField(name)
          }

          notify()
        },

        setValues(newValues: Partial<T>, opts: { shouldValidate?: boolean } = {}): void {
          values = { ...values, ...newValues }

          if (opts.shouldValidate) {
            this.validate()
          }

          notify()
        },

        getError<K extends keyof T>(name: K): string | undefined {
          return errors[name]
        },

        setError<K extends keyof T>(name: K, error: string): void {
          errors = { ...errors, [name]: error }
          notify()
        },

        clearError<K extends keyof T>(name: K): void {
          const newErrors = { ...errors }
          delete newErrors[name]
          errors = newErrors
          notify()
        },

        clearErrors(): void {
          errors = {}
          notify()
        },

        getFieldState<K extends keyof T>(name: K): FieldState<T[K]> {
          return {
            value: values[name],
            error: errors[name],
            touched: touched[name] || false,
            dirty: values[name] !== defaultValues[name],
            valid: !errors[name],
            validating: false,
          }
        },

        register(opts: RegisterOptions): FieldRegistration {
          const { name, defaultValue, transform, ...schema } = opts

          // Store validation schema
          fieldSchemas.set(name, schema)

          // Set default value if not already set
          if (defaultValue !== undefined && values[name as keyof T] === undefined) {
            values = { ...values, [name]: defaultValue } as T
          }

          return {
            name,
            value: values[name as keyof T],
            onChange: (event: { target: { value: unknown; name: string } } | unknown) => {
              let newValue: unknown
              if (event && typeof event === 'object' && 'target' in event) {
                const target = event.target as { value: unknown; name: string }
                newValue = target.value
              } else {
                newValue = event
              }

              if (transform) {
                newValue = transform(newValue)
              }

              this.setValue(name, newValue, {
                shouldValidate: shouldValidate('change'),
              })
            },
            onBlur: () => {
              touched = { ...touched, [name]: true }
              if (shouldValidate('blur')) {
                this.validateField(name as keyof T)
              }
              notify()
            },
            ref: (element: HTMLElement | null) => {
              if (element) {
                fieldRefs.set(name, element)
              } else {
                fieldRefs.delete(name)
              }
            },
          }
        },

        unregister(name: string): void {
          fieldSchemas.delete(name)
          fieldRefs.delete(name)
          const newValues = { ...values }
          delete newValues[name as keyof T]
          values = newValues
          const newErrors = { ...errors }
          delete newErrors[name as keyof T]
          errors = newErrors
          const newTouched = { ...touched }
          delete newTouched[name as keyof T]
          touched = newTouched
          notify()
        },

        async validateField<K extends keyof T>(name: K): Promise<boolean> {
          const schema = fieldSchemas.get(name as string)
          if (!schema) return true

          const error = await validateValue(values[name], schema)
          if (error) {
            errors = { ...errors, [name]: error }
            notify()
            return false
          } else {
            const newErrors = { ...errors }
            delete newErrors[name]
            errors = newErrors
            notify()
            return true
          }
        },

        async validate(): Promise<boolean> {
          let isValid = true
          const newErrors: Partial<Record<keyof T, string>> = {}

          for (const [name, schema] of fieldSchemas) {
            const error = await validateValue(values[name as keyof T], schema)
            if (error) {
              newErrors[name as keyof T] = error
              isValid = false
            }
          }

          // Form-level validation
          if (options.validate) {
            const formErrors = await options.validate(values)
            for (const [key, error] of Object.entries(formErrors)) {
              if (error) {
                newErrors[key as keyof T] = error as string
                isValid = false
              }
            }
          }

          errors = newErrors
          notify()
          return isValid
        },

        reset(newValues?: Partial<T>): void {
          values = { ...defaultValues, ...newValues } as T
          errors = {}
          touched = {}
          submitCount = 0
          isSubmitting = false
          notify()
        },

        handleSubmit(
          onSubmit: (values: T) => void | Promise<void>,
          onError?: (errors: Partial<Record<keyof T, string>>) => void,
        ) {
          return async (event?: { preventDefault?: () => void }) => {
            if (event?.preventDefault) {
              event.preventDefault()
            }

            submitCount++
            isSubmitting = true
            notify()

            try {
              const isValid = await this.validate()
              if (isValid) {
                await onSubmit(values)
              } else {
                if (onError) {
                  onError(errors)
                }
                if (options.shouldFocusError !== false) {
                  const firstErrorField = Object.keys(errors)[0]
                  if (firstErrorField) {
                    this.setFocus(firstErrorField as keyof T)
                  }
                }
              }
            } finally {
              isSubmitting = false
              notify()
            }
          }
        },

        setFocus(name: keyof T): void {
          const element = fieldRefs.get(name as string)
          if (element && 'focus' in element) {
            ;(element as HTMLElement & { focus: () => void }).focus()
          }
        },

        subscribe(callback: (state: FormState<T>) => void): () => void {
          listeners.add(callback)
          return () => listeners.delete(callback)
        },

        destroy(): void {
          listeners.clear()
          fieldSchemas.clear()
          fieldRefs.clear()
        },
      }

      return controller
    },
  }
}

/**
 * Pre-instantiated native form provider, ready to use without calling `createNativeFormProvider()`.
 */
export const nativeProvider = createNativeFormProvider()
