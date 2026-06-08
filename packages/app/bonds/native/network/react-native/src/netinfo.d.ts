/**
 * Minimal type declarations for @react-native-community/netinfo used by this package.
 *
 * The real types ship with the peer package. However, installing it in a non-RN
 * workspace breaks Vitest across every package that mocks it. This stub provides
 * the subset we need for compilation; the real types take over when the package is
 * consumed in an actual React Native project.
 *
 * @module
 */

declare module '@react-native-community/netinfo' {
  /** NetInfo state shape used by this provider. */
  export interface NetInfoState {
    isConnected: boolean | null
    isInternetReachable: boolean | null
    type: string
    details: {
      cellularGeneration?: string
      isConnectionExpensive?: boolean
    } | null
  }

  /** NetInfo module shape used by this provider. */
  export interface NetInfoModule {
    fetch(): Promise<NetInfoState>
    addEventListener(callback: (state: NetInfoState) => void): () => void
  }

  export function fetch(): Promise<NetInfoState>
  export function addEventListener(callback: (state: NetInfoState) => void): () => void

  const _default: NetInfoModule
  export default _default
}
