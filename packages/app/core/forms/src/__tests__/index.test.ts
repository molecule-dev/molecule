import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createNativeFormProvider, nativeProvider } from '../controller.js'
import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormState,
  RegisterOptions,
  ValidationRule,
  ValidationSchema,
} from '../index.js'
import { createForm, getProvider, hasProvider, setProvider } from '../provider.js'
import { validateValue } from '../validation.js'

describe('@molecule/app-forms', () => {
  describe('Types compile correctly', () => {
    it('should compile ValidationRule type', () => {
      const rule: ValidationRule = {
        type: 'required',
        message: 'This field is required',
      }
      expect(rule.type).toBe('required')
    })

    it('should compile ValidationSchema type', () => {
      const schema: ValidationSchema = {
        required: true,
        min: 0,
        max: 100,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-z]+$/,
        email: true,
        url: false,
      }
      expect(schema.required).toBe(true)
    })

    it('should compile ValidationSchema with custom messages', () => {
      const schema: ValidationSchema = {
        required: 'Custom required message',
        min: { value: 0, message: 'Must be at least 0' },
        max: { value: 100, message: 'Must be at most 100' },
        minLength: { value: 1, message: 'Must have at least 1 character' },
        maxLength: { value: 50, message: 'Must have at most 50 characters' },
        pattern: { value: /^[a-z]+$/, message: 'Only lowercase letters' },
        email: 'Must be a valid email',
        url: 'Must be a valid URL',
      }
      expect(schema.required).toBe('Custom required message')
    })

    it('should compile FieldState type', () => {
      const state: FieldState<string> = {
        value: 'test',
        error: undefined,
        touched: true,
        dirty: true,
        valid: true,
        validating: false,
      }
      expect(state.valid).toBe(true)
    })

    it('should compile FormState type', () => {
      interface FormData {
        name: string
        email: string
      }
      const state: FormState<FormData> = {
        values: { name: 'John', email: 'john@example.com' },
        errors: {},
        touched: { name: true },
        isValid: true,
        isDirty: true,
        isSubmitting: false,
        submitCount: 0,
      }
      expect(state.isValid).toBe(true)
    })

    it('should compile RegisterOptions type', () => {
      const options: RegisterOptions = {
        name: 'email',
        defaultValue: '',
        required: true,
        email: true,
        deps: ['password'],
      }
      expect(options.name).toBe('email')
    })

    it('should compile FieldRegistration type', () => {
      const registration: FieldRegistration = {
        name: 'email',
        value: 'test@example.com',
        onChange: () => {},
        onBlur: () => {},
        ref: () => {},
      }
      expect(registration.name).toBe('email')
    })

    it('should compile FormOptions type', () => {
      interface FormData {
        name: string
      }
      const options: FormOptions<FormData> = {
        defaultValues: { name: '' },
        mode: 'onChange',
        reValidateMode: 'onBlur',
        shouldFocusError: true,
        validate: async (_values) => ({}),
      }
      expect(options.mode).toBe('onChange')
    })
  })

  describe('validateValue', () => {
    describe('required validation', () => {
      it('should return error for empty string when required', async () => {
        const error = await validateValue('', { required: true })
        expect(error).toBe('This field is required')
      })

      it('should return custom error message when provided', async () => {
        const error = await validateValue('', { required: 'Name is required' })
        expect(error).toBe('Name is required')
      })

      it('should return error for null when required', async () => {
        const error = await validateValue(null, { required: true })
        expect(error).toBe('This field is required')
      })

      it('should return error for undefined when required', async () => {
        const error = await validateValue(undefined, { required: true })
        expect(error).toBe('This field is required')
      })

      it('should return error for empty array when required', async () => {
        const error = await validateValue([], { required: true })
        expect(error).toBe('This field is required')
      })

      it('should pass for non-empty value when required', async () => {
        const error = await validateValue('hello', { required: true })
        expect(error).toBeUndefined()
      })

      it('should pass for number 0 when required', async () => {
        const error = await validateValue(0, { required: true })
        expect(error).toBeUndefined()
      })
    })

    describe('min validation', () => {
      it('should return error when value is below min', async () => {
        const error = await validateValue(5, { min: 10 })
        expect(error).toBe('Value must be at least 10')
      })

      it('should return custom error message', async () => {
        const error = await validateValue(5, { min: { value: 10, message: 'Too small!' } })
        expect(error).toBe('Too small!')
      })

      it('should pass when value equals min', async () => {
        const error = await validateValue(10, { min: 10 })
        expect(error).toBeUndefined()
      })

      it('should pass when value is above min', async () => {
        const error = await validateValue(15, { min: 10 })
        expect(error).toBeUndefined()
      })
    })

    describe('max validation', () => {
      it('should return error when value is above max', async () => {
        const error = await validateValue(15, { max: 10 })
        expect(error).toBe('Value must be at most 10')
      })

      it('should return custom error message', async () => {
        const error = await validateValue(15, { max: { value: 10, message: 'Too big!' } })
        expect(error).toBe('Too big!')
      })

      it('should pass when value equals max', async () => {
        const error = await validateValue(10, { max: 10 })
        expect(error).toBeUndefined()
      })

      it('should pass when value is below max', async () => {
        const error = await validateValue(5, { max: 10 })
        expect(error).toBeUndefined()
      })
    })

    describe('minLength validation', () => {
      it('should return error for string shorter than minLength', async () => {
        const error = await validateValue('ab', { minLength: 3 })
        expect(error).toBe('Must be at least 3 characters')
      })

      it('should return custom error message', async () => {
        const error = await validateValue('ab', { minLength: { value: 3, message: 'Too short!' } })
        expect(error).toBe('Too short!')
      })

      it('should pass for string at minLength', async () => {
        const error = await validateValue('abc', { minLength: 3 })
        expect(error).toBeUndefined()
      })

      it('should return error for array shorter than minLength', async () => {
        const error = await validateValue([1, 2], { minLength: 3 })
        expect(error).toBe('Must be at least 3 characters')
      })
    })

    describe('maxLength validation', () => {
      it('should return error for string longer than maxLength', async () => {
        const error = await validateValue('abcdef', { maxLength: 5 })
        expect(error).toBe('Must be at most 5 characters')
      })

      it('should return custom error message', async () => {
        const error = await validateValue('abcdef', {
          maxLength: { value: 5, message: 'Too long!' },
        })
        expect(error).toBe('Too long!')
      })

      it('should pass for string at maxLength', async () => {
        const error = await validateValue('abcde', { maxLength: 5 })
        expect(error).toBeUndefined()
      })
    })

    describe('pattern validation', () => {
      it('should return error when pattern does not match', async () => {
        const error = await validateValue('123', { pattern: /^[a-z]+$/ })
        expect(error).toBe('Invalid format')
      })

      it('should return custom error message', async () => {
        const error = await validateValue('123', {
          pattern: { value: /^[a-z]+$/, message: 'Only letters!' },
        })
        expect(error).toBe('Only letters!')
      })

      it('should pass when pattern matches', async () => {
        const error = await validateValue('abc', { pattern: /^[a-z]+$/ })
        expect(error).toBeUndefined()
      })
    })

    describe('email validation', () => {
      it('should return error for invalid email', async () => {
        const error = await validateValue('invalid', { email: true })
        expect(error).toBe('Invalid email address')
      })

      it('should return custom error message', async () => {
        const error = await validateValue('invalid', { email: 'Please enter a valid email' })
        expect(error).toBe('Please enter a valid email')
      })

      it('should pass for valid email', async () => {
        const error = await validateValue('test@example.com', { email: true })
        expect(error).toBeUndefined()
      })
    })

    describe('url validation', () => {
      it('should return error for invalid URL', async () => {
        const error = await validateValue('not-a-url', { url: true })
        expect(error).toBe('Invalid URL')
      })

      it('should return custom error message', async () => {
        const error = await validateValue('not-a-url', { url: 'Please enter a valid URL' })
        expect(error).toBe('Please enter a valid URL')
      })

      it('should pass for valid URL', async () => {
        const error = await validateValue('https://example.com', { url: true })
        expect(error).toBeUndefined()
      })
    })

    describe('custom validation', () => {
      it('should return error message from custom validator', async () => {
        const error = await validateValue('test', {
          validate: (value) => (value === 'secret' ? true : 'Wrong value!'),
        })
        expect(error).toBe('Wrong value!')
      })

      it('should return default error when validator returns false', async () => {
        const error = await validateValue('test', {
          validate: (value) => value === 'secret',
        })
        expect(error).toBe('Invalid value')
      })

      it('should pass when custom validator returns true', async () => {
        const error = await validateValue('secret', {
          validate: (value) => value === 'secret',
        })
        expect(error).toBeUndefined()
      })

      it('should handle async custom validators', async () => {
        const error = await validateValue('test', {
          validate: async (value) => {
            await new Promise((r) => setTimeout(r, 10))
            return value === 'secret' ? true : 'Wrong!'
          },
        })
        expect(error).toBe('Wrong!')
      })
    })

    describe('empty value handling', () => {
      it('should skip validation for empty values when not required', async () => {
        const error = await validateValue('', {
          email: true,
          minLength: 5,
        })
        expect(error).toBeUndefined()
      })
    })
  })

  describe('Form Controller', () => {
    describe('createNativeFormProvider', () => {
      it('should create a form provider', () => {
        const provider = createNativeFormProvider()
        expect(provider).toBeDefined()
        expect(provider.createForm).toBeDefined()
      })

      it('should export nativeProvider', () => {
        expect(nativeProvider).toBeDefined()
        expect(nativeProvider.createForm).toBeDefined()
      })
    })

    describe('FormController', () => {
      let controller: FormController<{ name: string; email: string }>

      beforeEach(() => {
        controller = nativeProvider.createForm({
          defaultValues: { name: '', email: '' },
        })
      })

      it('should get initial state', () => {
        const state = controller.getState()
        expect(state.values).toEqual({ name: '', email: '' })
        expect(state.errors).toEqual({})
        expect(state.touched).toEqual({})
        expect(state.isValid).toBe(true)
        expect(state.isDirty).toBe(false)
        expect(state.isSubmitting).toBe(false)
        expect(state.submitCount).toBe(0)
      })

      it('should get and set values', () => {
        expect(controller.getValue('name')).toBe('')
        controller.setValue('name', 'John')
        expect(controller.getValue('name')).toBe('John')
      })

      it('should get all values', () => {
        controller.setValue('name', 'John')
        controller.setValue('email', 'john@example.com')
        expect(controller.getValues()).toEqual({ name: 'John', email: 'john@example.com' })
      })

      it('should set multiple values at once', () => {
        controller.setValues({ name: 'John', email: 'john@example.com' })
        expect(controller.getValues()).toEqual({ name: 'John', email: 'john@example.com' })
      })

      it('should manage errors', () => {
        expect(controller.getError('name')).toBeUndefined()
        controller.setError('name', 'Name is required')
        expect(controller.getError('name')).toBe('Name is required')
        controller.clearError('name')
        expect(controller.getError('name')).toBeUndefined()
      })

      it('should clear all errors', () => {
        controller.setError('name', 'Error 1')
        controller.setError('email', 'Error 2')
        controller.clearErrors()
        expect(controller.getError('name')).toBeUndefined()
        expect(controller.getError('email')).toBeUndefined()
      })

      it('should get field state', () => {
        controller.setValue('name', 'John', { shouldTouch: true })
        const fieldState = controller.getFieldState('name')
        expect(fieldState.value).toBe('John')
        expect(fieldState.touched).toBe(true)
        expect(fieldState.dirty).toBe(true)
        expect(fieldState.valid).toBe(true)
      })

      it('should register fields', () => {
        const registration = controller.register({
          name: 'name',
          required: true,
        })
        expect(registration.name).toBe('name')
        expect(typeof registration.onChange).toBe('function')
        expect(typeof registration.onBlur).toBe('function')
      })

      it('should handle onChange events', () => {
        const registration = controller.register({ name: 'name' })
        registration.onChange({ target: { value: 'John', name: 'name' } })
        expect(controller.getValue('name')).toBe('John')
      })

      it('should handle direct value onChange', () => {
        const registration = controller.register({ name: 'name' })
        registration.onChange('John')
        expect(controller.getValue('name')).toBe('John')
      })

      it('should unregister fields', () => {
        controller.register({ name: 'name', defaultValue: 'test' })
        controller.unregister('name')
        // Field should be removed from values
        expect(controller.getValue('name')).toBeUndefined()
      })

      it('should validate fields', async () => {
        controller.register({ name: 'name', required: true })
        const isValid = await controller.validateField('name')
        expect(isValid).toBe(false)
        expect(controller.getError('name')).toBe('This field is required')
      })

      it('should validate all fields', async () => {
        controller.register({ name: 'name', required: true })
        controller.register({ name: 'email', email: true })
        controller.setValue('email', 'invalid')

        const isValid = await controller.validate()
        expect(isValid).toBe(false)
        expect(controller.getError('name')).toBeDefined()
        expect(controller.getError('email')).toBeDefined()
      })

      it('should reset the form', () => {
        controller.setValue('name', 'John')
        controller.setError('name', 'Error')
        controller.reset()
        expect(controller.getValue('name')).toBe('')
        expect(controller.getError('name')).toBeUndefined()
        expect(controller.getState().submitCount).toBe(0)
      })

      it('should reset to new values', () => {
        controller.reset({ name: 'Jane' })
        expect(controller.getValue('name')).toBe('Jane')
      })

      it('should handle form submission', async () => {
        const onSubmit = vi.fn()
        controller.setValue('name', 'John')
        controller.setValue('email', 'john@example.com')

        const handleSubmit = controller.handleSubmit(onSubmit)
        await handleSubmit({ preventDefault: vi.fn() })

        expect(onSubmit).toHaveBeenCalledWith({ name: 'John', email: 'john@example.com' })
      })

      it('should call onError on validation failure', async () => {
        const onSubmit = vi.fn()
        const onError = vi.fn()

        controller.register({ name: 'name', required: true })
        const handleSubmit = controller.handleSubmit(onSubmit, onError)
        await handleSubmit()

        expect(onSubmit).not.toHaveBeenCalled()
        expect(onError).toHaveBeenCalled()
      })

      it('should subscribe to state changes', () => {
        const callback = vi.fn()
        const unsubscribe = controller.subscribe(callback)

        controller.setValue('name', 'John')
        expect(callback).toHaveBeenCalled()

        unsubscribe()
        controller.setValue('name', 'Jane')
        expect(callback).toHaveBeenCalledTimes(1) // Not called again
      })

      it('should destroy the controller', () => {
        const callback = vi.fn()
        controller.subscribe(callback)
        controller.destroy()

        controller.setValue('name', 'John')
        expect(callback).not.toHaveBeenCalled()
      })
    })

    describe('Form-level validation', () => {
      it('should run form-level validation', async () => {
        const controller = nativeProvider.createForm({
          defaultValues: { password: '', confirmPassword: '' },
          validate: (values) => {
            const errors: Record<string, string> = {}
            if (values.password !== values.confirmPassword) {
              errors.confirmPassword = 'Passwords do not match'
            }
            return errors
          },
        })

        controller.setValue('password', 'secret')
        controller.setValue('confirmPassword', 'different')

        const isValid = await controller.validate()
        expect(isValid).toBe(false)
        expect(controller.getError('confirmPassword')).toBe('Passwords do not match')
      })
    })

    describe('Validation modes', () => {
      it('should validate onChange when mode is onChange', async () => {
        const controller = nativeProvider.createForm({
          defaultValues: { name: '' },
          mode: 'onChange',
        })

        const registration = controller.register({ name: 'name', required: true })
        registration.onChange('')

        // Give time for validation
        await new Promise((r) => setTimeout(r, 0))
        expect(controller.getError('name')).toBeDefined()
      })

      it('should not validate onChange when mode is onSubmit', async () => {
        const controller = nativeProvider.createForm({
          defaultValues: { name: '' },
          mode: 'onSubmit',
        })

        const registration = controller.register({ name: 'name', required: true })
        registration.onChange('')

        await new Promise((r) => setTimeout(r, 0))
        expect(controller.getError('name')).toBeUndefined()
      })
    })
  })

  describe('Provider management', () => {
    beforeEach(() => {
      // Reset provider to native provider before each test
      setProvider(nativeProvider)
    })

    it('should get a provider (creates default if none)', () => {
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(provider.createForm).toBeDefined()
    })

    it('should set and get a custom provider', () => {
      const customProvider: FormProvider = {
        createForm: () => ({}) as FormController<Record<string, unknown>>,
      }
      setProvider(customProvider)
      expect(getProvider()).toBe(customProvider)
    })

    it('should check if provider exists', () => {
      // After getProvider is called, hasProvider should return true
      getProvider()
      expect(hasProvider()).toBe(true)
    })

    it('should create a form using the provider', () => {
      const form = createForm({ defaultValues: { test: '' } })
      expect(form).toBeDefined()
      expect(form.getState).toBeDefined()
    })
  })
})
