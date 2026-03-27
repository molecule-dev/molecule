/**
 * ColorPicker provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ColorPickerProvider } from './types.js'

let _provider: ColorPickerProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ColorPickerProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ColorPickerProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): ColorPickerProvider {
  if (!_provider) {
    throw new Error('ColorPicker provider not configured. Bond a color-picker provider first.')
  }
  return _provider
}
