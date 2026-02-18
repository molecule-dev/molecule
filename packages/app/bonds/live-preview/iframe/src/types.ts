/**
 * Iframe preview provider configuration.
 *
 * @module
 */

import type { DeviceFrame } from '@molecule/app-live-preview'

/**
 * Configuration for iframe preview.
 */
export interface IframePreviewConfig {
  /** Initial preview URL. */
  defaultUrl?: string
  /** Default device frame. */
  defaultDevice?: DeviceFrame
  /** Auto-refresh on URL change. */
  autoRefresh?: boolean
  /** Delay in ms before auto-refresh. */
  refreshDelay?: number
}
