/**
 * Form handling types for molecule.dev.
 *
 * @module
 */

/**
 * Field validation rule.
 */
export interface ValidationRule {
  /**
   * Rule type.
   */
  type:
    | 'required'
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'url'
    | 'custom'

  /**
   * Rule value (for rules like min, max, pattern).
   */
  value?: unknown

  /**
   * Error message when validation fails.
   */
  message: string
}

/**
 * Field validation schema.
 */
export interface ValidationSchema {
  /**
   * Whether the field is required.
   */
  required?: boolean | string

  /**
   * Minimum value (for numbers).
   */
  min?: number | { value: number; message: string }

  /**
   * Maximum value (for numbers).
   */
  max?: number | { value: number; message: string }

  /**
   * Minimum length (for strings).
   */
  minLength?: number | { value: number; message: string }

  /**
   * Maximum length (for strings).
   */
  maxLength?: number | { value: number; message: string }

  /**
   * Pattern to match (regex).
   */
  pattern?: RegExp | { value: RegExp; message: string }

  /**
   * Validate as email.
   */
  email?: boolean | string

  /**
   * Validate as URL.
   */
  url?: boolean | string

  /**
   * Custom validation function.
   */
  validate?: (value: unknown) => boolean | string | Promise<boolean | string>
}

/**
 * Reactive state for a single form field (value, validation errors, touched/dirty flags).
 */
export interface FieldState<T = unknown> {
  /**
   * Current field value.
   */
  value: T

  /**
   * Error message (if any).
   */
  error?: string

  /**
   * Whether the field has been touched.
   */
  touched: boolean

  /**
   * Whether the field is dirty (value changed from initial).
   */
  dirty: boolean

  /**
   * Whether the field is valid.
   */
  valid: boolean

  /**
   * Whether the field is currently being validated.
   */
  validating: boolean
}

/**
 * Aggregate state of an entire form (all field values, errors, and submission status).
 */
export interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Form values.
   */
  values: T

  /**
   * Field errors.
   */
  errors: Partial<Record<keyof T, string>>

  /**
   * Touched fields.
   */
  touched: Partial<Record<keyof T, boolean>>

  /**
   * Whether the form is valid.
   */
  isValid: boolean

  /**
   * Whether the form is dirty.
   */
  isDirty: boolean

  /**
   * Whether the form is submitting.
   */
  isSubmitting: boolean

  /**
   * Number of times the form has been submitted.
   */
  submitCount: number
}

/**
 * Field registration options.
 */
export interface RegisterOptions extends ValidationSchema {
  /**
   * Field name.
   */
  name: string

  /**
   * Default value.
   */
  defaultValue?: unknown

  /**
   * Value transformation on change.
   */
  transform?: (value: unknown) => unknown

  /**
   * Dependencies for validation.
   */
  deps?: string[]
}

/**
 * Field registration result (for native inputs).
 */
export interface FieldRegistration {
  /**
   * Field name.
   */
  name: string

  /**
   * Field value.
   */
  value: unknown

  /**
   * Change handler.
   */
  onChange: (event: { target: { value: unknown; name: string } } | unknown) => void

  /**
   * Blur handler.
   */
  onBlur: () => void

  /**
   * Reference setter (for DOM elements).
   */
  ref?: (element: HTMLElement | null) => void
}

/**
 * Form controller interface.
 *
 * All form providers must implement this interface.
 */
export interface FormController<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Gets the current form state.
   */
  getState(): FormState<T>

  /**
   * Gets the value of a specific field.
   */
  getValue(name: string): unknown
  getValue<K extends keyof T>(name: K): T[K]

  /**
   * Gets all form values.
   */
  getValues(): T

  /**
   * Sets the value of a specific field.
   */
  setValue(
    name: string,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean },
  ): void

  /**
   * Sets multiple values at once.
   */
  setValues(values: Partial<T>, options?: { shouldValidate?: boolean }): void

  /**
   * Gets the error for a specific field.
   */
  getError(name: string): string | undefined

  /**
   * Sets the error for a specific field.
   */
  setError(name: string, error: string | undefined): void

  /**
   * Clears the error for a specific field.
   */
  clearError<K extends keyof T>(name: K): void

  /**
   * Clears all errors.
   */
  clearErrors(): void

  /**
   * Gets the field state for a specific field.
   */
  getFieldState<K extends keyof T>(name: K): FieldState<T[K]>

  /**
   * Registers a field for form management.
   */
  register(nameOrOptions: string | RegisterOptions, options?: RegisterOptions): FieldRegistration

  /**
   * Unregisters a field.
   */
  unregister(name: string): void

  /**
   * Validates a specific field.
   */
  validateField<K extends keyof T>(name: K): Promise<boolean>

  /**
   * Validates all fields.
   */
  validate(): Promise<boolean>

  /**
   * Resets the form to initial values.
   */
  reset(values?: Partial<T>): void

  /**
   * Handles form submission.
   */
  handleSubmit(
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): (event?: { preventDefault?: () => void }) => Promise<void>

  /**
   * Sets focus to a field.
   */
  setFocus(name: keyof T): void

  /**
   * Subscribes to form state changes.
   */
  subscribe(callback: (state: FormState<T>) => void): () => void

  /**
   * Destroys the form controller.
   */
  destroy(): void
}

/**
 * Form provider interface.
 *
 * Implementations create form controllers.
 */
export interface FormProvider {
  /**
   * Creates a new form controller.
   */
  createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T>
}

/**
 * Form creation options.
 */
export interface FormOptions<T extends Record<string, unknown>> {
  /**
   * Default values.
   */
  defaultValues?: Partial<T>

  /**
   * Validation mode.
   */
  mode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all'

  /**
   * Revalidation mode.
   */
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'

  /**
   * Whether to focus the first error field on submit.
   */
  shouldFocusError?: boolean

  /**
   * Form-level validation function.
   */
  validate?: (
    values: T,
  ) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>
}
