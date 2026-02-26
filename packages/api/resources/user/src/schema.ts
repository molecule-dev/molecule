/**
 * User resource schema definitions using Zod.
 *
 * Types are automatically inferred from schemas using z.infer<>.
 *
 * @module
 */

import { z } from 'zod'

import { basePropsSchema } from '@molecule/api-resource/schema'

/**
 * Creates a full schema for user props.
 *
 * OAuth servers and plan keys can be constrained by passing them as options.
 * @param options - Optional configuration.
 * @param options.oauthServers - Tuple of allowed OAuth server names. Constrains `oauthServer` to a Zod enum.
 * @param options.planKeys - Tuple of allowed plan key strings. Constrains `planKey` to a Zod enum.
 * @returns A Zod object schema extending `basePropsSchema` with user-specific fields (username, email, OAuth, plan).
 */
export const createSchema = <
  OAuthServers extends readonly [string, ...string[]] | undefined = undefined,
  PlanKeys extends readonly [string, ...string[]] | undefined = undefined,
>(options?: {
  oauthServers?: OAuthServers
  planKeys?: PlanKeys
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => {
  return basePropsSchema.extend({
    /**
     * An alphanumeric username.
     */
    username: z.string(),
    /**
     * The user's given name.
     */
    name: z.string().optional(),
    /**
     * The user's email address.
     */
    email: z.email().nullable().optional(),
    /**
     * Whether two-factor authentication is enabled.
     */
    twoFactorEnabled: z.boolean().optional(),
    /**
     * The OAuth server used to authenticate the user.
     */
    oauthServer: options?.oauthServers
      ? z.enum(options.oauthServers).optional()
      : z.string().optional(),
    /**
     * Unique identifier for the user from the OAuth server.
     */
    oauthId: z.string().optional(),
    /**
     * User data retrieved from the OAuth server.
     */
    oauthData: z.record(z.string(), z.unknown()).optional(),
    /**
     * The user's current plan key.
     */
    planKey: options?.planKeys ? z.enum(options.planKeys).optional() : z.string().optional(),
    /**
     * When the plan expires (ISO 8601 timestamp).
     */
    planExpiresAt: z.string().datetime().optional(),
    /**
     * True if the plan will automatically renew.
     */
    planAutoRenews: z.boolean().optional(),
  })
}

/**
 * Default schema for user props.
 */
export const propsSchema = createSchema()

/**
 * User props type inferred from schema.
 */
export type Props = z.infer<typeof propsSchema>

/**
 * Secret properties stored in a separate table.
 */
export const secretPropsSchema = z.object({
  /**
   * The user's ID.
   */
  id: z.string().uuid(),
  /**
   * The user's hashed password.
   */
  passwordHash: z.string().optional(),
  /**
   * Token for password reset.
   */
  passwordResetToken: z.string().optional(),
  /**
   * When the password reset token was created.
   */
  passwordResetTokenAt: z.string().datetime().optional(),
  /**
   * Pending two-factor secret during setup.
   */
  pendingTwoFactorSecret: z.string().optional(),
  /**
   * Active two-factor secret.
   */
  twoFactorSecret: z.string().optional(),
})

/**
 * Secret Props type.
 */
export type SecretProps = z.infer<typeof secretPropsSchema>

/**
 * Schema for creating a user via password.
 */
export const createPropsSchema = propsSchema.pick({
  username: true,
  name: true,
  email: true,
})

/**
 * Create Props type.
 */
export type CreateProps = z.infer<typeof createPropsSchema>

/** Schema for creating secret props (password hash only). */
export const createSecretPropsSchema = secretPropsSchema.pick({
  passwordHash: true,
})

/**
 * Create Secret Props type.
 */
export type CreateSecretProps = z.infer<typeof createSecretPropsSchema>

/**
 * Schema for creating a user via OAuth.
 */
export const createOAuthPropsSchema = propsSchema.pick({
  username: true,
  name: true,
  email: true,
  oauthServer: true,
  oauthId: true,
  oauthData: true,
})

/**
 * Create O Auth Props type.
 */
export type CreateOAuthProps = z.infer<typeof createOAuthPropsSchema>

/** Schema for updating a user (partial username, name, email). */
export const updatePropsSchema = propsSchema
  .pick({
    username: true,
    name: true,
    email: true,
  })
  .partial()

/**
 * Update Props type.
 */
export type UpdateProps = z.infer<typeof updatePropsSchema>

/** Schema for updating password secret props (partial password hash). */
export const updatePasswordSecretPropsSchema = secretPropsSchema
  .pick({
    passwordHash: true,
  })
  .partial()

/**
 * Update Password Secret Props type.
 */
export type UpdatePasswordSecretProps = z.infer<typeof updatePasswordSecretPropsSchema>

/** Schema for updating a user's plan (partial planKey, planExpiresAt, planAutoRenews). */
export const updatePlanPropsSchema = propsSchema
  .pick({
    planKey: true,
    planExpiresAt: true,
    planAutoRenews: true,
  })
  .partial()

/**
 * Update Plan Props type.
 */
export type UpdatePlanProps = z.infer<typeof updatePlanPropsSchema>

/**
 * Schema for verifying two-factor authentication.
 */
export const verifyTwoFactorPropsSchema = propsSchema
  .pick({
    twoFactorEnabled: true,
  })
  .partial()

/**
 * Verify Two Factor Props type.
 */
export type VerifyTwoFactorProps = z.infer<typeof verifyTwoFactorPropsSchema>

/**
 * Schema for two-factor secret props.
 */
export const verifyTwoFactorSecretPropsSchema = secretPropsSchema
  .pick({
    pendingTwoFactorSecret: true,
    twoFactorSecret: true,
  })
  .partial()

/**
 * Verify Two Factor Secret Props type.
 */
export type VerifyTwoFactorSecretProps = z.infer<typeof verifyTwoFactorSecretPropsSchema>

/** Zod schema for JWT session payloads (userId, deviceId, optional OAuth fields). */
export const sessionSchema = z.object({
  /**
   * The session ID (required for web browser clients).
   */
  id: z.string().optional(),
  /**
   * The user ID.
   */
  userId: z.string(),
  /**
   * The device ID.
   */
  deviceId: z.string(),
  /**
   * The OAuth server if logged in via OAuth.
   */
  oauthServer: z.string().optional(),
  /**
   * The OAuth ID if logged in via OAuth.
   */
  oauthId: z.string().optional(),
})

/**
 * User session data (userId, email, role, permissions, metadata) inferred from sessionSchema.
 */
export type Session = z.infer<typeof sessionSchema>

/**
 * Re-export zod for convenience.
 */
export { z }
