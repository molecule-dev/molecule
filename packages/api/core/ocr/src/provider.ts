/**
 * OCR provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { OcrProvider } from './types.js'

const BOND_TYPE = 'ocr'
expectBond(BOND_TYPE)

/**
 * Registers an OCR provider.
 *
 * @param provider - The OCR provider to bond.
 */
export function setProvider(provider: OcrProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded OCR provider, or `null` if none is bonded.
 *
 * @returns The bonded provider, or `null`.
 */
export function getProvider(): OcrProvider | null {
  return bondGet<OcrProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an OCR provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded OCR provider, throwing if none is bonded.
 * Use this when OCR functionality is required.
 *
 * @returns The bonded OCR provider.
 */
export function requireProvider(): OcrProvider {
  try {
    return bondRequire<OcrProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('ocr.error.noProvider', undefined, {
        defaultValue:
          'OCR provider not configured. Bond an ocr provider first (e.g. @molecule/api-ocr-llm).',
      }),
      { cause: error },
    )
  }
}
