import type * as types from './types.js'

/** API key resource definition with JSON schema for validation. */
export const resource: types.Resource = {
  name: 'ApiKey',
  tableName: 'api_keys',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      user_id: { type: 'string' },
      name: { type: 'string' },
      hashed_token: { type: 'string' },
      masked: { type: 'string' },
      scopes: { type: 'array', items: { type: 'string' } },
      last_used_at: { type: 'string', nullable: true },
      expires_at: { type: 'string', nullable: true },
      created_at: { type: 'string' },
      revoked_at: { type: 'string', nullable: true },
      version: { type: 'integer' },
    },
    required: ['user_id', 'name', 'hashed_token', 'masked', 'scopes', 'version'],
  },
}
