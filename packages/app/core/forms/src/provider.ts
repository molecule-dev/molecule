/**
 * Form provider bond accessor and convenience functions.
 *
 * If no custom form provider is bonded, a built-in native HTML form
 * provider is auto-created on first access. Bond packages can override
 * this with framework-specific implementations.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createNativeFormProvider } from './controller.js'
import type { FormController, FormOptions, FormProvider } from './types.js'

const BOND_TYPE = 'forms'

/**
 * Registers a form provider as the active singleton.
 *
 * @param provider - The form provider implementation to bond.
 */
export const setProvider = (provider: FormProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded form provider. If none is bonded, automatically
 * creates and bonds the built-in native form provider.
 *
 * @returns The active form provider.
 */
export const getProvider = (): FormProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createNativeFormProvider())
  }
  return bondGet<FormProvider>(BOND_TYPE)!
}

/**
 * Checks whether a form provider has been explicitly bonded.
 *
 * @returns `true` if a form provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a new form controller for the given options using the active
 * form provider. The controller manages field values, validation, dirty
 * tracking, and submission.
 *
 * @param options - Form configuration including initial values, validation rules, and submit handler.
 * @returns A form controller instance for managing the form lifecycle.
 */
export const createForm = <T extends Record<string, unknown>>(
  options: FormOptions<T>,
): FormController<T> => {
  return getProvider().createForm(options)
}
