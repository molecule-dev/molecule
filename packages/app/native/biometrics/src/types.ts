/**
 * `@molecule/app-biometrics`
 * Type definitions for biometrics module.
 *
 * @module
 */

/**
 * Available biometric types.
 */
export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none'

/**
 * Biometric availability status.
 */
export interface BiometricAvailability {
  /**
   * Whether biometrics is available.
   */
  available: boolean

  /**
   * Available biometric type.
   */
  biometricType: BiometricType

  /**
   * Human-readable description.
   */
  description: string

  /**
   * Whether the device has enrolled biometrics.
   */
  hasEnrolled: boolean

  /**
   * Reason if not available.
   */
  reason?: 'no_hardware' | 'not_enrolled' | 'not_available' | 'permission_denied'
}

/**
 * Biometric authentication prompt configuration (reason text, title, fallback, max attempts).
 */
export interface AuthenticateOptions {
  /**
   * Reason/prompt to show the user.
   */
  reason: string

  /**
   * Title for the biometric prompt (Android).
   */
  title?: string

  /**
   * Subtitle for the biometric prompt (Android).
   */
  subtitle?: string

  /**
   * Whether to allow device credentials as fallback.
   */
  allowDeviceCredential?: boolean

  /**
   * Text for the cancel button.
   */
  cancelTitle?: string

  /**
   * Text for the fallback button (iOS).
   */
  fallbackTitle?: string

  /**
   * Maximum number of attempts.
   */
  maxAttempts?: number
}

/**
 * Biometric authentication outcome (success flag, error code, error message).
 */
export interface AuthenticateResult {
  /**
   * Whether authentication succeeded.
   */
  success: boolean

  /**
   * Error code if failed.
   */
  errorCode?:
    | 'user_cancel'
    | 'user_fallback'
    | 'system_cancel'
    | 'lockout'
    | 'biometric_not_enrolled'
    | 'biometric_not_available'
    | 'unknown'

  /**
   * Error message if failed.
   */
  errorMessage?: string
}

/**
 * Biometrics provider interface.
 *
 * All biometrics providers must implement this interface.
 */
export interface BiometricsProvider {
  /**
   * Checks biometric availability on the device.
   * @returns The availability status including biometric type, enrollment, and failure reason.
   */
  checkAvailability(): Promise<BiometricAvailability>

  /**
   * Authenticates the user with biometrics.
   * @param options - Authentication prompt configuration (reason, title, fallback settings).
   * @returns The authentication result indicating success or error details.
   */
  authenticate(options: AuthenticateOptions): Promise<AuthenticateResult>

  /**
   * Checks if the device is secure (has PIN/password/biometric).
   * @returns Whether the device has a secure lock screen configured.
   */
  isDeviceSecure(): Promise<boolean>

  /**
   * Gets the primary biometric type available on the device.
   * @returns The biometric type: 'fingerprint', 'face', 'iris', or 'none'.
   */
  getBiometricType(): Promise<BiometricType>
}
