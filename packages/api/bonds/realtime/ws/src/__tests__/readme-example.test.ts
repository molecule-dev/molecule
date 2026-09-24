/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — this bond attached to a real HTTP
 * server through the realtime core, driven by real `ws` clients speaking the
 * join protocol (no mocks).
 *
 * @module
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'

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
  const sockets: WebSocket[] = []

  beforeAll(async () => {
    const realtime = createProvider({ deferAttach: true })
    setProvider(realtime)
    realtime.attachHttpServer?.(server)

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
    for (const socket of sockets) socket.close()
    await close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const connect = async (query: string): Promise<{ socket: WebSocket; frames: Frame[] }> => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/${query}`)
    sockets.push(socket)
    const frames: Frame[] = []
    socket.on('message', (raw) => frames.push(JSON.parse(String(raw)) as Frame))
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve())
      socket.once('error', reject)
    })
    return { socket, frames }
  }

  const waitFor = async (frames: Frame[], event: string): Promise<Frame> => {
    for (let i = 0; i < 100; i++) {
      const found = frames.find((frame) => frame.event === event)
      if (found) return found
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error(`timed out waiting for ${event}`)
  }

  it('denies an unauthenticated join, admits a member, and fans a room-send out to the room', async () => {
    const stranger = await connect('?token=nope')
    stranger.socket.send(
      JSON.stringify({ event: 'molecule:join', data: { room: 'channel:general' } }),
    )
    expect((await waitFor(stranger.frames, 'molecule:join-denied')).data.room).toBe(
      'channel:general',
    )

    const ada = await connect('?token=token-ada')
    ada.socket.send(JSON.stringify({ event: 'molecule:join', data: { room: 'channel:general' } }))
    await waitFor(ada.frames, 'molecule:joined')

    ada.socket.send(
      JSON.stringify({
        event: 'molecule:room-send',
        data: { room: 'channel:general', event: 'chat', data: 'hello' },
      }),
    )
    const chat = await waitFor(ada.frames, 'chat')
    expect(chat.data.text).toBe('hello')
    expect(typeof chat.data.from).toBe('string')
    expect(stranger.frames.some((frame) => frame.event === 'chat')).toBe(false)
  })
})
