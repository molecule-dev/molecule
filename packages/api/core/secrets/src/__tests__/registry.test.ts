import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as RegistryModule from '../registry.js'
import type { SecretDefinition, ServiceProvisioner } from '../types.js'

let registerProvisioner: typeof RegistryModule.registerProvisioner
let getProvisioner: typeof RegistryModule.getProvisioner
let getAllProvisioners: typeof RegistryModule.getAllProvisioners
let getProvisionerForSecret: typeof RegistryModule.getProvisionerForSecret
let getSecretDefinition: typeof RegistryModule.getSecretDefinition
let getSecretDefinitions: typeof RegistryModule.getSecretDefinitions
let registerSecrets: typeof RegistryModule.registerSecrets
let COMMON_SECRETS: typeof RegistryModule.COMMON_SECRETS

function createMockProvisioner(
  service: string,
  secrets: SecretDefinition[] = [],
): ServiceProvisioner {
  return {
    service,
    displayName: `${service} Provider`,
    secrets,
    isConfigured: vi.fn(() => Promise.resolve(false)),
    setup: vi.fn(() => Promise.resolve({ success: true })),
    validate: vi.fn(() => Promise.resolve({ service, healthy: true })),
    getSetupInstructions: vi.fn(() => `Setup ${service}`),
  }
}

describe('secrets registry', () => {
  beforeEach(async () => {
    vi.resetModules()
    const registryModule = await import('../registry.js')
    registerProvisioner = registryModule.registerProvisioner
    getProvisioner = registryModule.getProvisioner
    getAllProvisioners = registryModule.getAllProvisioners
    getProvisionerForSecret = registryModule.getProvisionerForSecret
    getSecretDefinition = registryModule.getSecretDefinition
    getSecretDefinitions = registryModule.getSecretDefinitions
    registerSecrets = registryModule.registerSecrets
    COMMON_SECRETS = registryModule.COMMON_SECRETS
  })

  describe('registerProvisioner', () => {
    it('should register a provisioner', () => {
      const provisioner = createMockProvisioner('stripe')
      registerProvisioner(provisioner)

      expect(getProvisioner('stripe')).toBe(provisioner)
    })

    it('should overwrite an existing provisioner with the same service name', () => {
      const provisioner1 = createMockProvisioner('stripe')
      const provisioner2 = createMockProvisioner('stripe')

      registerProvisioner(provisioner1)
      registerProvisioner(provisioner2)

      expect(getProvisioner('stripe')).toBe(provisioner2)
    })

    it('should register multiple provisioners', () => {
      const stripe = createMockProvisioner('stripe')
      const sendgrid = createMockProvisioner('sendgrid')
      const firebase = createMockProvisioner('firebase')

      registerProvisioner(stripe)
      registerProvisioner(sendgrid)
      registerProvisioner(firebase)

      expect(getProvisioner('stripe')).toBe(stripe)
      expect(getProvisioner('sendgrid')).toBe(sendgrid)
      expect(getProvisioner('firebase')).toBe(firebase)
    })
  })

  describe('getProvisioner', () => {
    it('should return undefined for unregistered service', () => {
      expect(getProvisioner('nonexistent')).toBeUndefined()
    })

    it('should return the registered provisioner', () => {
      const provisioner = createMockProvisioner('doppler')
      registerProvisioner(provisioner)
      expect(getProvisioner('doppler')).toBe(provisioner)
    })
  })

  describe('getAllProvisioners', () => {
    it('should return empty array when no provisioners registered', () => {
      expect(getAllProvisioners()).toEqual([])
    })

    it('should return all registered provisioners', () => {
      const stripe = createMockProvisioner('stripe')
      const sendgrid = createMockProvisioner('sendgrid')

      registerProvisioner(stripe)
      registerProvisioner(sendgrid)

      const all = getAllProvisioners()
      expect(all).toHaveLength(2)
      expect(all).toContain(stripe)
      expect(all).toContain(sendgrid)
    })
  })

  describe('getProvisionerForSecret', () => {
    it('should return undefined when no provisioner provides the secret', () => {
      expect(getProvisionerForSecret('UNKNOWN_KEY')).toBeUndefined()
    })

    it('should find provisioner by secret key', () => {
      const stripe = createMockProvisioner('stripe', [
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
        { key: 'STRIPE_PUBLISHABLE_KEY', description: 'Stripe publishable key' },
      ])
      registerProvisioner(stripe)

      expect(getProvisionerForSecret('STRIPE_SECRET_KEY')).toBe(stripe)
      expect(getProvisionerForSecret('STRIPE_PUBLISHABLE_KEY')).toBe(stripe)
    })

    it('should return the correct provisioner when multiple are registered', () => {
      const stripe = createMockProvisioner('stripe', [
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe key' },
      ])
      const sendgrid = createMockProvisioner('sendgrid', [
        { key: 'SENDGRID_API_KEY', description: 'SendGrid key' },
      ])

      registerProvisioner(stripe)
      registerProvisioner(sendgrid)

      expect(getProvisionerForSecret('STRIPE_SECRET_KEY')).toBe(stripe)
      expect(getProvisionerForSecret('SENDGRID_API_KEY')).toBe(sendgrid)
    })

    it('should return undefined for a key not in any provisioner', () => {
      const stripe = createMockProvisioner('stripe', [
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe key' },
      ])
      registerProvisioner(stripe)

      expect(getProvisionerForSecret('DATABASE_URL')).toBeUndefined()
    })
  })

  describe('COMMON_SECRETS', () => {
    it('should contain JWT keys', () => {
      expect(COMMON_SECRETS.JWT_PRIVATE_KEY).toBeDefined()
      expect(COMMON_SECRETS.JWT_PRIVATE_KEY.key).toBe('JWT_PRIVATE_KEY')
      expect(COMMON_SECRETS.JWT_PRIVATE_KEY.description).toBeTruthy()
      expect(COMMON_SECRETS.JWT_PUBLIC_KEY).toBeDefined()
      expect(COMMON_SECRETS.JWT_PUBLIC_KEY.key).toBe('JWT_PUBLIC_KEY')
      expect(COMMON_SECRETS.JWT_PUBLIC_KEY.description).toBeTruthy()
    })

    it('should contain NODE_ENV with default', () => {
      expect(COMMON_SECRETS.NODE_ENV).toBeDefined()
      expect(COMMON_SECRETS.NODE_ENV.default).toBe('development')
    })

    it('should contain PORT with default', () => {
      expect(COMMON_SECRETS.PORT).toBeDefined()
      expect(COMMON_SECRETS.PORT.default).toBe('3000')
    })

    it('should contain all expected generic secrets', () => {
      // JWT
      expect(COMMON_SECRETS.JWT_PRIVATE_KEY).toBeDefined()
      expect(COMMON_SECRETS.JWT_PUBLIC_KEY).toBeDefined()

      // App
      expect(COMMON_SECRETS.NODE_ENV).toBeDefined()
      expect(COMMON_SECRETS.PORT).toBeDefined()
      expect(COMMON_SECRETS.APP_URL).toBeDefined()
    })

    it('should not contain vendor-specific secrets', () => {
      // Vendor secrets have been moved to their respective bond packages
      expect(COMMON_SECRETS.DATABASE_URL).toBeUndefined()
      expect(COMMON_SECRETS.STRIPE_SECRET_KEY).toBeUndefined()
      expect(COMMON_SECRETS.REDIS_URL).toBeUndefined()
      expect(COMMON_SECRETS.DOPPLER_TOKEN).toBeUndefined()
      expect(COMMON_SECRETS.SENDGRID_API_KEY).toBeUndefined()
    })
  })

  describe('getSecretDefinition', () => {
    it('should return the definition for a known key', () => {
      const def = getSecretDefinition('NODE_ENV')
      expect(def).toBeDefined()
      expect(def!.key).toBe('NODE_ENV')
    })

    it('should return undefined for an unknown key', () => {
      expect(getSecretDefinition('UNKNOWN_SECRET_XYZ')).toBeUndefined()
    })

    it('should return definitions registered via registerSecrets', () => {
      registerSecrets([{ key: 'CUSTOM_VENDOR_KEY', description: 'A vendor secret' }])
      const def = getSecretDefinition('CUSTOM_VENDOR_KEY')
      expect(def).toBeDefined()
      expect(def!.key).toBe('CUSTOM_VENDOR_KEY')
    })
  })

  describe('getSecretDefinitions', () => {
    it('should return definitions for known keys', () => {
      const defs = getSecretDefinitions(['NODE_ENV', 'PORT', 'JWT_PRIVATE_KEY'])
      expect(defs).toHaveLength(3)
      expect(defs.map((d) => d.key)).toEqual(['NODE_ENV', 'PORT', 'JWT_PRIVATE_KEY'])
    })

    it('should filter out unknown keys', () => {
      const defs = getSecretDefinitions(['NODE_ENV', 'UNKNOWN_KEY', 'PORT'])
      expect(defs).toHaveLength(2)
      expect(defs.map((d) => d.key)).toEqual(['NODE_ENV', 'PORT'])
    })

    it('should return empty array for all unknown keys', () => {
      const defs = getSecretDefinitions(['UNKNOWN_A', 'UNKNOWN_B'])
      expect(defs).toEqual([])
    })

    it('should return empty array for empty input', () => {
      const defs = getSecretDefinitions([])
      expect(defs).toEqual([])
    })
  })
})
