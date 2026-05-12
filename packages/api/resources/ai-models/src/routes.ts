/**
 * AI model catalog routes.
 *
 * @module
 */

/** Route array for the AI model catalog: GET list of available models. */
export const routes = [
  {
    method: 'get',
    path: '/ai/models',
    handler: 'list',
    middlewares: ['authenticate'],
  },
] as const
