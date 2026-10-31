/**
 * Form controller creation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import { snapshotSubmissionValue } from './snapshots.js'
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
import { formValuesEqual, snapshotFormValue } from './utilities.js'
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

      // Late records always combine with these original defaults, never with
      // an earlier record. Detach each baseline and the live values so nested
      // caller mutations cannot rewrite clean or validated snapshots.
      // Runtime form values are always a plain string-keyed object; the caller's
      // values TYPE may be an interface without an index signature, so the
      // implementation holds the widened record view and casts back to `T`
      // only where it hands values out.
      const originalDefaultValues = snapshotFormValue(
        (options.defaultValues ?? {}) as Record<string, unknown>,
      )
      let defaultValues = snapshotFormValue({
        ...originalDefaultValues,
        ...((options.values ?? {}) as Record<string, unknown>),
      })
      let values = snapshotFormValue(defaultValues)
      let errors: Partial<Record<keyof T, string>> = {}
      let touched: Partial<Record<keyof T, boolean>> = {}
      let submitCount = 0
      let isSubmitting = false
      let valueRevision = 0
      let validationVersion = 0
      let validationOrder = 0
      let submissionVersion = 0
      let submissionValidationVersion = 0
      let destroyed = false

      // Value revisions track content, never validation start order. Each field
      // owns its validation independently; whole-form operations own only the
      // fields they actually validate.
      const fieldSchemas = new Map<string, ValidationSchema>()
      const fieldValueRevisions = new Map<string, number>()
      const fieldValidationOwners = new Map<string, number>()
      const fieldRefs = new Map<string, HTMLElement>()
      const listeners = new Set<(state: FormState<T>) => void>()

      const isCurrent = (revision: number): boolean => !destroyed && revision === valueRevision
      const isFieldCurrent = (name: string, revision: number, validation: number): boolean =>
        !destroyed &&
        revision === (fieldValueRevisions.get(name) ?? 0) &&
        validation === fieldValidationOwners.get(name)
      const isSubmissionCurrent = (submission: number, validation: number): boolean =>
        !destroyed && submission === submissionVersion && validation === submissionValidationVersion
      const advanceValueRevision = (names?: Iterable<string>): void => {
        valueRevision++
        const changedNames =
          names ??
          new Set([
            ...Object.keys(values),
            ...Object.keys(defaultValues),
            ...fieldSchemas.keys(),
            ...fieldValueRevisions.keys(),
          ])
        for (const name of changedNames) {
          fieldValueRevisions.set(name, (fieldValueRevisions.get(name) ?? 0) + 1)
        }
      }
      const reviseChangedValues = (
        previous: Record<string, unknown>,
        next: Record<string, unknown>,
      ): void => {
        const names = new Set([...Object.keys(previous), ...Object.keys(next)])
        const changed = [...names].filter((name) => !formValuesEqual(previous[name], next[name]))
        if (changed.length > 0) advanceValueRevision(changed)
      }
      const recordIdentityChanged = (
        previous: Record<string, unknown>,
        next: Record<string, unknown>,
      ): boolean => {
        const previousId = previous.id
        return previousId !== undefined && previousId !== null && !Object.is(previousId, next.id)
      }
      const validationFields = (snapshot: Record<string, unknown>): Set<string> =>
        new Set([...Object.keys(snapshot), ...fieldSchemas.keys(), ...Object.keys(errors)])
      const beginValidation = (fields: Iterable<string>): number => {
        const validation = ++validationOrder
        for (const name of fields) fieldValidationOwners.set(name, validation)
        return validation
      }

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
        current: () => boolean,
      ): Promise<{ isValid: boolean; errors: Partial<Record<keyof T, string>> } | null> => {
        let isValid = true
        const newErrors: Partial<Record<keyof T, string>> = {}

        for (const [name, schema] of fieldSchemas) {
          const error = await validateValue(snapshot[name], schema, t)
          if (!current()) return null
          if (error) {
            newErrors[name as keyof T] = error
            isValid = false
          }
        }

        if (options.validate) {
          const formErrors = await options.validate(snapshot as T)
          if (!current()) return null
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
          advanceValueRevision([name])
          values = { ...values, [name]: snapshotFormValue(value) }

          if (opts.shouldTouch !== false) {
            touched = { ...touched, [name as keyof T]: true }
          }

          if (opts.shouldValidate && shouldValidate('change')) {
            this.validateField(name as keyof T)
          }

          notify()
        },

        setValues(newValues: Partial<T>, opts: { shouldValidate?: boolean } = {}): void {
          advanceValueRevision(Object.keys(newValues))
          values = { ...values, ...snapshotFormValue(newValues as Record<string, unknown>) }

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
              originalDefaultValues[name] = snapshotFormValue(defaultValue)
            }
            if (defaultValues[name] === undefined) {
              defaultValues = { ...defaultValues, [name]: snapshotFormValue(defaultValue) }
            }
            if (values[name] === undefined) {
              advanceValueRevision([name])
              values = { ...values, [name]: snapshotFormValue(defaultValue) }
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
          advanceValueRevision([name])
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
          const key = name as string
          const schema = fieldSchemas.get(key)
          if (!schema) return true

          const revision = fieldValueRevisions.get(key) ?? 0
          const validation = beginValidation([key])
          const current = (): boolean => isFieldCurrent(key, revision, validation)
          const snapshot = snapshotFormValue(values[key])
          const error = await validateValue(snapshot, schema, t)
          if (!current()) return false
          if (error) {
            errors = { ...errors, [name]: error }
          } else {
            const newErrors = { ...errors }
            delete newErrors[name]
            errors = newErrors
          }
          notify()
          return current() && !error
        },

        async validate(): Promise<boolean> {
          const validation = ++validationVersion
          const revision = valueRevision
          const snapshot = snapshotFormValue(values)
          const fields = validationFields(snapshot)
          const fieldValidation = beginValidation(fields)
          const current = (): boolean => isCurrent(revision) && validation === validationVersion
          const result = await validateSnapshot(snapshot, current)
          if (!result || !current()) return false

          const newErrors = { ...errors }
          for (const name of new Set([...fields, ...Object.keys(result.errors)])) {
            const owned = fields.has(name)
              ? fieldValidationOwners.get(name) === fieldValidation
              : !fieldValidationOwners.has(name)
            if (!owned) continue
            const error = result.errors[name as keyof T]
            if (error) newErrors[name as keyof T] = error
            else delete newErrors[name as keyof T]
          }
          errors = newErrors
          notify()
          return current() && result.isValid
        },

        updateValues(newValues: Partial<T>, resetOptions: FormResetOptions = {}): void {
          const nextDefaultValues = snapshotFormValue({
            ...originalDefaultValues,
            ...(newValues as Record<string, unknown>),
          })
          if (formValuesEqual(nextDefaultValues, defaultValues)) return

          const currentValues = values
          const previousDefaultValues = defaultValues
          if (
            resetOptions.keepDirtyValues !== true ||
            recordIdentityChanged(previousDefaultValues, nextDefaultValues)
          ) {
            submissionValidationVersion++
          }
          const nextValues = snapshotFormValue(nextDefaultValues)
          if (resetOptions.keepDirtyValues) {
            for (const key of Object.keys(currentValues)) {
              if (!formValuesEqual(currentValues[key], previousDefaultValues[key])) {
                nextValues[key] = snapshotFormValue(currentValues[key])
              }
            }
          }
          reviseChangedValues(values, nextValues)
          defaultValues = nextDefaultValues
          values = nextValues

          errors = {}
          touched = {}
          notify()
        },

        reset(newValues?: Partial<T>): void {
          // A reset establishes a clean baseline: with no argument it restores
          // the current baseline; with values it merges them over that baseline
          // and makes the result the new one, so freshly loaded or saved values
          // read clean afterwards.
          const nextDefaultValues =
            newValues === undefined
              ? defaultValues
              : snapshotFormValue({
                  ...defaultValues,
                  ...(newValues as Record<string, unknown>),
                })
          if (recordIdentityChanged(defaultValues, nextDefaultValues)) {
            submissionValidationVersion++
          }
          const nextValues = snapshotFormValue(nextDefaultValues)
          reviseChangedValues(values, nextValues)
          defaultValues = nextDefaultValues
          values = nextValues
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

            const submission = ++submissionVersion
            const submissionValidation = ++submissionValidationVersion
            const errorValidation = ++validationVersion
            const revision = valueRevision
            submitCount++
            isSubmitting = true
            const submissionValues = snapshotSubmissionValue(values)
            const errorOrder = beginValidation(validationFields(submissionValues))
            const currentSubmission = (): boolean =>
              isSubmissionCurrent(submission, submissionValidation)
            const canPublishErrors = (): boolean =>
              isCurrent(revision) &&
              errorValidation === validationVersion &&
              errorOrder === validationOrder

            try {
              notify()
              if (!currentSubmission()) return
              const result = await validateSnapshot(submissionValues, currentSubmission)
              if (!result || !currentSubmission()) return

              if (canPublishErrors()) {
                errors = result.errors
                notify()
                if (!currentSubmission()) return
              }
              if (result.isValid) {
                await onSubmit(submissionValues as T)
                if (!currentSubmission()) return
              } else {
                if (!canPublishErrors()) return
                if (onError) {
                  onError(result.errors)
                  if (!currentSubmission() || !canPublishErrors()) return
                }
                if (options.shouldFocusError !== false) {
                  const firstErrorField = Object.keys(result.errors)[0]
                  if (firstErrorField) {
                    this.setFocus(firstErrorField as keyof T)
                  }
                }
              }
            } finally {
              if (submission === submissionVersion) {
                isSubmitting = false
                notify()
              }
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
          destroyed = true
          submissionVersion++
          submissionValidationVersion++
          advanceValueRevision()
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
