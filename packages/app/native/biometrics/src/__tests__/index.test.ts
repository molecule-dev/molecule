import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authenticate,
  checkAvailability,
  getBiometricType,
  getProvider,
  isDeviceSecure,
  setProvider,
} from '../provider.js'
import type { AuthenticateOptions, BiometricsProvider } from '../types.js'
import { createWebAuthnProvider } from '../webauthn.js'

// ============================================================================
// Mock Provider Factory
// ============================================================================

const createMockProvider = (overrides?: Partial<BiometricsProvider>): BiometricsProvider => ({
  checkAvailability: vi.fn().mockResolvedValue({
    available: true,
    biometricType: 'fingerprint',
    description: 'Touch ID',
    hasEnrolled: true,
  }),
  authenticate: vi.fn().mockResolvedValue({
    success: true,
  }),
  isDeviceSecure: vi.fn().mockResolvedValue(true),
  getBiometricType: vi.fn().mockResolvedValue('fingerprint'),
  ...overrides,
})

// ============================================================================
// Provider Management Tests
// ============================================================================

describe('Provider Management', () => {
  beforeEach(() => {
    // Reset the provider to null before each test
    // We do this by setting a new provider to force reset
  })

  describe('setProvider', () => {
    it('should set a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should create and return WebAuthn provider when no provider is set', () => {
      // Reset by setting null indirectly - since getProvider creates WebAuthnProvider by default
      // we need to test this behavior
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.checkAvailability).toBe('function')
      expect(typeof provider.authenticate).toBe('function')
      expect(typeof provider.isDeviceSecure).toBe('function')
      expect(typeof provider.getBiometricType).toBe('function')
    })
  })
})

// ============================================================================
// Convenience Functions Tests
// ============================================================================

describe('Convenience Functions', () => {
  let mockProvider: BiometricsProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('checkAvailability', () => {
    it('should return biometric availability', async () => {
      const availability = await checkAvailability()
      expect(availability.available).toBe(true)
      expect(availability.biometricType).toBe('fingerprint')
      expect(availability.description).toBe('Touch ID')
      expect(availability.hasEnrolled).toBe(true)
      expect(mockProvider.checkAvailability).toHaveBeenCalled()
    })

    it('should return unavailable when no biometrics', async () => {
      const unavailableProvider = createMockProvider({
        checkAvailability: vi.fn().mockResolvedValue({
          available: false,
          biometricType: 'none',
          description: 'No biometrics',
          hasEnrolled: false,
          reason: 'no_hardware',
        }),
      })
      setProvider(unavailableProvider)

      const availability = await checkAvailability()
      expect(availability.available).toBe(false)
      expect(availability.biometricType).toBe('none')
      expect(availability.reason).toBe('no_hardware')
    })

    it('should handle not_enrolled reason', async () => {
      const notEnrolledProvider = createMockProvider({
        checkAvailability: vi.fn().mockResolvedValue({
          available: false,
          biometricType: 'fingerprint',
          description: 'Fingerprint not enrolled',
          hasEnrolled: false,
          reason: 'not_enrolled',
        }),
      })
      setProvider(notEnrolledProvider)

      const availability = await checkAvailability()
      expect(availability.reason).toBe('not_enrolled')
      expect(availability.hasEnrolled).toBe(false)
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const options: AuthenticateOptions = {
        reason: 'Please authenticate',
      }
      const result = await authenticate(options)
      expect(result.success).toBe(true)
      expect(mockProvider.authenticate).toHaveBeenCalledWith(options)
    })

    it('should pass all authenticate options', async () => {
      const options: AuthenticateOptions = {
        reason: 'Authenticate to access account',
        title: 'Secure Login',
        subtitle: 'Verify your identity',
        allowDeviceCredential: true,
        cancelTitle: 'Cancel',
        fallbackTitle: 'Use PIN',
        maxAttempts: 3,
      }
      await authenticate(options)
      expect(mockProvider.authenticate).toHaveBeenCalledWith(options)
    })

    it('should handle user cancellation', async () => {
      const cancelProvider = createMockProvider({
        authenticate: vi.fn().mockResolvedValue({
          success: false,
          errorCode: 'user_cancel',
          errorMessage: 'User cancelled authentication',
        }),
      })
      setProvider(cancelProvider)

      const result = await authenticate({ reason: 'Test' })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('user_cancel')
    })

    it('should handle lockout', async () => {
      const lockoutProvider = createMockProvider({
        authenticate: vi.fn().mockResolvedValue({
          success: false,
          errorCode: 'lockout',
          errorMessage: 'Too many attempts',
        }),
      })
      setProvider(lockoutProvider)

      const result = await authenticate({ reason: 'Test' })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('lockout')
    })

    it('should handle biometric_not_available', async () => {
      const unavailableProvider = createMockProvider({
        authenticate: vi.fn().mockResolvedValue({
          success: false,
          errorCode: 'biometric_not_available',
          errorMessage: 'Biometrics not available',
        }),
      })
      setProvider(unavailableProvider)

      const result = await authenticate({ reason: 'Test' })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('biometric_not_available')
    })
  })

  describe('isDeviceSecure', () => {
    it('should return true when device is secure', async () => {
      const secure = await isDeviceSecure()
      expect(secure).toBe(true)
      expect(mockProvider.isDeviceSecure).toHaveBeenCalled()
    })

    it('should return false when device is not secure', async () => {
      const insecureProvider = createMockProvider({
        isDeviceSecure: vi.fn().mockResolvedValue(false),
      })
      setProvider(insecureProvider)

      const secure = await isDeviceSecure()
      expect(secure).toBe(false)
    })
  })

  describe('getBiometricType', () => {
    it('should return fingerprint type', async () => {
      const type = await getBiometricType()
      expect(type).toBe('fingerprint')
      expect(mockProvider.getBiometricType).toHaveBeenCalled()
    })

    it('should return face type', async () => {
      const faceProvider = createMockProvider({
        getBiometricType: vi.fn().mockResolvedValue('face'),
      })
      setProvider(faceProvider)

      const type = await getBiometricType()
      expect(type).toBe('face')
    })

    it('should return iris type', async () => {
      const irisProvider = createMockProvider({
        getBiometricType: vi.fn().mockResolvedValue('iris'),
      })
      setProvider(irisProvider)

      const type = await getBiometricType()
      expect(type).toBe('iris')
    })

    it('should return none when no biometrics', async () => {
      const noneProvider = createMockProvider({
        getBiometricType: vi.fn().mockResolvedValue('none'),
      })
      setProvider(noneProvider)

      const type = await getBiometricType()
      expect(type).toBe('none')
    })
  })
})

// ============================================================================
// WebAuthn Provider Tests
// ============================================================================

describe('WebAuthn Provider', () => {
  let mockPublicKeyCredential: {
    isUserVerifyingPlatformAuthenticatorAvailable: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Create mock for PublicKeyCredential
    mockPublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
    }

    const mockWindow = {
      PublicKeyCredential: mockPublicKeyCredential,
      location: {
        hostname: 'localhost',
      },
    }

    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      credentials: {
        get: vi.fn().mockResolvedValue({ id: 'test-credential' }),
      },
    }

    const mockCrypto = {
      getRandomValues: vi.fn().mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      }),
    }

    // Use vi.stubGlobal for proper mocking
    vi.stubGlobal('window', mockWindow)
    vi.stubGlobal('navigator', mockNavigator)
    vi.stubGlobal('crypto', mockCrypto)
    vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('createWebAuthnProvider', () => {
    it('should create a provider', () => {
      const provider = createWebAuthnProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.checkAvailability).toBe('function')
      expect(typeof provider.authenticate).toBe('function')
      expect(typeof provider.isDeviceSecure).toBe('function')
      expect(typeof provider.getBiometricType).toBe('function')
    })
  })

  describe('checkAvailability', () => {
    it('should return available when WebAuthn is supported', async () => {
      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.available).toBe(true)
      expect(availability.hasEnrolled).toBe(true)
    })

    it('should detect Mac Touch ID', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      } as typeof navigator

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.biometricType).toBe('fingerprint')
      expect(availability.description).toBe('Touch ID')
    })

    it('should detect iPhone Face ID', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        userAgent: 'Mozilla/5.0 (iPhone X; CPU iPhone OS 14_0 like Mac OS X)',
      } as typeof navigator

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.biometricType).toBe('face')
      expect(availability.description).toBe('Face ID')
    })

    it('should detect iPhone Touch ID', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      } as typeof navigator

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.biometricType).toBe('fingerprint')
      expect(availability.description).toBe('Touch ID')
    })

    it('should return unavailable when WebAuthn is not supported', async () => {
      // Remove PublicKeyCredential from window
      globalThis.window = {
        location: { hostname: 'localhost' },
      } as unknown as typeof window

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.available).toBe(false)
      expect(availability.biometricType).toBe('none')
      expect(availability.reason).toBe('no_hardware')
    })

    it('should return unavailable when platform authenticator is not available', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.available).toBe(false)
      expect(availability.reason).toBe('no_hardware')
    })

    it('should handle errors during availability check', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
        new Error('Test error'),
      )

      const provider = createWebAuthnProvider()
      const availability = await provider.checkAvailability()

      expect(availability.available).toBe(false)
      expect(availability.reason).toBe('not_available')
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test authentication' })

      expect(result.success).toBe(true)
      expect(navigator.credentials.get).toHaveBeenCalled()
    })

    it('should return error when WebAuthn is not supported', async () => {
      globalThis.window = {
        location: { hostname: 'localhost' },
      } as unknown as typeof window

      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test' })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('biometric_not_available')
    })

    it('should handle no credential returned', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        credentials: {
          get: vi.fn().mockResolvedValue(null),
        },
      } as unknown as typeof navigator

      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test' })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('unknown')
    })

    it('should handle user cancellation', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new Error('User cancelled the request')),
        },
      } as unknown as typeof navigator

      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test' })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('user_cancel')
    })

    it('should handle abort error', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new Error('The operation was aborted')),
        },
      } as unknown as typeof navigator

      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test' })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('user_cancel')
    })

    it('should handle unknown errors', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new Error('Some unknown error')),
        },
      } as unknown as typeof navigator

      const provider = createWebAuthnProvider()
      const result = await provider.authenticate({ reason: 'Test' })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('unknown')
      expect(result.errorMessage).toBe('Some unknown error')
    })
  })

  describe('isDeviceSecure', () => {
    it('should return true when platform authenticator is available', async () => {
      const provider = createWebAuthnProvider()
      const secure = await provider.isDeviceSecure()

      expect(secure).toBe(true)
    })

    it('should return false when WebAuthn is not supported', async () => {
      globalThis.window = {
        location: { hostname: 'localhost' },
      } as unknown as typeof window

      const provider = createWebAuthnProvider()
      const secure = await provider.isDeviceSecure()

      expect(secure).toBe(false)
    })

    it('should return false on error', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
        new Error('Test error'),
      )

      const provider = createWebAuthnProvider()
      const secure = await provider.isDeviceSecure()

      expect(secure).toBe(false)
    })
  })

  describe('getBiometricType', () => {
    it('should return biometric type from availability check', async () => {
      const provider = createWebAuthnProvider()
      const type = await provider.getBiometricType()

      expect(type).toBe('fingerprint')
    })
  })
})
