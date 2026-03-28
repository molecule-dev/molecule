/**
 * Socket.io implementation of the molecule RealtimeClientProvider.
 *
 * Provides a headless state manager for realtime connections following
 * Socket.io patterns. Framework bindings (React, Vue, etc.) use the
 * extended {@link SocketioConnection} internal methods to wire actual
 * Socket.io client events into the provider's state.
 *
 * @module
 */

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
// Connection instance
// ---------------------------------------------------------------------------

/**
 * Creates a SocketioConnection that manages realtime state in memory.
 *
 * @param url - The server URL.
 * @param connectionOptions - Connection configuration from the core interface.
 * @param config - Socket.io-specific configuration.
 * @returns A SocketioConnection backed by in-memory state.
 */
function createConnectionInstance(
  url: string,
  connectionOptions: ConnectionOptions,
  config: SocketioConfig,
): SocketioConnection {
  let state: ConnectionState = 'connected'
  const rooms = new Set<string>()
  const eventHandlers = new Map<string, Set<RealtimeEventHandler>>()
  const presenceMap = new Map<string, PresenceInfo[]>()
  const presenceChangeHandlers: PresenceChangeHandler[] = []
  const reconnectHandlers: Array<() => void> = []
  const stateChangeHandlers: ConnectionStateHandler[] = []
  let buffer: BufferedEvent[] = []
  const bufferEnabled = config.bufferEvents ?? true
  const maxBufferSize = config.maxBufferSize ?? 100

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Adds an event to the buffer if buffering is enabled and the connection
   * is not active.
   *
   * @param event - The event name.
   * @param data - The event payload.
   * @param roomId - Optional room target.
   * @returns `true` if the event was buffered, `false` otherwise.
   */
  function tryBuffer(event: string, data: unknown, roomId?: string): boolean {
    if (!bufferEnabled || state === 'connected') return false
    if (buffer.length < maxBufferSize) {
      buffer.push({ event, data, roomId })
    }
    return true
  }

  /**
   * Notifies all state change handlers of a new state.
   *
   * @param newState - The new connection state.
   */
  function notifyStateChange(newState: ConnectionState): void {
    for (const handler of stateChangeHandlers) {
      handler(newState)
    }
  }

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const connection: SocketioConnection = {
    // -- Rooms ---------------------------------------------------------------

    joinRoom(roomId: string): Promise<void> {
      rooms.add(roomId)
      return Promise.resolve()
    },

    leaveRoom(roomId: string): Promise<void> {
      rooms.delete(roomId)
      presenceMap.delete(roomId)
      return Promise.resolve()
    },

    // -- Messaging -----------------------------------------------------------

    send(event: string, data: unknown): void {
      tryBuffer(event, data)
    },

    sendTo(roomId: string, event: string, data: unknown): void {
      tryBuffer(event, data, roomId)
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

    disconnect(): void {
      state = 'disconnected'
      notifyStateChange('disconnected')
      rooms.clear()
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

    // -- Internal methods for framework bindings -----------------------------

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
      return new Set(rooms)
    },

    _getBufferedEvents(): BufferedEvent[] {
      return [...buffer]
    },

    _triggerEvent(event: string, data: unknown): void {
      const handlers = eventHandlers.get(event)
      if (handlers) {
        for (const handler of handlers) {
          handler(data)
        }
      }
    },

    _setPresence(roomId: string, presence: PresenceInfo[]): void {
      presenceMap.set(roomId, [...presence])
      for (const handler of presenceChangeHandlers) {
        handler([...presence])
      }
    },

    _setState(newState: ConnectionState): void {
      if (newState === state) return
      state = newState
      notifyStateChange(newState)
    },

    _triggerReconnect(): void {
      state = 'connected'
      notifyStateChange('connected')
      for (const handler of reconnectHandlers) {
        handler()
      }
    },

    _flushBuffer(): BufferedEvent[] {
      const flushed = [...buffer]
      buffer = []
      return flushed
    },

    _confirmJoin(roomId: string): void {
      rooms.add(roomId)
    },

    _confirmLeave(roomId: string): void {
      rooms.delete(roomId)
      presenceMap.delete(roomId)
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
 * Creates a Socket.io-based realtime client provider.
 *
 * @param config - Optional Socket.io-specific configuration.
 * @returns A `RealtimeClientProvider` backed by Socket.io-style state management.
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
