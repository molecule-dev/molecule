/**
 * Live preview panel types.
 *
 * @module
 */

/**
 * Device Frame type.
 */
export type DeviceFrame = 'none' | 'mobile' | 'tablet' | 'desktop'

/**
 * Configuration for preview.
 */
export interface PreviewConfig {
  url: string
  defaultDevice?: DeviceFrame
  interactive?: boolean
  autoRefresh?: boolean
  refreshDelay?: number
}

/**
 * State for preview.
 */
export interface PreviewState {
  url: string
  isLoading: boolean
  device: DeviceFrame
  error: string | null
  isConnected: boolean
}

/**
 * Provider interface for preview.
 */
export interface PreviewProvider {
  readonly name: string
  setUrl(url: string): void
  getUrl(): string
  refresh(): void
  setDevice(device: DeviceFrame): void
  getState(): PreviewState
  navigateTo(path: string): void
  subscribe(callback: (state: PreviewState) => void): () => void
  openExternal(): void
}
