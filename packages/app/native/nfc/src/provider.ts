/**
 * `@molecule/app-nfc`
 * Provider management for NFC module
 */

import { t } from '@molecule/app-i18n'

import type {
  NdefMessage,
  NfcCapabilities,
  NfcPermissionStatus,
  NfcProvider,
  NfcScanOptions,
  NfcTag,
  NfcWriteOptions,
} from './types.js'

// ============================================================================
// Provider Management
// ============================================================================

let currentProvider: NfcProvider | null = null

/**
 * Set the NFC provider.
 * @param provider - NfcProvider implementation to register.
 */
export function setProvider(provider: NfcProvider): void {
  currentProvider = provider
}

/**
 * Get the current NFC provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active NfcProvider instance.
 */
export function getProvider(): NfcProvider {
  if (!currentProvider) {
    throw new Error(
      t('nfc.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-nfc: No provider set. Call setProvider() with an NfcProvider implementation (e.g., from @molecule/app-nfc-capacitor).',
      }),
    )
  }
  return currentProvider
}

/**
 * Check if an NFC provider has been registered.
 * @returns Whether an NfcProvider has been set.
 */
export function hasProvider(): boolean {
  return currentProvider !== null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Start scanning for NFC tags. The callback fires each time a tag is detected.
 * @param callback - Called with the detected NfcTag data.
 * @param options - Scan configuration (keep-alive, alert message, timeout).
 * @returns A function that stops the NFC scan when called.
 */
export function startScan(callback: (tag: NfcTag) => void, options?: NfcScanOptions): () => void {
  return getProvider().startScan(callback, options)
}

/**
 * Scan for a single NFC tag and return its data.
 * @param options - Scan configuration (alert message, timeout).
 * @returns The detected NFC tag.
 */
export async function scanOnce(options?: NfcScanOptions): Promise<NfcTag> {
  return getProvider().scanOnce(options)
}

/**
 * Write an NDEF message to the next detected NFC tag.
 * @param message - The NDEF message containing records to write.
 * @param options - Write configuration (make read-only, alert message).
 * @returns A promise that resolves when the message is written to the tag.
 */
export async function write(message: NdefMessage, options?: NfcWriteOptions): Promise<void> {
  return getProvider().write(message, options)
}

/**
 * Erase the NFC tag by writing an empty NDEF message.
 * @returns A promise that resolves when the tag is erased.
 */
export async function erase(): Promise<void> {
  return getProvider().erase()
}

/**
 * Make the NFC tag permanently read-only. This operation is irreversible.
 * @returns A promise that resolves when the tag is made read-only.
 */
export async function makeReadOnly(): Promise<void> {
  return getProvider().makeReadOnly()
}

/**
 * Check if NFC hardware is present and enabled on the device.
 * Returns false without throwing if no provider is set.
 * @returns Whether NFC is available and enabled.
 */
export async function isAvailable(): Promise<boolean> {
  if (!hasProvider()) return false
  return getProvider().isAvailable()
}

/**
 * Check if NFC is enabled in the device settings.
 * @returns Whether NFC is currently enabled.
 */
export async function isEnabled(): Promise<boolean> {
  return getProvider().isEnabled()
}

/**
 * Open the device's NFC settings screen so the user can enable NFC.
 * @returns A promise that resolves when the settings screen is opened.
 */
export async function openSettings(): Promise<void> {
  return getProvider().openSettings()
}

/**
 * Get the current NFC permission status.
 * @returns The permission status: 'granted', 'denied', 'prompt', 'disabled', or 'unsupported'.
 */
export async function getPermissionStatus(): Promise<NfcPermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request NFC permission from the user.
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<NfcPermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Get the platform's NFC capabilities.
 * @returns The capabilities indicating NFC support, read/write ability, and supported tag types.
 */
export async function getCapabilities(): Promise<NfcCapabilities> {
  return getProvider().getCapabilities()
}
