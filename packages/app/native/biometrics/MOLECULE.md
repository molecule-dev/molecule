# @molecule/app-biometrics

Biometric authentication interface for molecule.dev.

Provides a unified API for biometric authentication (FaceID, TouchID,
Fingerprint) that works across different platforms.

## Type
`native`

## Installation
```bash
npm install @molecule/app-biometrics
```

## API

### Interfaces

#### `AuthenticateOptions`

Biometric authentication prompt configuration (reason text, title, fallback, max attempts).

```typescript
interface AuthenticateOptions {
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
```

#### `AuthenticateResult`

Biometric authentication outcome (success flag, error code, error message).

```typescript
interface AuthenticateResult {
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
```

#### `BiometricAvailability`

Biometric availability status.

```typescript
interface BiometricAvailability {
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
```

#### `BiometricsProvider`

Biometrics provider interface.

All biometrics providers must implement this interface.

```typescript
interface BiometricsProvider {
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
```

#### `CreateWebAuthnProviderOptions`

Options for creating a WebAuthn-based biometrics provider.

```typescript
interface CreateWebAuthnProviderOptions {
  /**
   * Optional translation function for i18n support.
   * When provided, error messages will be passed through this function.
   */
  t?: TranslateFn
}
```

### Types

#### `BiometricType`

Available biometric types.

```typescript
type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none'
```

### Functions

#### `authenticate(options)`

Authenticates the user with biometrics.

```typescript
function authenticate(options: AuthenticateOptions): Promise<AuthenticateResult>
```

- `options` — Authentication prompt configuration (reason, title, fallback settings).

**Returns:** The authentication result indicating success or error details.

#### `checkAvailability()`

Checks biometric availability on the device.

```typescript
function checkAvailability(): Promise<BiometricAvailability>
```

**Returns:** The availability status including biometric type, enrollment, and failure reason.

#### `createWebAuthnProvider(options)`

Creates a WebAuthn-based biometrics provider.

Uses the Web Authentication API for biometric authentication.
Note: Full biometric auth requires server-side credential storage.
This provides a simplified local authentication flow.

```typescript
function createWebAuthnProvider(options?: CreateWebAuthnProviderOptions): BiometricsProvider
```

- `options` — Optional configuration including a translation function for i18n.

**Returns:** A BiometricsProvider that uses WebAuthn for platform-based biometric authentication.

#### `getBiometricType()`

Gets the primary biometric type available on the device.

```typescript
function getBiometricType(): Promise<BiometricType>
```

**Returns:** The biometric type: 'fingerprint', 'face', 'iris', or 'none'.

#### `getProvider()`

Gets the current biometrics provider. Falls back to a WebAuthn-based provider if none is set.

```typescript
function getProvider(): BiometricsProvider
```

**Returns:** The active BiometricsProvider instance.

#### `hasProvider()`

Checks if a biometrics provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a BiometricsProvider has been bonded.

#### `isDeviceSecure()`

Checks if the device has a secure lock screen (PIN, password, or biometric).

```typescript
function isDeviceSecure(): Promise<boolean>
```

**Returns:** Whether the device is secure.

#### `setProvider(provider)`

Sets the biometrics provider implementation.

```typescript
function setProvider(provider: BiometricsProvider): void
```

- `provider` — The provider implementation.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-biometrics`.
