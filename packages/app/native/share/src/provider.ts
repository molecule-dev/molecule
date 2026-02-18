/**
 * `@molecule/app-share`
 * Provider management for share module.
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  ShareCapabilities,
  ShareContent,
  ShareFile,
  ShareOptions,
  ShareProvider,
  ShareResult,
} from './types.js'

const BOND_TYPE = 'share'

/**
 * Set the share provider.
 * @param provider - ShareProvider implementation to register.
 */
export function setProvider(provider: ShareProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current share provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active ShareProvider instance.
 */
export function getProvider(): ShareProvider {
  const provider = bondGet<ShareProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('share.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-share: No provider set. ' +
          'Call setProvider() with a ShareProvider implementation ' +
          '(e.g., from @molecule/app-share-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a share provider has been registered.
 * @returns Whether a ShareProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Share content using the native share sheet.
 * @param options - Content, files, and dialog configuration to share.
 * @returns The share result indicating completion status and activity type.
 */
export async function share(options: ShareOptions): Promise<ShareResult> {
  return getProvider().share(options)
}

/**
 * Share text content via the native share sheet.
 * @param text - The text content to share.
 * @param title - Optional title for the share dialog.
 * @returns The share result indicating completion status and activity type.
 */
export async function shareText(text: string, title?: string): Promise<ShareResult> {
  return getProvider().shareText(text, title)
}

/**
 * Share a URL via the native share sheet.
 * @param url - The URL to share.
 * @param title - Optional title for the share dialog.
 * @returns The share result indicating completion status and activity type.
 */
export async function shareUrl(url: string, title?: string): Promise<ShareResult> {
  return getProvider().shareUrl(url, title)
}

/**
 * Share one or more files via the native share sheet.
 * @param files - The files to share, with paths and optional MIME types.
 * @param options - Additional share content (title, text, URL) to include.
 * @returns The share result indicating completion status and activity type.
 */
export async function shareFiles(files: ShareFile[], options?: ShareContent): Promise<ShareResult> {
  return getProvider().shareFiles(files, options)
}

/**
 * Check if the native share sheet is available on this platform.
 * Returns false without throwing if no provider is set.
 * @returns Whether sharing is supported.
 */
export async function canShare(): Promise<boolean> {
  if (!hasProvider()) {
    return false
  }
  return getProvider().canShare()
}

/**
 * Check if the given content can be shared on this platform.
 * Returns false without throwing if no provider is set.
 * @param options - The share options to validate.
 * @returns Whether the specified content can be shared.
 */
export async function canShareContent(options: ShareOptions): Promise<boolean> {
  if (!hasProvider()) {
    return false
  }
  return getProvider().canShareContent(options)
}

/**
 * Get the platform's sharing capabilities.
 * @returns The capabilities indicating file sharing support and allowed MIME types.
 */
export async function getCapabilities(): Promise<ShareCapabilities> {
  return getProvider().getCapabilities()
}
