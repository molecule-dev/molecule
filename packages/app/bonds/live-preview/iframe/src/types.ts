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
}
