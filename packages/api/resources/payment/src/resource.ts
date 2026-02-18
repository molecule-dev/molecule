import type * as types from './types.js'

/** Payment resource definition with JSON schema for validation. */
export const resource: types.Resource = {
  name: 'Payment',
  tableName: 'payments',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      userId: { type: 'string' },
      platformKey: { type: 'string' },
      transactionId: { type: 'string', nullable: true },
      productId: { type: 'string' },
      data: { type: 'object', nullable: true },
      receipt: { type: 'string', nullable: true },
    },
    required: ['userId', 'platformKey', 'productId'],
  },
}
