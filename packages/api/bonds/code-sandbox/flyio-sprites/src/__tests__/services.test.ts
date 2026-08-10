import { describe, expect, it } from 'vitest'

import { ensureService } from '../services.js'
import { fakeSprite } from './helpers.js'

const VITE = {
  name: 'vite',
  cmd: 'npx',
  args: ['vite', '--host', '0.0.0.0', '--port', '5173'],
  dir: '/workspace/my-app/app',
  env: { BROWSER: 'none' },
  httpPort: 5173,
}

describe('ensureService', () => {
  it('creates a missing service with http_port for URL routing', async () => {
    const sprite = fakeSprite()
    await ensureService(sprite, VITE)
    expect(sprite.serviceCreates).toHaveLength(1)
    expect(sprite.serviceCreates[0].config).toMatchObject({
      cmd: 'npx',
      dir: '/workspace/my-app/app',
      http_port: 5173,
    })
  })

  it('is a no-op when the definition already matches', async () => {
    const sprite = fakeSprite({
      services: { vite: { cmd: VITE.cmd, args: VITE.args, dir: VITE.dir } },
    })
    await ensureService(sprite, VITE)
    expect(sprite.serviceCreates).toHaveLength(0)
    expect(sprite.serviceStops).toHaveLength(0)
  })

  it('stops + deletes + recreates when the definition differs (the running-PUT trap)', async () => {
    const sprite = fakeSprite({
      services: { vite: { cmd: VITE.cmd, args: VITE.args, dir: '/workspace/OLD/app' } },
    })
    await ensureService(sprite, VITE)
    expect(sprite.serviceStops).toEqual(['vite'])
    expect(sprite.serviceDeletes).toEqual(['vite'])
    expect(sprite.serviceCreates).toHaveLength(1)
  })

  it('THROWS when the definition did not take (silently-kept old command)', async () => {
    const sprite = fakeSprite({
      services: { vite: { cmd: VITE.cmd, args: VITE.args, dir: '/workspace/OLD/app' } },
      applyServiceCreates: false,
    })
    // Recreate the stale definition after delete so the read-back sees it.
    const originalDelete = sprite.deleteService.bind(sprite)
    sprite.deleteService = async (name: string) => {
      await originalDelete(name)
    }
    await expect(ensureService(sprite, VITE)).rejects.toThrow(/did not take/)
  })

  it('tolerates a failing stop (service not running) and still recreates', async () => {
    const sprite = fakeSprite({
      services: { vite: { cmd: 'old', args: [], dir: undefined } },
    })
    sprite.stopService = async () => {
      throw new Error('service not running')
    }
    await ensureService(sprite, VITE)
    expect(sprite.serviceCreates).toHaveLength(1)
  })
})
