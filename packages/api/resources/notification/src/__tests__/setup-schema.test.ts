import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(here, '..', '__setup__', 'notifications.sql'), 'utf8')

/**
 * Guards the notifications __setup__ table against regressing to the incomplete
 * stub that shipped only id + camelCase "createdAt"/"updatedAt". That stub made
 * GET /api/notifications 500 at runtime on every out-of-the-box build, because
 * the notification-center-database provider create()s/findMany()s snake_case
 * columns (user_id, type, title, body, read, data, created_at) that did not exist.
 */
describe('notifications __setup__ schema', () => {
  it('creates the notifications table', () => {
    expect(sql).toMatch(/create\s+table[\s\S]*?"notifications"/i)
  })

  it('has every column the notification-center-database provider reads/writes (snake_case)', () => {
    for (const col of ['user_id', 'type', 'title', 'body', 'read', 'data', 'created_at']) {
      expect(sql, `missing "${col}" → GET /api/notifications would 500`).toContain(`"${col}"`)
    }
  })

  it('is not the incomplete stub (no TODO placeholder)', () => {
    expect(sql).not.toMatch(/TODO/i)
  })
})
