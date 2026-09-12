/**
 * Shapes shared by the three halves of the preview bond: the page client, the
 * dev-server WebSocket hub, and the sandbox-side driver.
 *
 * @module
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { E2EConnectOptions } from '@molecule/app-e2e'

/** WebSocket path the hub listens on (same origin as the previewed page). */
export const E2E_WS_PATH = '/__mol/e2e'

/** Path the page client script is served from (dev and `vite preview`). */
export const E2E_CLIENT_PATH = '/__mol/e2e-client.js'

/** The hub writes its driver token here so a runner on the same machine can find it. */
export const tokenFilePath = (port: number): string => join(tmpdir(), `mol-e2e-${port}.json`)

/** Options for `provider.connect()` beyond the core's. */
export interface PreviewConnectOptions extends E2EConnectOptions {
  /** Full hub URL (`ws://127.0.0.1:5173/__mol/e2e`); overrides port discovery. */
  url?: string
  /** Dev-server port to try first (the sandbox serves the preview on 5173). */
  port?: number
  /** Driver token; defaults to `MOL_E2E_TOKEN` or the hub's token file. */
  token?: string
  /** Drive one specific page (an id from `listPages()`); defaults to the most recently seen visible page. */
  pageId?: string
  /** How long to wait for a preview page to be connected before failing, ms. */
  connectTimeout?: number
}

/** A page currently connected to the hub. */
export interface PagePeer {
  id: string
  href: string
  title: string
  hidden: boolean
  framed: boolean
  connectedAt: number
  lastSeen: number
}

/** Hub → driver event envelope. */
export interface HubEvent {
  event: string
  pageId?: string
  [key: string]: unknown
}
