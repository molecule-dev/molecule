/**
 * Real child process used by the SIGTERM integration test.
 *
 * Boots the lifecycle bond on an ephemeral port, exposes a slow route and a
 * debug in-flight counter, then lets the parent send a real SIGTERM.
 */
import type { AddressInfo } from 'node:net'

import express from 'express'

import { installExpressLifecycle } from '../../express.js'

const app = express()
const lifecycle = installExpressLifecycle({
  app,
  wireProvider: false,
  flipWaitMs: 500,
  drainTimeoutMs: 5_000,
})

app.get('/slow', async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 800))
  res.json({ ok: true })
})
app.get('/debug/inflight', (_req, res) => {
  res.json({ inFlight: lifecycle.provider.inFlightRequests() })
})
app.get('/debug/state', (_req, res) => {
  res.json({ state: lifecycle.provider.state() })
})

const server = app.listen(0, () => {
  const port = (server.address() as AddressInfo).port
  process.stdout.write(`PORT ${port}\n`)
})
lifecycle.attachServer(server)
lifecycle.markReady()
