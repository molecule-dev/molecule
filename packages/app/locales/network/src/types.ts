/** Translation keys for the network locale package. */
export type NetworkTranslationKey =
  | 'network.wifi'
  | 'network.cellular'
  | 'network.ethernet'
  | 'network.bluetooth'
  | 'network.vpn'
  | 'network.other'
  | 'network.none'
  | 'network.unknown'
  | 'network.error.connectionTimeout'
  | 'network.error.unavailable'
  | 'network.error.missingDependency'
  | 'network.error.noProvider'

/** Translation record mapping network keys to translated strings. */
export type NetworkTranslations = Record<NetworkTranslationKey, string>
