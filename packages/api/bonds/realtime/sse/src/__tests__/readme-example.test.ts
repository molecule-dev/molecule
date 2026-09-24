/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — this bond mounted on a real HTTP
 * server through the realtime core, driven by real SSE subscriptions and
 * POSTs speaking the join protocol (no mocks).
 *
 * @module
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getLogger } from '@molecule/api-bond'
import { broadcast, close, onJoinRequest, onMessage, setProvider } from '@molecule/api-realtime'

import { createProvider } from '../index.js'

interface Frame {
  event: string
  data: Record<string, unknown>
}

describe('README @example', () => {
  const logger = getLogger()
  const server = http.createServer()
  let port = 0
  const streams: http.ClientRequest[] = []

  beforeAll(async () => {
    const realtime = createProvider({
      httpServer: server,
      path: '/sse',
      corsOrigin: process.env.APP_ORIGIN,
    })
    setProvider(realtime)

    const sessionUserByToken = new Map([['token-ada', 'user-ada']])
    const channelMembers = new Map([['channel:general', new Set(['user-ada'])]])
    onJoinRequest(({ room, auth }) => {
      const userId = sessionUserByToken.get(String(auth.token))
      return userId !== undefined && (channelMembers.get(room)?.has(userId) ?? false)
    })

    onMessage((roomId, clientId, event, data) => {
      if (event !== 'chat') return
      broadcast(roomId, 'chat', { from: clientId, text: data }).catch((error: unknown) => {
        logger.error('realtime chat broadcast failed', { roomId, error })
      })
    })

    await new Promise<void>((resolve) => server.listen(0, resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    for (const stream of streams) stream.destroy()
    await close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  /** Opens an SSE subscription and collects its parsed frames. */
  const subscribe = (query: string): Frame[] => {
    const frames: Frame[] = []
    const request = http.get(`http://127.0.0.1:${port}/sse${query}`, (response) => {
      let buffer = ''
      response.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        let end = buffer.indexOf('\n\n')
        while (end !== -1) {
          const block = buffer.slice(0, end)
          buffer = buffer.slice(end + 2)
          const event = /^event: (.*)$/m.exec(block)?.[1]
          const data = /^data: (.*)$/m.exec(block)?.[1]
          if (event && data) frames.push({ event, data: JSON.parse(data) as Frame['data'] })
          end = buffer.indexOf('\n\n')
        }
      })
    })
    streams.push(request)
    return frames
  }

  const waitFor = async (frames: Frame[], event: string): Promise<Frame> => {
    for (let i = 0; i < 100; i++) {
      const found = frames.find((frame) => frame.event === event)
      if (found) return found
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error(`timed out waiting for ${event}`)
  }

  it('denies an unauthorized join, admits a member, and fans a room-send out to the room', async () => {
    const stranger = subscribe('?token=nope&room=channel:general')
    expect((await waitFor(stranger, 'molecule:join-denied')).data.room).toBe('channel:general')

    const ada = subscribe('?token=token-ada&room=channel:general')
    await waitFor(ada, 'molecule:joined')
    const clientId = String((await waitFor(ada, 'connected')).data.clientId)

    const response = await fetch(`http://127.0.0.1:${port}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        event: 'molecule:room-send',
        data: { room: 'channel:general', event: 'chat', data: 'hello' },
      }),
    })
    expect(response.ok).toBe(true)

    const chat = await waitFor(ada, 'chat')
    expect(chat.data).toEqual({ from: clientId, text: 'hello' })
    expect(stranger.some((frame) => frame.event === 'chat')).toBe(false)
  })
})
