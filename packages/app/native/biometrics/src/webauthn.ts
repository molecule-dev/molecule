/**
 * `@molecule/app-biometrics`
 * WebAuthn-based biometrics provider implementation.
 */

import type {
  AuthenticateOptions,
  AuthenticateResult,
  BiometricAvailability,
  BiometricsProvider,
  BiometricType,
} from './types.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
) => string

/**
 * Options for creating a WebAuthn-based biometrics provider.
 */
export interface CreateWebAuthnProviderOptions {
  /**
   * Optional translation function for i18n support.
   * When provided, error messages will be passed through this function.
   */
  t?: TranslateFn
}

/**
 * Creates a WebAuthn-based biometrics provider.
 *
 * Uses the Web Authentication API for biometric authentication.
 * Note: Full biometric auth requires server-side credential storage.
 * This provides a simplified local authentication flow.
 * @param options - Optional configuration including a translation function for i18n.
 * @returns A BiometricsProvider that uses WebAuthn for platform-based biometric authentication.
 */
export const createWebAuthnProvider = (
  options?: CreateWebAuthnProviderOptions,
): BiometricsProvider => {
  const hasWebAuthn = typeof window !== 'undefined' && 'PublicKeyCredential' in window

  const translate = options?.t

  const msg = (key: string, defaultValue: string): string =>
    translate ? translate(key, undefined, { defaultValue }) : defaultValue

  return {
    async checkAvailability(): Promise<BiometricAvailability> {
      if (!hasWebAuthn) {
        return {
          available: false,
          biometricType: 'none',
          description: msg('biometrics.error.notSupported', 'WebAuthn not supported'),
          hasEnrolled: false,
          reason: 'no_hardware',
        }
      }

      try {
        // Check if platform authenticator is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

        if (!available) {
          return {
            available: false,
            biometricType: 'none',
            description: msg('biometrics.error.noPlatformAuth', 'No platform authenticator'),
            hasEnrolled: false,
            reason: 'no_hardware',
          }
        }

        // Determine biometric type based on platform
        const userAgent = navigator.userAgent.toLowerCase()
        let biometricType: BiometricType = 'fingerprint'
        let description = msg('biometrics.device.fingerprint', 'Fingerprint')

        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          if (userAgent.includes('iphone x') || userAgent.includes('iphone 1')) {
            biometricType = 'face'
            description = msg('biometrics.device.faceId', 'Face ID')
          } else {
            biometricType = 'fingerprint'
            description = msg('biometrics.device.touchId', 'Touch ID')
          }
        } else if (userAgent.includes('mac')) {
          biometricType = 'fingerprint'
          description = msg('biometrics.device.touchId', 'Touch ID')
        } else if (userAgent.includes('windows hello')) {
          biometricType = 'face'
          description = msg('biometrics.device.windowsHello', 'Windows Hello')
        }

        return {
          available: true,
          biometricType,
          description,
          hasEnrolled: true, // WebAuthn doesn't expose this directly
        }
      } catch {
        return {
          available: false,
          biometricType: 'none',
          description: msg('biometrics.error.checkFailed', 'Error checking availability'),
          hasEnrolled: false,
          reason: 'not_available',
        }
      }
    },

    async authenticate(_options: AuthenticateOptions): Promise<AuthenticateResult> {
      if (!hasWebAuthn) {
        return {
          success: false,
          errorCode: 'biometric_not_available',
          errorMessage: msg('biometrics.error.notSupported', 'WebAuthn not supported'),
        }
      }

      try {
        // For web, we use a simple challenge-response with the platform authenticator
        // In a real app, this would involve server-side credential verification

        const challenge = crypto.getRandomValues(new Uint8Array(32))

        // Try to get credentials (triggers biometric prompt)
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: [], // Empty allows any registered credential
          },
        })

        if (credential) {
          return { success: true }
        }

        return {
          success: false,
          errorCode: 'unknown',
          errorMessage: msg('biometrics.error.noCredential', 'No credential returned'),
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : msg('biometrics.error.unknown', 'Unknown error')

        if (errorMessage.includes('cancel') || errorMessage.includes('abort')) {
          return {
            success: false,
            errorCode: 'user_cancel',
            errorMessage: msg('biometrics.error.userCancel', 'User cancelled authentication'),
          }
        }

        if (errorMessage.includes('NotAllowedError')) {
          return {
            success: false,
            errorCode: 'permission_denied' as AuthenticateResult['errorCode'],
            errorMessage: msg('biometrics.error.permissionDenied', 'Permission denied'),
          }
        }

        return {
          success: false,
          errorCode: 'unknown',
          errorMessage,
        }
      }
    },

    async isDeviceSecure(): Promise<boolean> {
      // WebAuthn requires device to be secure
      if (!hasWebAuthn) return false

      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        return available
      } catch {
        return false
      }
    },

    async getBiometricType(): Promise<BiometricType> {
      const availability = await this.checkAvailability()
      return availability.biometricType
    },
  }
}
