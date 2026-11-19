/**
 * The generated `nginx.conf`, served by the real `nginx:alpine` image the app Dockerfile
 * uses: only content-hashed build output (Vite's `assets/`, SvelteKit's `_app/immutable/`)
 * is cached for a year, and every file that keeps its name across deploys revalidates.
 *
 * Skipped when Docker cannot run a container on this machine.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { generateNginxConf } from '../dockerfile-generator.js'

const IMAGE = 'nginx:alpine'

/** Whether Docker can run the image (pulling it when it is not present). */
function dockerCanRun(): boolean {
  if (spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 20_000 }).status !== 0) return false
  if (spawnSync('docker', ['image', 'inspect', IMAGE], { stdio: 'ignore' }).status === 0)
    return true
  return spawnSync('docker', ['pull', IMAGE], { stdio: 'ignore', timeout: 180_000 }).status === 0
}

const docker = dockerCanRun()

const SITE: Record<string, string> = {
  'index.html': '<!doctype html><title>app</title>',
  'assets/index-abc123.js': 'console.log(1)',
  '_app/immutable/entry/start.abc123.js': 'console.log(2)',
  '_app/version.json': '{"version":"1"}',
  'favicon.png': 'png',
  'sw.js': 'self.skipWaiting()',
}

let root = ''
let container = ''
let base = ''

describe.skipIf(!docker)('generateNginxConf, served by nginx', () => {
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'mol-nginx-conf-'))
    const site = join(root, 'html')
    for (const [path, body] of Object.entries(SITE)) {
      mkdirSync(dirname(join(site, path)), { recursive: true })
      writeFileSync(join(site, path), body)
    }
    writeFileSync(join(root, 'default.conf'), generateNginxConf())
    // nginx's workers run as their own user: let it read what this process wrote.
    execFileSync('chmod', ['-R', 'a+rX', root])
    chmodSync(root, 0o755)
    container = execFileSync(
      'docker',
      [
        'run',
        '-d',
        '-p',
        '127.0.0.1::80',
        '-v',
        `${join(root, 'default.conf')}:/etc/nginx/conf.d/default.conf:ro`,
        '-v',
        `${site}:/usr/share/nginx/html:ro`,
        IMAGE,
      ],
      { encoding: 'utf8' },
    ).trim()
    const port = execFileSync('docker', ['port', container, '80/tcp'], { encoding: 'utf8' })
      .trim()
      .split('\n')[0]
      ?.split(':')
      .pop()
    if (!port) throw new Error('nginx container published no port')
    base = `http://127.0.0.1:${port}`
    const deadline = Date.now() + 30_000
    for (;;) {
      try {
        if ((await fetch(`${base}/`)).ok) break
      } catch (error) {
        if (Date.now() > deadline) throw new Error('nginx did not start', { cause: error })
      }
      await new Promise((done) => setTimeout(done, 200))
    }
  }, 240_000)

  afterAll(() => {
    if (container) spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it.each(['/assets/index-abc123.js', '/_app/immutable/entry/start.abc123.js'])(
    'caches the hashed file %s for a year',
    async (path) => {
      const response = await fetch(`${base}${path}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    },
  )

  it.each(['/', '/settings/profile', '/favicon.png', '/sw.js', '/_app/version.json'])(
    'revalidates %s, whose name stays the same across deploys',
    async (path) => {
      const response = await fetch(`${base}${path}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-cache')
    },
  )

  it('answers a missing hashed file with a 404, not the app page', async () => {
    const response = await fetch(`${base}/assets/missing-000000.js`)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBeNull()
  })

  it('serves the app page for a client route', async () => {
    const response = await fetch(`${base}/settings/profile`)
    expect(await response.text()).toBe(SITE['index.html'])
  })
})
