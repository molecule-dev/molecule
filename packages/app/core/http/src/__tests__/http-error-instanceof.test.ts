import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import { HttpError, isHttpError } from '../index.js'

const HTTP_ERROR_BRAND = Symbol.for('@molecule/app-http/HttpError')

class ValidationHttpError extends HttpError {
  readonly fields = ['email']
}

class OtherHttpError extends HttpError {}

describe('HttpError instanceof compatibility', () => {
  it('keeps local instances and ordinary prototype checks', () => {
    const error = new HttpError('Unprocessable Entity', 422)

    expect(error).toBeInstanceOf(HttpError)
    expect(error).toBeInstanceOf(Error)
    expect(isHttpError(error)).toBe(true)
    expect(Function.prototype[Symbol.hasInstance].call(HttpError, error)).toBe(true)
  })

  it('recognises an HttpError from a second module copy with truthful narrowed fields', async () => {
    vi.resetModules()
    const { HttpError: DuplicateHttpError } = await import('../types.js')
    expect(DuplicateHttpError).not.toBe(HttpError)
    const error: unknown = new DuplicateHttpError(
      'Unprocessable Entity',
      422,
      {
        data: { errors: { email: ['Already registered'] } },
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { 'content-type': 'application/json' },
        config: { method: 'POST', url: '/accounts' },
      },
      { method: 'POST', url: '/accounts' },
      'account.emailTaken',
    )

    expect(Function.prototype[Symbol.hasInstance].call(HttpError, error)).toBe(false)
    expect(error).toBeInstanceOf(HttpError)
    expect(isHttpError(error)).toBe(true)
    if (error instanceof HttpError) {
      expectTypeOf(error).toEqualTypeOf<HttpError>()
      expect(error.status).toBe(422)
      expect(error.response?.data).toStrictEqual({ errors: { email: ['Already registered'] } })
      expect(error.config?.url).toBe('/accounts')
      expect(error.errorKey).toBe('account.emailTaken')
      expect(error.aborted).toBe(false)
      expect(error.message).toBe('Unprocessable Entity')
      expect(error).not.toBeInstanceOf(ValidationHttpError)
      expect(new HttpError('Local', 400)).toBeInstanceOf(DuplicateHttpError)
    }
  })

  it('keeps subclass checks specific while accepting their instances in the base', () => {
    class DetailedValidationHttpError extends ValidationHttpError {}
    const validation: unknown = new ValidationHttpError('Invalid email', 422)
    const detailed = new DetailedValidationHttpError('Invalid email', 422)
    const base = new HttpError('Invalid request', 400)

    expect(validation).toBeInstanceOf(HttpError)
    expect(validation).toBeInstanceOf(ValidationHttpError)
    expect(validation).not.toBeInstanceOf(OtherHttpError)
    expect(detailed).toBeInstanceOf(ValidationHttpError)
    expect(detailed).toBeInstanceOf(DetailedValidationHttpError)
    expect(base).not.toBeInstanceOf(ValidationHttpError)
    if (validation instanceof ValidationHttpError) {
      expectTypeOf(validation).toEqualTypeOf<ValidationHttpError>()
      expect(validation.fields).toStrictEqual(['email'])
    }
  })

  it.each([
    ['plain Error', new Error('Request failed')],
    ['network TypeError', new TypeError('Failed to fetch')],
    ['unbranded I18nError', new I18nError('auth.error.requestFailed')],
    ['unbranded response shape', { status: 422, response: { data: {} }, aborted: false }],
    ['false brand', { [HTTP_ERROR_BRAND]: false }],
    ['non-boolean brand', { [HTTP_ERROR_BRAND]: 'true' }],
    ['null', null],
    ['undefined', undefined],
    ['string', 'Request failed'],
    ['number', 422],
  ])('rejects %s in both public guards', (_name, value) => {
    expect(value).not.toBeInstanceOf(HttpError)
    expect(isHttpError(value)).toBe(false)
    expect(value).not.toBeInstanceOf(ValidationHttpError)
  })
})
