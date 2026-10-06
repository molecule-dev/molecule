/**
 * Runs the shared database bond contract against this bond, in memory.
 *
 * @module
 */

import { createPool } from '../pool.js'
import { createStore } from '../store.js'
import { describeDatabaseContract } from './contract/database-contract.js'

describeDatabaseContract('pglite (memory://)', async () => {
  const pool = createPool({ dataDir: 'memory://' })
  return { pool, store: createStore(pool), teardown: () => pool.end() }
})
