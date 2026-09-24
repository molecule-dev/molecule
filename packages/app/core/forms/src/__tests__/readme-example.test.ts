/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the built-in native provider
 * with the network (`fetch` behind `@molecule/app-http`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { createForm, hasProvider, nativeProvider, setProvider } from '../index.js'

type Signup = { email: string; password: string }

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('blocks an invalid submit and posts the values once they are valid', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(nativeProvider)
    expect(hasProvider()).toBe(true)

    const form = createForm<Signup>({ defaultValues: { email: '', password: '' }, mode: 'onBlur' })
    const required = t('forms.required', undefined, { defaultValue: 'This field is required' })
    const email = form.register({ name: 'email', required, email: true })
    const password = form.register({ name: 'password', required, minLength: 8 })

    email.onChange({ target: { name: 'email', value: 'ada@example' } })
    password.onChange({ target: { name: 'password', value: 'correct-horse' } })

    const onError = vi.fn()
    const onSubmit = form.handleSubmit(async (values) => {
      await post('/signup', values)
    }, onError)

    await onSubmit()
    expect(onError).toHaveBeenCalledWith({ email: 'Invalid email address' })
    expect(fetchMock).not.toHaveBeenCalled()

    form.setValue('email', 'ada@example.com')
    await onSubmit()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/signup')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'ada@example.com',
      password: 'correct-horse',
    })
    expect(form.getState().submitCount).toBe(2)
  })
})
