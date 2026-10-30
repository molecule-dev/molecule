import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { nativeProvider } from '../controller.js'

const french = (): void =>
  setProvider(
    createSimpleI18nProvider('fr', [
      {
        code: 'fr',
        name: 'Français',
        translations: {
          'forms.invalidEmail': 'Adresse e-mail invalide',
          'forms.required': 'Ce champ est obligatoire',
        },
      },
    ]),
  )

describe('native form controller default messages', () => {
  afterEach(() => setProvider(createSimpleI18nProvider()))

  it('shows a built-in rule message in the bonded locale, field by field and on submit', async () => {
    french()
    const form = nativeProvider.createForm<{ email: string; name: string }>({
      defaultValues: { email: '', name: '' },
    })
    form.register({ name: 'email', email: true })
    form.register({ name: 'name', required: true })
    form.setValue('email', 'not-an-email')

    expect(await form.validateField('email')).toBe(false)
    expect(form.getState().errors.email).toBe('Adresse e-mail invalide')

    expect(await form.validate()).toBe(false)
    expect(form.getState().errors).toEqual({
      email: 'Adresse e-mail invalide',
      name: 'Ce champ est obligatoire',
    })
  })

  it('keeps the English default when the locale has no translation for the key', async () => {
    const form = nativeProvider.createForm<{ email: string }>({ defaultValues: { email: '' } })
    form.register({ name: 'email', email: true })
    form.setValue('email', 'not-an-email')

    expect(await form.validateField('email')).toBe(false)
    expect(form.getState().errors.email).toBe('Invalid email address')
  })

  it("shows a rule's own message as written, untranslated", async () => {
    french()
    const form = nativeProvider.createForm<{ email: string }>({ defaultValues: { email: '' } })
    form.register({ name: 'email', email: 'Use your work address' })
    form.setValue('email', 'not-an-email')

    expect(await form.validateField('email')).toBe(false)
    expect(form.getState().errors.email).toBe('Use your work address')
  })
})
