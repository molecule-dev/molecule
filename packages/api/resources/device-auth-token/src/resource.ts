import type * as types from './types.js'

/** Device auth token resource definition with JSON schema for validation. */
export const resource: types.Resource = {
  name: 'DeviceAuthToken',
  tableName: 'device_auth_tokens',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      device_id: { type: 'string' },
      hashed_token: { type: 'string' },
      masked: { type: 'string' },
      scopes: { type: 'array', items: { type: 'string' } },
      last_used_at: { type: 'string', nullable: true },
      last_used_ip: { type: 'string', nullable: true },
      expires_at: { type: 'string', nullable: true },
      created_at: { type: 'string' },
      revoked_at: { type: 'string', nullable: true },
      version: { type: 'integer' },
    },
    required: ['device_id', 'hashed_token', 'masked', 'scopes', 'version'],
  },
}
