/**
 * Form controller creation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormResetOptions,
  FormState,
  FormValuesConstraint,
  RegisterOptions,
  ValidationSchema,
} from './types.js'
import { formValuesEqual } from './utilities.js'
import { validateValue } from './validation.js'

/**
 * Creates a native form provider that manages form state, validation,
 * and field registration without any external library. This is the
 * built-in default used when no form library bond is configured.
 *
 * Default validation messages are translated through `@molecule/app-i18n`'s `t` when they
 * are produced, so they follow the bonded locale.
 *
 * @returns A `FormProvider` backed by vanilla JavaScript state management.
 */
export const createNativeFormProvider = (): FormProvider => {
  return {
    createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
      const mode = options.mode || 'onSubmit'

      // Baselines snapshot the caller's top-level objects. Late records always
      // combine with these original defaults, never with an earlier record.
      // Runtime form values are always a plain string-keyed object; the caller's
      // values TYPE may be an interface without an index signature, so the
      // implementation holds the widened record view and casts back to `T`
      // only where it hands values out.
      const originalDefaultValues: Record<string, unknown> = {
        ...((options.defaultValues ?? {}) as Record<string, unknown>),
      }
      let defaultValues: Record<string, unknown> = {
        ...originalDefaultValues,
        ...((options.values ?? {}) as Record<string, unknown>),
      }
      let values: Record<string, unknown> = { ...defaultValues }
      let errors: Partial<Record<keyof T, string>> = {}
      let touched: Partial<Record<keyof T, boolean>> = {}
      let submitCount = 0
      let isSubmitting = false
      let rebaseVersion = 0

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

      const validateSnapshot = async (
        snapshot: Record<string, unknown>,
      ): Promise<{ isValid: boolean; errors: Partial<Record<keyof T, string>> }> => {
        let isValid = true
        const newErrors: Partial<Record<keyof T, string>> = {}

        for (const [name, schema] of fieldSchemas) {
          const error = await validateValue(snapshot[name], schema, t)
          if (error) {
            newErrors[name as keyof T] = error
            isValid = false
          }
        }

        if (options.validate) {
          const formErrors = await options.validate(snapshot as T)
          for (const [key, error] of Object.entries(formErrors)) {
            if (error) {
              newErrors[key as keyof T] = error as string
              isValid = false
            }
          }
        }

        return { isValid, errors: newErrors }
      }

      const controller: FormController<T> = {
        getState(): FormState<T> {
          return {
            values: values as T,
            errors,
            touched,
            isValid: Object.keys(errors).length === 0,
            isDirty: !formValuesEqual(values, defaultValues),
            isSubmitting,
            submitCount,
          }
        },

        getValue(name: string): unknown {
          return values[name]
        },

        getValues(): T {
          return { ...values } as T
        },

        setValue(
          name: string,
          value: unknown,
          opts: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean } = {},
        ): void {
          values = { ...values, [name]: value }

          if (opts.shouldTouch !== false) {
            touched = { ...touched, [name as keyof T]: true }
          }

          if (opts.shouldValidate && shouldValidate('change')) {
            this.validateField(name as keyof T)
          }

          notify()
        },

        setValues(newValues: Partial<T>, opts: { shouldValidate?: boolean } = {}): void {
          values = { ...values, ...(newValues as Record<string, unknown>) }

          if (opts.shouldValidate) {
            this.validate()
          }

          notify()
        },

        getError(name: string): string | undefined {
          return errors[name as keyof T]
        },

        setError(name: string, error: string): void {
          errors = { ...errors, [name as keyof T]: error }
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
            value: values[name as string] as T[K],
            error: errors[name],
            touched: touched[name] || false,
            dirty: !formValuesEqual(values[name as string], defaultValues[name as string]),
            valid: !errors[name],
            validating: false,
          }
        },

        register(opts: RegisterOptions): FieldRegistration {
          const { name, defaultValue, transform, ...schema } = opts

          // Store validation schema
          fieldSchemas.set(name, schema)

          // A registered default is also clean baseline content. Keep it with
          // the original defaults so later replacement records can restore it.
          if (defaultValue !== undefined) {
            if (originalDefaultValues[name] === undefined) {
              originalDefaultValues[name] = defaultValue
            }
            if (defaultValues[name] === undefined) {
              defaultValues = { ...defaultValues, [name]: defaultValue }
            }
            if (values[name] === undefined) {
              values = { ...values, [name]: defaultValue }
            }
          }

          return {
            name,
            value: values[name],
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
          delete newValues[name]
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

          const validationRebaseVersion = rebaseVersion
          const error = await validateValue(values[name as string], schema, t)
          if (validationRebaseVersion !== rebaseVersion) return false
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
          const validationRebaseVersion = rebaseVersion
          const result = await validateSnapshot({ ...values })
          if (validationRebaseVersion !== rebaseVersion) return false

          errors = result.errors
          notify()
          return result.isValid
        },

        updateValues(newValues: Partial<T>, resetOptions: FormResetOptions = {}): void {
          const nextDefaultValues: Record<string, unknown> = {
            ...originalDefaultValues,
            ...(newValues as Record<string, unknown>),
          }
          if (formValuesEqual(nextDefaultValues, defaultValues)) return

          const currentValues = values
          const previousDefaultValues = defaultValues
          rebaseVersion++
          defaultValues = nextDefaultValues
          values = { ...defaultValues }

          if (resetOptions.keepDirtyValues) {
            for (const key of Object.keys(currentValues)) {
              if (!formValuesEqual(currentValues[key], previousDefaultValues[key])) {
                values[key] = currentValues[key]
              }
            }
          }

          errors = {}
          touched = {}
          notify()
        },

        reset(newValues?: Partial<T>): void {
          // A reset establishes a clean baseline: with no argument it restores
          // the current baseline; with values it merges them over that baseline
          // and makes the result the new one, so freshly loaded or saved values
          // read clean afterwards.
          if (newValues !== undefined) {
            defaultValues = { ...defaultValues, ...(newValues as Record<string, unknown>) }
          }
          values = { ...defaultValues }
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

            const submissionValues = { ...values }
            const submissionRebaseVersion = rebaseVersion

            try {
              const result = await validateSnapshot(submissionValues)
              // A late record invalidates this validation run. It must neither
              // publish stale errors nor submit the replacement against them.
              if (submissionRebaseVersion !== rebaseVersion) return

              errors = result.errors
              notify()
              if (result.isValid) {
                await onSubmit(submissionValues as T)
              } else {
                if (onError) {
                  onError(result.errors)
                }
                if (options.shouldFocusError !== false) {
                  const firstErrorField = Object.keys(result.errors)[0]
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
