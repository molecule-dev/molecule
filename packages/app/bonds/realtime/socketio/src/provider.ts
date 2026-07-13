/**
 * Socket.io implementation of the molecule RealtimeClientProvider.
 *
 * A real socket.io-client transport: `connect()` opens an actual Socket.io
 * connection to the server (`@molecule/api-realtime-socketio` attaches the
 * matching Server to the API's HTTP server at `/socket.io`). Rooms, presence,
 * event buffering, and reconnect-rejoin are all handled by the provider —
 * framework bindings consume the standard `RealtimeConnection` API and never
 * touch the socket directly.
 *
 * Reserved protocol events (client → server: `molecule:join`,
 * `molecule:leave`, `molecule:room-send`; server → client: `molecule:joined`,
 * `molecule:left`, `molecule:join-denied`, `molecule:presence`) are consumed
 * internally and NEVER dispatched to app-level `on()` handlers.
 *
 * @module
 */

import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client'

import type {
  ConnectionOptions,
  ConnectionState,
  ConnectionStateHandler,
  PresenceChangeHandler,
  PresenceInfo,
  RealtimeClientProvider,
  RealtimeConnection,
  RealtimeEventHandler,
} from '@molecule/app-realtime'

import type { BufferedEvent, SocketioConfig, SocketioConnection } from './types.js'

// ---------------------------------------------------------------------------
// Reserved protocol events (pinned contract with @molecule/api-realtime-socketio)
// ---------------------------------------------------------------------------

/** Client → server: request to join a room. Payload `{ room }`. */
const EVENT_JOIN = 'molecule:join'
/** Client → server: request to leave a room. Payload `{ room }`. */
const EVENT_LEAVE = 'molecule:leave'
/** Client → server: send an event to a room. Payload `{ room, event, data }`. */
const EVENT_ROOM_SEND = 'molecule:room-send'
/** Server → client: a join was confirmed. Payload `{ room }`. */
const EVENT_JOINED = 'molecule:joined'
/** Server → client: the client left (or was removed from) a room. Payload `{ room }`. */
const EVENT_LEFT = 'molecule:left'
/** Server → client: a join was denied. Payload `{ room, reason? }`. */
const EVENT_JOIN_DENIED = 'molecule:join-denied'
/** Server → client: presence update for a room. Payload `{ room, presence }`. */
const EVENT_PRESENCE = 'molecule:presence'
/** Prefix marking the reserved molecule protocol namespace. */
const RESERVED_PREFIX = 'molecule:'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A joinRoom() promise awaiting server confirmation ('molecule:joined' / 'molecule:join-denied'). */
interface PendingJoin {
  /** The promise returned to the joinRoom() caller. */
  promise: Promise<void>
  /** Resolves the promise (join confirmed). */
  resolve: () => void
  /** Rejects the promise (join denied / connection torn down). */
  reject: (error: Error) => void
}

/** Loosely-typed shape of an incoming reserved-protocol payload. */
interface ProtocolPayload {
  room?: unknown
  reason?: unknown
  presence?: unknown
}

/**
 * Extracts the room name from an incoming protocol payload, or `undefined`
 * when the payload is malformed.
 *
 * @param data - The raw incoming payload.
 * @returns The room name, or `undefined` when absent/invalid.
 */
function roomOf(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const { room } = data as ProtocolPayload
  return typeof room === 'string' ? room : undefined
}

// ---------------------------------------------------------------------------
// Connection instance
// ---------------------------------------------------------------------------

/**
 * Creates a SocketioConnection backed by a real socket.io-client Socket.
 *
 * @param url - The server URL. `''` or `'/'` connects same-origin (browser
 *   default), anything else connects directly to that URL.
 * @param connectionOptions - Connection configuration from the core interface.
 * @param config - Socket.io-specific configuration.
 * @returns A SocketioConnection wrapping a live Socket.io connection.
 */
function createConnectionInstance(
  url: string,
  connectionOptions: ConnectionOptions,
  config: SocketioConfig,
): SocketioConnection {
  const autoReconnect = connectionOptions.autoReconnect ?? true
  const bufferEnabled = config.bufferEvents ?? true
  const maxBufferSize = config.maxBufferSize ?? 100

  let state: ConnectionState = 'connecting'
  let hasConnectedOnce = false
  let manuallyDisconnected = false

  /** Rooms the app wants to be in — re-joined on every (re)connect. */
  const desiredRooms = new Set<string>()
  /** Rooms the server has confirmed via 'molecule:joined'. Cleared on disconnect. */
  const confirmedRooms = new Set<string>()
  const pendingJoins = new Map<string, PendingJoin>()
  const eventHandlers = new Map<string, Set<RealtimeEventHandler>>()
  const presenceMap = new Map<string, PresenceInfo[]>()
  const presenceChangeHandlers: PresenceChangeHandler[] = []
  const reconnectHandlers: Array<() => void> = []
  const stateChangeHandlers: ConnectionStateHandler[] = []
  let buffer: BufferedEvent[] = []

  // -------------------------------------------------------------------------
  // Socket creation — map core ConnectionOptions + SocketioConfig onto
  // socket.io-client options.
  // -------------------------------------------------------------------------

  const socketOptions: Partial<ManagerOptions & SocketOptions> = {
    reconnection: autoReconnect,
    reconnectionDelay: connectionOptions.reconnectDelay ?? 1000,
    reconnectionAttempts: connectionOptions.maxRetries ?? 10,
    transports: config.transports ?? ['websocket', 'polling'],
    path: config.path ?? '/socket.io',
  }
  if (connectionOptions.auth) {
    // Passed as the socket.io handshake `auth`; the server evaluates join
    // guards against it.
    socketOptions.auth = connectionOptions.auth
  }

  // '' or '/' = same-origin: io() with no URL argument resolves to
  // window.location in the browser (dev: vite proxies /socket.io to the API).
  // Any other value connects directly to that URL.
  const socket: Socket = url === '' || url === '/' ? io(socketOptions) : io(url, socketOptions)

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Updates the connection state and notifies state change handlers.
   *
   * @param newState - The new connection state.
   */
  function setState(newState: ConnectionState): void {
    if (newState === state) return
    state = newState
    for (const handler of [...stateChangeHandlers]) {
      handler(newState)
    }
  }

  /**
   * Emits a 'molecule:join' request for a room.
   *
   * @param room - The room name.
   */
  function emitJoin(room: string): void {
    socket.emit(EVENT_JOIN, { room })
  }

  /**
   * Emits every buffered event over the socket, in original order, and
   * clears the buffer. Room-targeted events are wrapped as
   * 'molecule:room-send'.
   */
  function flushBufferToSocket(): void {
    const events = buffer
    buffer = []
    for (const buffered of events) {
      if (buffered.roomId !== undefined) {
        socket.emit(EVENT_ROOM_SEND, {
          room: buffered.roomId,
          event: buffered.event,
          data: buffered.data,
        })
      } else {
        socket.emit(buffered.event, buffered.data)
      }
    }
  }

  /**
   * Marks a room as joined (server-confirmed) and resolves any pending
   * joinRoom() promise for it.
   *
   * @param room - The room name.
   */
  function handleJoined(room: string): void {
    desiredRooms.add(room)
    confirmedRooms.add(room)
    const pending = pendingJoins.get(room)
    if (pending) {
      pendingJoins.delete(room)
      pending.resolve()
    }
  }

  /**
   * Marks a room as left (client-initiated confirmation or server-initiated
   * removal) and clears its local presence. Server-initiated removals also
   * untrack the room so it is not re-joined on reconnect.
   *
   * @param room - The room name.
   */
  function handleLeft(room: string): void {
    desiredRooms.delete(room)
    confirmedRooms.delete(room)
    presenceMap.delete(room)
  }

  /**
   * Rejects any pending joinRoom() promise for a denied room and untracks
   * it (a denied join would be denied again on reconnect, so it is not
   * re-attempted automatically).
   *
   * @param room - The room name.
   * @param reason - The server-provided denial reason, if any.
   */
  function handleJoinDenied(room: string, reason: string | undefined): void {
    desiredRooms.delete(room)
    confirmedRooms.delete(room)
    const pending = pendingJoins.get(room)
    if (pending) {
      pendingJoins.delete(room)
      pending.reject(new Error(reason ?? `Join denied for room "${room}"`))
    }
  }

  /**
   * Updates the presence list for a room and notifies presence change
   * handlers.
   *
   * @param room - The room whose presence changed.
   * @param presence - The updated presence list.
   */
  function handlePresence(room: string, presence: PresenceInfo[]): void {
    presenceMap.set(room, [...presence])
    for (const handler of [...presenceChangeHandlers]) {
      // Pass `room` so a consumer joined to multiple rooms can tell which
      // room's member list this update replaces — before this, a handler
      // had no way to distinguish presence updates from different rooms.
      handler([...presence], room)
    }
  }

  /**
   * Routes an incoming server event: reserved 'molecule:*' protocol events
   * are consumed internally (join/leave confirmations, denials, presence);
   * unknown reserved events are ignored; everything else is dispatched to
   * handlers registered via on(). Reserved events never reach app handlers.
   *
   * @param event - The incoming event name.
   * @param data - The event payload (first socket.io argument).
   */
  function handleIncoming(event: string, data: unknown): void {
    if (event === EVENT_PRESENCE) {
      const room = roomOf(data)
      if (room !== undefined) {
        const { presence } = data as ProtocolPayload
        handlePresence(room, Array.isArray(presence) ? (presence as PresenceInfo[]) : [])
      }
      return
    }
    if (event === EVENT_JOINED) {
      const room = roomOf(data)
      if (room !== undefined) handleJoined(room)
      return
    }
    if (event === EVENT_LEFT) {
      const room = roomOf(data)
      if (room !== undefined) handleLeft(room)
      return
    }
    if (event === EVENT_JOIN_DENIED) {
      const room = roomOf(data)
      if (room !== undefined) {
        const { reason } = data as ProtocolPayload
        handleJoinDenied(room, typeof reason === 'string' ? reason : undefined)
      }
      return
    }
    if (event.startsWith(RESERVED_PREFIX)) {
      // Unknown reserved-namespace event (protocol evolution) — never leak
      // it to app-level handlers.
      return
    }
    const handlers = eventHandlers.get(event)
    if (handlers) {
      for (const handler of [...handlers]) {
        handler(data)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Socket wiring
  // -------------------------------------------------------------------------

  socket.on('connect', () => {
    const isReconnect = hasConnectedOnce
    hasConnectedOnce = true
    setState('connected')
    // Server room membership does not survive a disconnect — (re-)request
    // every desired room. Confirmations arrive as 'molecule:joined'.
    for (const room of desiredRooms) {
      emitJoin(room)
    }
    flushBufferToSocket()
    if (isReconnect) {
      for (const handler of [...reconnectHandlers]) {
        handler()
      }
    }
  })

  socket.on('disconnect', (reason) => {
    // Server-side membership is gone; desiredRooms is kept for re-join.
    confirmedRooms.clear()
    // socket.io does not auto-reconnect after an intentional close on either
    // side ('io client disconnect' / 'io server disconnect') — those are
    // terminal regardless of the autoReconnect option.
    const terminal =
      manuallyDisconnected || reason === 'io client disconnect' || reason === 'io server disconnect'
    setState(!terminal && autoReconnect ? 'reconnecting' : 'disconnected')
  })

  /** Manager-level handler: all reconnection attempts exhausted. */
  const handleReconnectFailed = (): void => {
    setState('disconnected')
  }
  socket.io.on('reconnect_failed', handleReconnectFailed)

  socket.onAny((event: string, ...args: unknown[]) => {
    handleIncoming(event, args[0])
  })

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const connection: SocketioConnection = {
    // -- Rooms ---------------------------------------------------------------

    /**
     * Joins a room. Resolves when the server confirms with 'molecule:joined';
     * rejects with the server's reason on 'molecule:join-denied'. While
     * disconnected the join is deferred — the promise stays pending and the
     * request is emitted on (re)connect.
     */
    joinRoom(roomId: string): Promise<void> {
      desiredRooms.add(roomId)
      if (confirmedRooms.has(roomId)) return Promise.resolve()
      const existing = pendingJoins.get(roomId)
      if (existing) return existing.promise
      let resolve!: () => void
      let reject!: (error: Error) => void
      const promise = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
      // Attach a no-op rejection branch so a fire-and-forget joinRoom() whose
      // join is later denied (or torn down by disconnect()) does not surface
      // as an unhandled promise rejection. Callers that await the returned
      // promise still receive the rejection — this side branch only marks it
      // as handled when nobody is listening.
      promise.catch((_error) => {
        /* intentionally ignored — see comment above */
      })
      pendingJoins.set(roomId, { promise, resolve, reject })
      if (state === 'connected') {
        emitJoin(roomId)
      }
      return promise
    },

    /**
     * Leaves a room: untracks it locally, clears its presence, emits
     * 'molecule:leave' when connected, and resolves immediately (server
     * confirmation via 'molecule:left' is not awaited). A join still pending
     * for the room is rejected as cancelled.
     */
    leaveRoom(roomId: string): Promise<void> {
      const pending = pendingJoins.get(roomId)
      if (pending) {
        pendingJoins.delete(roomId)
        pending.reject(new Error(`Join for room "${roomId}" was cancelled by leaveRoom()`))
      }
      desiredRooms.delete(roomId)
      confirmedRooms.delete(roomId)
      presenceMap.delete(roomId)
      if (state === 'connected') {
        socket.emit(EVENT_LEAVE, { room: roomId })
      }
      return Promise.resolve()
    },

    // -- Messaging -----------------------------------------------------------

    /**
     * Emits an event to the server when connected; otherwise buffers it
     * (config.bufferEvents, default true) up to config.maxBufferSize
     * (default 100) for delivery on (re)connect. Events beyond the buffer
     * cap — or any event while buffering is disabled — are dropped.
     */
    send(event: string, data: unknown): void {
      if (state === 'connected') {
        socket.emit(event, data)
        return
      }
      if (bufferEnabled && buffer.length < maxBufferSize) {
        buffer.push({ event, data })
      }
    },

    /**
     * Sends an event to a specific room by wrapping it in the reserved
     * 'molecule:room-send' protocol event. The server only forwards it if
     * this client has (protocol-)joined the room. Buffered while
     * disconnected, same policy as send().
     */
    sendTo(roomId: string, event: string, data: unknown): void {
      if (state === 'connected') {
        socket.emit(EVENT_ROOM_SEND, { room: roomId, event, data })
        return
      }
      if (bufferEnabled && buffer.length < maxBufferSize) {
        buffer.push({ event, data, roomId })
      }
    },

    // -- Event listening -----------------------------------------------------

    on(event: string, handler: RealtimeEventHandler): void {
      let handlers = eventHandlers.get(event)
      if (!handlers) {
        handlers = new Set()
        eventHandlers.set(event, handlers)
      }
      handlers.add(handler)
    },

    off(event: string, handler?: RealtimeEventHandler): void {
      if (!handler) {
        eventHandlers.delete(event)
        return
      }
      const handlers = eventHandlers.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          eventHandlers.delete(event)
        }
      }
    },

    // -- Presence ------------------------------------------------------------

    getPresence(roomId: string): PresenceInfo[] {
      return [...(presenceMap.get(roomId) ?? [])]
    },

    onPresenceChange(handler: PresenceChangeHandler): void {
      presenceChangeHandlers.push(handler)
    },

    // -- Connection lifecycle ------------------------------------------------

    /**
     * Disconnects the underlying socket and performs full local cleanup:
     * pending joins are rejected, and all rooms, presence, handlers, and
     * buffered events are cleared. Terminal — create a new connection via
     * the provider to reconnect.
     */
    disconnect(): void {
      manuallyDisconnected = true
      socket.disconnect()
      setState('disconnected')
      // Detach socket listeners so the dead socket holds no references back
      // into this connection.
      socket.offAny()
      socket.off()
      socket.io.off('reconnect_failed', handleReconnectFailed)
      for (const [roomId, pending] of pendingJoins) {
        pending.reject(
          new Error(`Connection disconnected before join for room "${roomId}" was confirmed`),
        )
      }
      pendingJoins.clear()
      desiredRooms.clear()
      confirmedRooms.clear()
      presenceMap.clear()
      eventHandlers.clear()
      presenceChangeHandlers.length = 0
      reconnectHandlers.length = 0
      stateChangeHandlers.length = 0
      buffer = []
    },

    isConnected(): boolean {
      return state === 'connected'
    },

    getState(): ConnectionState {
      return state
    },

    onReconnect(handler: () => void): void {
      reconnectHandlers.push(handler)
    },

    onStateChange(handler: ConnectionStateHandler): void {
      stateChangeHandlers.push(handler)
    },

    // -- Internal methods (introspection / simulation hooks) ------------------

    _getUrl(): string {
      return url
    },

    _getOptions(): ConnectionOptions {
      return { ...connectionOptions }
    },

    _getConfig(): SocketioConfig {
      return { ...config }
    },

    _getJoinedRooms(): Set<string> {
      // Tracked (desired) rooms — the set re-joined on reconnect. Server
      // confirmations are tracked separately via the pending join promises.
      return new Set(desiredRooms)
    },

    _getBufferedEvents(): BufferedEvent[] {
      return [...buffer]
    },

    _triggerEvent(event: string, data: unknown): void {
      // Routed through the same pipeline as a real incoming socket event —
      // reserved 'molecule:*' events are consumed by the protocol handlers
      // and never reach app-level handlers.
      handleIncoming(event, data)
    },

    _setPresence(roomId: string, presence: PresenceInfo[]): void {
      handlePresence(roomId, presence)
    },

    _setState(newState: ConnectionState): void {
      // Overrides the local state machine only — the underlying socket is
      // not touched. Useful for tests and bindings simulating transitions.
      setState(newState)
    },

    _triggerReconnect(): void {
      // Simulates the reconnect notification only (state + handlers). The
      // real reconnect path (the socket's 'connect' event after a drop)
      // additionally re-joins desired rooms and flushes the buffer.
      setState('connected')
      for (const handler of [...reconnectHandlers]) {
        handler()
      }
    },

    _flushBuffer(): BufferedEvent[] {
      // Drains the buffer WITHOUT emitting — the provider itself flushes
      // over the socket on (re)connect, so this is only for callers that
      // want to take over delivery (or inspect-and-clear in tests).
      const flushed = [...buffer]
      buffer = []
      return flushed
    },

    _confirmJoin(roomId: string): void {
      handleJoined(roomId)
    },

    _confirmLeave(roomId: string): void {
      handleLeft(roomId)
    },

    _getEventHandlers(): Map<string, Set<RealtimeEventHandler>> {
      return new Map(eventHandlers)
    },

    _getPresenceChangeHandlers(): PresenceChangeHandler[] {
      return [...presenceChangeHandlers]
    },

    _getReconnectHandlers(): Array<() => void> {
      return [...reconnectHandlers]
    },

    _getStateChangeHandlers(): ConnectionStateHandler[] {
      return [...stateChangeHandlers]
    },
  }

  return connection
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a Socket.io-based realtime client provider backed by
 * socket.io-client.
 *
 * `connect()` resolves immediately with the connection object in the
 * `'connecting'` state — the UI is never blocked on server availability; use
 * `onStateChange()` to observe the transition to `'connected'`.
 *
 * @param config - Optional Socket.io-specific configuration.
 * @returns A `RealtimeClientProvider` backed by a real Socket.io transport.
 *
 * @example
 * ```typescript
 * import { createSocketioProvider } from '@molecule/app-realtime-socketio'
 * import { setProvider } from '@molecule/app-realtime'
 *
 * setProvider(createSocketioProvider({ transports: ['websocket'] }))
 * ```
 */
export function createSocketioProvider(config: SocketioConfig = {}): RealtimeClientProvider {
  return {
    connect(url: string, options: ConnectionOptions = {}): Promise<RealtimeConnection> {
      return Promise.resolve(createConnectionInstance(url, options, config))
    },
  }
}

/** Default Socket.io realtime client provider instance. */
export const provider: RealtimeClientProvider = createSocketioProvider()
