/**
 * Tests for the User resource types, schema, and definition.
 */

import { describe, expect, it } from 'vitest'

import { createResource, resource } from '../resource.js'
import {
  createOAuthPropsSchema,
  createPropsSchema,
  createSchema,
  createSecretPropsSchema,
  propsSchema,
  secretPropsSchema,
  sessionSchema,
  updatePasswordSecretPropsSchema,
  updatePlanPropsSchema,
  updatePropsSchema,
  verifyTwoFactorPropsSchema,
  verifyTwoFactorSecretPropsSchema,
} from '../schema.js'
import type * as types from '../types.js'

describe('User resource definition', () => {
  it('should have correct name', () => {
    expect(resource.name).toBe('User')
  })

  it('should have correct tableName', () => {
    expect(resource.tableName).toBe('users')
  })

  it('should have a schema', () => {
    expect(resource.schema).toBeDefined()
    expect(resource.schema.safeParse).toBeDefined()
  })
})

describe('createResource', () => {
  it('should create default resource without options', () => {
    const defaultResource = createResource()

    expect(defaultResource.name).toBe('User')
    expect(defaultResource.tableName).toBe('users')
    expect(defaultResource.schema).toBeDefined()
  })

  it('should create resource with constrained OAuth servers', () => {
    const customResource = createResource({
      oauthServers: ['google', 'github', 'apple'] as const,
    })

    expect(customResource.name).toBe('User')
    expect(customResource.tableName).toBe('users')
    expect(customResource.schema).toBeDefined()

    // Test that valid OAuth server passes
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      oauthServer: 'google',
    }

    const result = customResource.schema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should create resource with constrained plan keys', () => {
    const customResource = createResource({
      planKeys: ['free', 'pro', 'enterprise'] as const,
    })

    expect(customResource.schema).toBeDefined()

    // Test that valid plan key passes
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      planKey: 'pro',
    }

    const result = customResource.schema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should create resource with both OAuth servers and plan keys', () => {
    const customResource = createResource({
      oauthServers: ['google', 'github'] as const,
      planKeys: ['basic', 'premium'] as const,
    })

    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      oauthServer: 'github',
      planKey: 'premium',
    }

    const result = customResource.schema.safeParse(validProps)
    expect(result.success).toBe(true)
  })
})

describe('createSchema', () => {
  it('should create schema with default options', () => {
    const schema = createSchema()
    expect(schema).toBeDefined()
    expect(schema.safeParse).toBeDefined()
  })

  it('should create schema with OAuth server enum', () => {
    const schema = createSchema({
      oauthServers: ['google', 'microsoft'] as const,
    })

    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      oauthServer: 'google',
    }

    const result = schema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should create schema with plan key enum', () => {
    const schema = createSchema({
      planKeys: ['starter', 'growth'] as const,
    })

    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      planKey: 'starter',
    }

    const result = schema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('propsSchema', () => {
  it('should validate valid user props', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
      name: 'John Doe',
      email: 'john@example.com',
      twoFactorEnabled: true,
      oauthServer: 'google',
      oauthId: 'oauth-id-123',
      oauthData: { profile: 'data' },
      planKey: 'pro',
      planExpiresAt: '2025-01-01T00:00:00.000Z',
      planAutoRenews: true,
    }

    const result = propsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal user props', () => {
    const minimalProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
    }

    const result = propsSchema.safeParse(minimalProps)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const invalidProps = {
      id: 'not-a-uuid',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid email', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
      email: 'not-an-email',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should accept null email', () => {
    const props = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
      email: null,
    }

    const result = propsSchema.safeParse(props)
    expect(result.success).toBe(true)
  })

  it('should reject missing username', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid planExpiresAt datetime', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
      planExpiresAt: 'not-a-date',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should accept valid oauthData record', () => {
    const props = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'johndoe',
      oauthData: {
        name: 'John',
        picture: 'https://example.com/photo.jpg',
        nested: { key: 'value' },
      },
    }

    const result = propsSchema.safeParse(props)
    expect(result.success).toBe(true)
  })
})

describe('secretPropsSchema', () => {
  it('should validate valid secret props', () => {
    const validSecretProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      passwordHash: '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      passwordResetToken: 'reset-token-123',
      passwordResetTokenAt: '2024-01-01T00:00:00.000Z',
      pendingTwoFactorSecret: 'pending-secret',
      twoFactorSecret: 'active-secret',
    }

    const result = secretPropsSchema.safeParse(validSecretProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal secret props', () => {
    const minimalSecretProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = secretPropsSchema.safeParse(minimalSecretProps)
    expect(result.success).toBe(true)
  })

  it('should require valid UUID for id', () => {
    const invalidSecretProps = {
      id: 'not-a-uuid',
    }

    const result = secretPropsSchema.safeParse(invalidSecretProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid passwordResetTokenAt datetime', () => {
    const invalidSecretProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      passwordResetTokenAt: 'not-a-date',
    }

    const result = secretPropsSchema.safeParse(invalidSecretProps)
    expect(result.success).toBe(false)
  })
})

describe('createPropsSchema', () => {
  it('should validate valid create props', () => {
    const validCreateProps = {
      username: 'newuser',
      name: 'New User',
      email: 'newuser@example.com',
    }

    const result = createPropsSchema.safeParse(validCreateProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal create props', () => {
    const minimalCreateProps = {
      username: 'newuser',
    }

    const result = createPropsSchema.safeParse(minimalCreateProps)
    expect(result.success).toBe(true)
  })

  it('should reject missing username', () => {
    const invalidCreateProps = {
      name: 'New User',
      email: 'newuser@example.com',
    }

    const result = createPropsSchema.safeParse(invalidCreateProps)
    expect(result.success).toBe(false)
  })

  it('should not include id field', () => {
    const propsWithId = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'newuser',
    }

    const result = createPropsSchema.safeParse(propsWithId)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('id')
    }
  })
})

describe('createSecretPropsSchema', () => {
  it('should validate valid create secret props', () => {
    const validCreateSecretProps = {
      passwordHash: '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    }

    const result = createSecretPropsSchema.safeParse(validCreateSecretProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty create secret props', () => {
    const emptyProps = {}

    const result = createSecretPropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })
})

describe('createOAuthPropsSchema', () => {
  it('should validate valid OAuth create props', () => {
    const validOAuthProps = {
      username: 'oauthuser',
      name: 'OAuth User',
      email: 'oauth@example.com',
      oauthServer: 'google',
      oauthId: 'google-oauth-id-123',
      oauthData: { profile: 'data' },
    }

    const result = createOAuthPropsSchema.safeParse(validOAuthProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal OAuth create props', () => {
    const minimalOAuthProps = {
      username: 'oauthuser',
    }

    const result = createOAuthPropsSchema.safeParse(minimalOAuthProps)
    expect(result.success).toBe(true)
  })

  it('should reject missing username', () => {
    const invalidOAuthProps = {
      oauthServer: 'google',
      oauthId: 'google-oauth-id-123',
    }

    const result = createOAuthPropsSchema.safeParse(invalidOAuthProps)
    expect(result.success).toBe(false)
  })
})

describe('updatePropsSchema', () => {
  it('should validate valid update props', () => {
    const validUpdateProps = {
      username: 'updateduser',
      name: 'Updated User',
      email: 'updated@example.com',
    }

    const result = updatePropsSchema.safeParse(validUpdateProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty update props', () => {
    const emptyProps = {}

    const result = updatePropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })

  it('should validate partial update props', () => {
    const partialProps = {
      name: 'New Name',
    }

    const result = updatePropsSchema.safeParse(partialProps)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const invalidProps = {
      email: 'not-an-email',
    }

    const result = updatePropsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })
})

describe('updatePasswordSecretPropsSchema', () => {
  it('should validate valid password update props', () => {
    const validProps = {
      passwordHash: '$2b$10$NEWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    }

    const result = updatePasswordSecretPropsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty password update props', () => {
    const emptyProps = {}

    const result = updatePasswordSecretPropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })
})

describe('updatePlanPropsSchema', () => {
  it('should validate valid plan update props', () => {
    const validPlanProps = {
      planKey: 'enterprise',
      planExpiresAt: '2025-12-31T23:59:59.000Z',
      planAutoRenews: true,
    }

    const result = updatePlanPropsSchema.safeParse(validPlanProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty plan update props', () => {
    const emptyProps = {}

    const result = updatePlanPropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })

  it('should validate partial plan update props', () => {
    const partialProps = {
      planKey: 'pro',
    }

    const result = updatePlanPropsSchema.safeParse(partialProps)
    expect(result.success).toBe(true)
  })

  it('should reject invalid planExpiresAt', () => {
    const invalidProps = {
      planExpiresAt: 'invalid-date',
    }

    const result = updatePlanPropsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })
})

describe('verifyTwoFactorPropsSchema', () => {
  it('should validate valid two-factor props', () => {
    const validProps = {
      twoFactorEnabled: true,
    }

    const result = verifyTwoFactorPropsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty two-factor props', () => {
    const emptyProps = {}

    const result = verifyTwoFactorPropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })

  it('should accept false value', () => {
    const disabledProps = {
      twoFactorEnabled: false,
    }

    const result = verifyTwoFactorPropsSchema.safeParse(disabledProps)
    expect(result.success).toBe(true)
  })
})

describe('verifyTwoFactorSecretPropsSchema', () => {
  it('should validate valid two-factor secret props', () => {
    const validProps = {
      pendingTwoFactorSecret: 'pending-secret-abc',
      twoFactorSecret: 'active-secret-xyz',
    }

    const result = verifyTwoFactorSecretPropsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty two-factor secret props', () => {
    const emptyProps = {}

    const result = verifyTwoFactorSecretPropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })

  it('should validate partial two-factor secret props', () => {
    const partialProps = {
      twoFactorSecret: 'new-secret',
    }

    const result = verifyTwoFactorSecretPropsSchema.safeParse(partialProps)
    expect(result.success).toBe(true)
  })
})

describe('sessionSchema', () => {
  it('should validate valid session', () => {
    const validSession = {
      id: 'session-id-123',
      userId: 'user-123',
      deviceId: 'device-456',
      oauthServer: 'google',
      oauthId: 'oauth-id-789',
    }

    const result = sessionSchema.safeParse(validSession)
    expect(result.success).toBe(true)
  })

  it('should validate minimal session', () => {
    const minimalSession = {
      userId: 'user-123',
      deviceId: 'device-456',
    }

    const result = sessionSchema.safeParse(minimalSession)
    expect(result.success).toBe(true)
  })

  it('should reject missing userId', () => {
    const invalidSession = {
      deviceId: 'device-456',
    }

    const result = sessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('should reject missing deviceId', () => {
    const invalidSession = {
      userId: 'user-123',
    }

    const result = sessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('should accept optional id field', () => {
    const sessionWithId = {
      id: 'optional-session-id',
      userId: 'user-123',
      deviceId: 'device-456',
    }

    const result = sessionSchema.safeParse(sessionWithId)
    expect(result.success).toBe(true)
  })
})

describe('types', () => {
  it('should export Props type', () => {
    const props: types.Props = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
    }
    expect(props.id).toBeDefined()
  })

  it('should export SecretProps type', () => {
    const secretProps: types.SecretProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      passwordHash: 'hash',
    }
    expect(secretProps.id).toBeDefined()
  })

  it('should export CreateProps type', () => {
    const createProps: types.CreateProps = {
      username: 'newuser',
    }
    expect(createProps.username).toBeDefined()
  })

  it('should export CreateSecretProps type', () => {
    const createSecretProps: types.CreateSecretProps = {
      passwordHash: 'hash',
    }
    expect(createSecretProps.passwordHash).toBeDefined()
  })

  it('should export CreateOAuthProps type', () => {
    const createOAuthProps: types.CreateOAuthProps = {
      username: 'oauthuser',
      oauthServer: 'google',
      oauthId: 'oauth-id',
    }
    expect(createOAuthProps.username).toBeDefined()
  })

  it('should export UpdateProps type', () => {
    const updateProps: types.UpdateProps = {
      name: 'Updated Name',
    }
    expect(updateProps.name).toBeDefined()
  })

  it('should export UpdatePasswordSecretProps type', () => {
    const updatePasswordSecretProps: types.UpdatePasswordSecretProps = {
      passwordHash: 'new-hash',
    }
    expect(updatePasswordSecretProps.passwordHash).toBeDefined()
  })

  it('should export UpdatePlanProps type', () => {
    const updatePlanProps: types.UpdatePlanProps = {
      planKey: 'pro',
    }
    expect(updatePlanProps.planKey).toBeDefined()
  })

  it('should export VerifyTwoFactorProps type', () => {
    const verifyTwoFactorProps: types.VerifyTwoFactorProps = {
      twoFactorEnabled: true,
    }
    expect(verifyTwoFactorProps.twoFactorEnabled).toBeDefined()
  })

  it('should export VerifyTwoFactorSecretProps type', () => {
    const verifyTwoFactorSecretProps: types.VerifyTwoFactorSecretProps = {
      twoFactorSecret: 'secret',
    }
    expect(verifyTwoFactorSecretProps.twoFactorSecret).toBeDefined()
  })

  it('should export Session type', () => {
    const session: types.Session = {
      userId: 'user-123',
      deviceId: 'device-456',
    }
    expect(session.userId).toBeDefined()
  })

  it('should export Resource type', () => {
    const testResource: types.Resource = {
      name: 'Test',
      tableName: 'tests',
      schema: propsSchema,
    }
    expect(testResource.name).toBeDefined()
  })
})

describe('resource schema matches propsSchema', () => {
  it('should use a schema from createSchema', () => {
    // The resource uses createSchema() internally
    expect(resource.schema).toBeDefined()
    expect(resource.schema.safeParse).toBeDefined()
  })

  it('should validate the same data as propsSchema', () => {
    const testData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      username: 'testuser',
      name: 'Test User',
    }

    const propsResult = propsSchema.safeParse(testData)
    const resourceResult = resource.schema.safeParse(testData)

    expect(propsResult.success).toBe(true)
    expect(resourceResult.success).toBe(true)
    if (propsResult.success && resourceResult.success) {
      expect(propsResult.data).toEqual(resourceResult.data)
    }
  })
})

describe('schema field constraints', () => {
  describe('email field', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ]

      for (const email of validEmails) {
        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          username: 'testuser',
          email,
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
      ]

      for (const email of invalidEmails) {
        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          username: 'testuser',
          email,
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(false)
      }
    })
  })

  describe('datetime fields', () => {
    it('should accept valid ISO 8601 datetime strings', () => {
      const validDates = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2023-06-15T12:30:00.000Z',
      ]

      for (const date of validDates) {
        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: date,
          updatedAt: date,
          username: 'testuser',
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid datetime strings', () => {
      const invalidDates = ['not-a-date', '2024-01-01', '01/01/2024', 'January 1, 2024']

      for (const date of invalidDates) {
        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: date,
          updatedAt: '2024-01-01T00:00:00.000Z',
          username: 'testuser',
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(false)
      }
    })
  })

  describe('UUID field', () => {
    it('should accept valid UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        '00000000-0000-0000-0000-000000000000',
      ]

      for (const id of validUuids) {
        const props = {
          id,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          username: 'testuser',
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        '550e8400_e29b_41d4_a716_446655440000', // wrong separator
      ]

      for (const id of invalidUuids) {
        const props = {
          id,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          username: 'testuser',
        }

        const result = propsSchema.safeParse(props)
        expect(result.success).toBe(false)
      }
    })
  })
})
