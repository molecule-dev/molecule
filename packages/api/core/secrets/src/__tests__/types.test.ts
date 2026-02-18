import { describe, expect, it } from 'vitest'

import type {
  HealthCheckResult,
  PackageSecrets,
  ProvisionerOptions,
  ProvisionerResult,
  Secret,
  SecretDefinition,
  SecretsProvider,
  SecretValidation,
  ServiceProvisioner,
} from '../types.js'

describe('secrets types', () => {
  describe('Secret', () => {
    it('should allow creating a secret with all properties', () => {
      const secret: Secret = {
        key: 'API_KEY',
        value: 'secret-value',
        required: true,
        description: 'An API key',
        helpUrl: 'https://example.com/help',
        pattern: '^sk_',
        example: 'sk_test_123',
      }
      expect(secret.key).toBe('API_KEY')
      expect(secret.value).toBe('secret-value')
      expect(secret.required).toBe(true)
    })

    it('should allow creating a secret with only required properties', () => {
      const secret: Secret = {
        key: 'DB_URL',
        value: undefined,
        required: false,
      }
      expect(secret.key).toBe('DB_URL')
      expect(secret.value).toBeUndefined()
    })
  })

  describe('SecretDefinition', () => {
    it('should allow creating a definition with all properties', () => {
      const def: SecretDefinition = {
        key: 'STRIPE_KEY',
        description: 'Stripe API key',
        required: true,
        helpUrl: 'https://stripe.com',
        pattern: '^sk_',
        example: 'sk_test_abc',
        default: 'sk_test_default',
      }
      expect(def.key).toBe('STRIPE_KEY')
      expect(def.description).toBe('Stripe API key')
      expect(def.default).toBe('sk_test_default')
    })

    it('should allow creating a definition with only required properties', () => {
      const def: SecretDefinition = {
        key: 'SIMPLE_KEY',
        description: 'A simple key',
      }
      expect(def.key).toBe('SIMPLE_KEY')
      expect(def.required).toBeUndefined()
    })
  })

  describe('SecretValidation', () => {
    it('should represent a valid secret', () => {
      const validation: SecretValidation = {
        key: 'API_KEY',
        valid: true,
        value: '***',
      }
      expect(validation.valid).toBe(true)
      expect(validation.error).toBeUndefined()
    })

    it('should represent an invalid secret', () => {
      const validation: SecretValidation = {
        key: 'MISSING_KEY',
        valid: false,
        error: 'Required secret is not set',
      }
      expect(validation.valid).toBe(false)
      expect(validation.error).toBeTruthy()
    })
  })

  describe('HealthCheckResult', () => {
    it('should represent a healthy service', () => {
      const result: HealthCheckResult = {
        service: 'database',
        healthy: true,
        latencyMs: 42,
        details: { version: '15.0' },
      }
      expect(result.healthy).toBe(true)
      expect(result.latencyMs).toBe(42)
    })

    it('should represent an unhealthy service', () => {
      const result: HealthCheckResult = {
        service: 'redis',
        healthy: false,
        error: 'Connection refused',
      }
      expect(result.healthy).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('SecretsProvider', () => {
    it('should accept a provider with required methods', () => {
      const provider: SecretsProvider = {
        name: 'test-provider',
        get: async (_key: string) => 'value',
        getMany: async (_keys: string[]) => ({}),
        isAvailable: async () => true,
      }
      expect(provider.name).toBe('test-provider')
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
    })

    it('should accept a provider with optional methods', () => {
      const provider: SecretsProvider = {
        name: 'full-provider',
        get: async () => 'value',
        getMany: async () => ({}),
        isAvailable: async () => true,
        set: async (_key: string, _value: string) => {},
        delete: async (_key: string) => {},
        syncToEnv: async (_keys: string[]) => {},
      }
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('ServiceProvisioner', () => {
    it('should accept a provisioner with all required properties', () => {
      const provisioner: ServiceProvisioner = {
        service: 'stripe',
        displayName: 'Stripe',
        secrets: [{ key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' }],
        isConfigured: async () => true,
        setup: async () => ({ success: true }),
        validate: async () => ({ service: 'stripe', healthy: true }),
        getSetupInstructions: () => 'Visit https://stripe.com',
      }
      expect(provisioner.service).toBe('stripe')
      expect(provisioner.secrets).toHaveLength(1)
    })
  })

  describe('ProvisionerOptions', () => {
    it('should allow all optional properties', () => {
      const provider: SecretsProvider = {
        name: 'test',
        get: async () => undefined,
        getMany: async () => ({}),
        isAvailable: async () => true,
      }
      const options: ProvisionerOptions = {
        nonInteractive: true,
        secretsProvider: provider,
        sandbox: true,
      }
      expect(options.nonInteractive).toBe(true)
      expect(options.sandbox).toBe(true)
    })

    it('should allow empty options', () => {
      const options: ProvisionerOptions = {}
      expect(options.nonInteractive).toBeUndefined()
    })
  })

  describe('ProvisionerResult', () => {
    it('should represent a successful result', () => {
      const result: ProvisionerResult = {
        success: true,
        secrets: { API_KEY: 'sk_test_123' },
        message: 'Setup complete',
      }
      expect(result.success).toBe(true)
      expect(result.secrets).toBeDefined()
    })

    it('should represent a failed result', () => {
      const result: ProvisionerResult = {
        success: false,
        error: 'Authentication failed',
      }
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('PackageSecrets', () => {
    it('should define package secret requirements', () => {
      const pkg: PackageSecrets = {
        package: '@molecule/api-payments-stripe',
        secrets: [
          { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
          { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook secret' },
        ],
      }
      expect(pkg.package).toBe('@molecule/api-payments-stripe')
      expect(pkg.secrets).toHaveLength(2)
    })
  })
})
