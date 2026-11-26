import type { Server } from 'node:http'

import express, { type ErrorRequestHandler, Router } from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createRequestHandler, type MoleculeRequestHandler } from '@molecule/api-resource'

import { createRequestHandlerMap, routes } from '../index.js'
import * as featureRouters from '../scaffold-router.js'
import router from '../scaffold-router.js'

vi.mock('@molecule/api-resource-user', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('../index.js')),
}))

let server: Server
let origin: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  const factoryRouter = Router()
  const map: Record<string, MoleculeRequestHandler | undefined> = {
    ...createRequestHandlerMap(createRequestHandler),
  }
  for (const route of routes) {
    const chain = [...route.middlewares, route.handler].map((name) => {
      const handler = map[name]
      if (!handler)
        throw new Error(`routes names ${name}, which createRequestHandlerMap does not return`)
      return handler
    })
    factoryRouter[route.method](route.path, ...chain)
  }
  app.use('/factory', factoryRouter)
  const features = Object.entries(featureRouters)
    .filter(([name]) => name !== 'default')
    .map(([, featureRouter]) => featureRouter as Router)
  app.use('/editable', router, ...features)
  app.use('/core', router)
  app.use(((error, _req, res, next) => {
    if (typeof error === 'string' && error.startsWith('Unauthorized')) {
      res.status(401).send(error)
      return
    }
    next(error)
  }) satisfies ErrorRequestHandler)
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected an HTTP listener')
  origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('editable user router', () => {
  it.each([
    { method: 'POST', path: '/users', body: { user: { username: 'writer' } }, status: 400 },
    {
      method: 'POST',
      path: '/users/log-in',
      body: { user: { email: 'writer@example.test' } },
      status: 403,
    },
    { method: 'GET', path: '/users/me', status: 401 },
    { method: 'PATCH', path: '/users/example', body: {}, status: 401 },
    { method: 'GET', path: '/users/example/verify-payment/stripe', status: 401 },
  ])('preserves $method $path status and body', async ({ method, path, body, status }) => {
    const init = {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
    const [factory, editable] = await Promise.all([
      fetch(`${origin}/factory${path}`, init),
      fetch(`${origin}/editable${path}`, init),
    ])
    expect(factory.status).toBe(status)
    expect(editable.status).toBe(status)
    expect(await editable.text()).toEqual(await factory.text())
  })

  it('keeps provider routes out of the base router', async () => {
    const response = await fetch(`${origin}/core/users/example/verify-payment/stripe`)
    expect(response.status).toBe(404)
  })

  // A route marked `optional: <feature>` needs a package the stack may not have (an email
  // transport sends the reset link, a two-factor provider checks the code, payments owns the
  // plan). The scaffold mounts `<feature>Router` only when a package with that feature is in the
  // stack, so the base router must not serve it: without an email transport, forgot-password
  // answered 501 on every request of an app that offered the page.
  it.each(routes.filter((route) => route.optional))(
    'serves $method $path (optional: $optional) from its feature router only',
    ({ method, path, optional }) => {
      const served = (candidate: Router): boolean =>
        candidate.stack.some(
          (layer) =>
            layer.route?.path === path &&
            (layer.route as unknown as { methods: Record<string, boolean> }).methods[method],
        )
      const feature = String(optional).replace(/-(\w)/g, (_match, letter: string) =>
        letter.toUpperCase(),
      )
      const featureRouter = featureRouters[`${feature}Router`]
      expect(featureRouter, `scaffold-router.ts exports no ${feature}Router`).toBeDefined()
      expect(served(featureRouter as Router)).toBe(true)
      expect(served(router)).toBe(false)
    },
  )
})
