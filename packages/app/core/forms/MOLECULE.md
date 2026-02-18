# @molecule/app-forms

Form handling interface for molecule.dev.

Provides a unified form management API that works across different
form libraries (native, React Hook Form, Formik, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-forms
```

## API

### Interfaces

#### `FieldRegistration`

Field registration result (for native inputs).

```typescript
interface FieldRegistration {
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
```

#### `FieldState`

Reactive state for a single form field (value, validation errors, touched/dirty flags).

```typescript
interface FieldState<T = unknown> {
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
```

#### `FormController`

Form controller interface.

All form providers must implement this interface.

```typescript
interface FormController<T extends Record<string, unknown> = Record<string, unknown>> {
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
```

#### `FormOptions`

Form creation options.

```typescript
interface FormOptions<T extends Record<string, unknown>> {
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
```

#### `FormProvider`

Form provider interface.

Implementations create form controllers.

```typescript
interface FormProvider {
  /**
   * Creates a new form controller.
   */
  createForm<T extends Record<string, unknown>>(options: FormOptions<T>): FormController<T>
}
```

#### `FormState`

Aggregate state of an entire form (all field values, errors, and submission status).

```typescript
interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
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
```

#### `RegisterOptions`

Field registration options.

```typescript
interface RegisterOptions extends ValidationSchema {
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
```

#### `ValidationRule`

Field validation rule.

```typescript
interface ValidationRule {
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
```

#### `ValidationSchema`

Field validation schema.

```typescript
interface ValidationSchema {
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
```

### Functions

#### `createForm(options)`

Creates a new form controller for the given options using the active
form provider. The controller manages field values, validation, dirty
tracking, and submission.

```typescript
function createForm(options: FormOptions<T>): FormController<T>
```

- `options` — Form configuration including initial values, validation rules, and submit handler.

**Returns:** A form controller instance for managing the form lifecycle.

#### `createNativeFormProvider()`

Creates a native form provider that manages form state, validation,
and field registration without any external library. This is the
built-in default used when no form library bond is configured.

```typescript
function createNativeFormProvider(): FormProvider
```

**Returns:** A `FormProvider` backed by vanilla JavaScript state management.

#### `getProvider()`

Retrieves the bonded form provider. If none is bonded, automatically
creates and bonds the built-in native form provider.

```typescript
function getProvider(): FormProvider
```

**Returns:** The active form provider.

#### `hasProvider()`

Checks whether a form provider has been explicitly bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a form provider is bonded.

#### `setProvider(provider)`

Registers a form provider as the active singleton.

```typescript
function setProvider(provider: FormProvider): void
```

- `provider` — The form provider implementation to bond.

#### `validateValue(value, schema, t)`

Validates a value against a validation schema.

When a translation function `t` is provided, default validation messages
will be passed through it for i18n support.

```typescript
function validateValue(value: unknown, schema: ValidationSchema, t?: TranslateFn): Promise<string | undefined>
```

- `value` — The value to validate (string, number, array, or any type accepted by custom validators).
- `schema` — The validation rules to check against (required, min/max, pattern, email, etc.).
- `t` — Optional i18n translation function for localizing error messages.

**Returns:** The first validation error message, or `undefined` if the value passes all checks.

### Constants

#### `nativeProvider`

Pre-instantiated native form provider, ready to use without calling `createNativeFormProvider()`.

```typescript
const nativeProvider: FormProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-forms`.
