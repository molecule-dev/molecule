import { describe, expect, it } from 'vitest'

import { createServerFactory } from '../index.js'

describe('@molecule/api-server-default-express', () => {
  it('exports createServerFactory', () => {
    expect(typeof createServerFactory).toBe('function')
  })

  it('createServerFactory returns a function', () => {
    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      getRouter: async () => ({ router: {} as never }),
    })
    expect(typeof create).toBe('function')
  })
})
