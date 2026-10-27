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
    'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom'

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
 * The sentence a non-object form-values type is rejected with.
 */
type FormValuesRejection =
  'Form values must be an object type of named fields, not an array, a function or a Date'

/**
 * The value shapes a form can manage: an object type of named fields, and
 * nothing else.
 *
 * An ordinary `interface`, a type literal, a type alias, an intersection and
 * the empty object type all qualify — the check is structural, so it does not
 * demand an index signature the way `Record<string, unknown>` does (a
 * TypeScript interface never has an implicit one). An array, a function or a
 * `Date` is rejected as a whole, because none of them has named fields to
 * register, patch or compare.
 *
 * @template T - The candidate form-values type.
 */
type FormValuesShape<T> = T extends readonly unknown[] | ((...args: never[]) => unknown) | Date
  ? FormValuesRejection
  : object

/**
 * Whether `T` is, or is a union containing, a shape a form cannot manage
 * ({@link FormValuesShape}).
 *
 * This is the ONE decision {@link FormValuesConstraint} makes, so every
 * entrypoint that takes a values type rejects the same types.
 *
 * Three TypeScript behaviors shape it:
 *
 * - **No distribution.** `FormValuesShape<T>` already distributes, so a union
 *   `Good | Bad` yields `object | FormValuesRejection`. Wrapping BOTH sides of
 *   the test in tuples compares those unions as a whole, so one invalid member
 *   rejects the whole union.
 * - **`any` is checked first.** `any` is the caller's explicit opt-out of
 *   values typing, not an invalid member, but `FormValuesShape<any>` resolves
 *   to `FormValuesRejection | object`, which the tuple test reads as "contains
 *   a rejection". `0 extends 1 & T` detects `any` (and only `any` — `never`,
 *   `unknown` and `object` are all false) and takes the accepted branch.
 * - **Deferred at the outer edge.** `[T] extends [unknown]` keeps the whole
 *   check deferred while `T` is an unresolved type parameter. Without it,
 *   TypeScript resolves the inner `0 extends 1 & T` while checking a
 *   forwarder's constraint `T extends FormValuesConstraint<T>` and reports
 *   TS2313 ("Type parameter 'T' has a circular constraint"); with it, the
 *   constraint checks at the call site.
 *
 * `never`, `unknown` and the primitives are not this helper's job: the
 * constraint's `object` branch rejects them.
 *
 * @template T - The candidate form-values type.
 */
type FormValuesIsRejected<T> = [T] extends [unknown]
  ? 0 extends 1 & T
    ? false
    : [FormValuesRejection] extends [FormValuesShape<T>]
      ? true
      : false
  : never

/**
 * The constraint every form entrypoint puts on a values type: an object type of
 * named fields ({@link FormValuesShape}), and `object` for `any`.
 *
 * It exists so an app can name its form fields once, as an ordinary interface,
 * and pass that type whole — `interface Fields { name: string; bio: string }`
 * compiles the same as the type literal it replaces, while a primitive, an
 * array, a function and a `Date` are still rejected, and `keyof T` still types
 * register/get/set per field.
 *
 * ```typescript
 * import type { FormOptions } from '@molecule/app-forms'
 *
 * interface Fields {
 *   name: string
 *   bio: string
 * }
 * const options: FormOptions<Fields> = { defaultValues: { name: '', bio: '' } }
 * ```
 *
 * Forwarding a values type through your own generic copies this constraint, so
 * the values keep being checked:
 *
 * ```typescript
 * import type { FormOptions, FormValuesConstraint } from '@molecule/app-forms'
 *
 * export function makeOptions<T extends FormValuesConstraint<T>>(o: FormOptions<T>) {
 *   return o
 * }
 * ```
 *
 * `T extends object` is not enough: the entrypoints also reject arrays,
 * functions and `Date`, so a forwarder written that way does not compile. Copy
 * this type instead.
 *
 * @template T - The candidate form-values type.
 */
export type FormValuesConstraint<T> =
  FormValuesIsRejected<T> extends true ? FormValuesRejection : object

/**
 * Aggregate state of an entire form (all field values, errors, and submission status).
 */
export interface FormState<T extends FormValuesConstraint<T> = Record<string, unknown>> {
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
export interface FormController<T extends FormValuesConstraint<T> = Record<string, unknown>> {
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
   * Resets the form and clears errors, touched fields and submission state.
   *
   * With no argument it restores the current baseline — the initial
   * `defaultValues`, or the values a previous `reset(values)` established.
   * Passing `values` merges them over the current baseline and makes the
   * result the new baseline, so a form reset to freshly loaded or saved data
   * reads clean (`isDirty === false`).
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
  createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T>
}

/**
 * Form creation options.
 */
export interface FormOptions<T extends FormValuesConstraint<T>> {
  /**
   * Default values, captured as the form's clean baseline when the controller
   * is created. Mutating this object afterwards does not change the baseline.
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
