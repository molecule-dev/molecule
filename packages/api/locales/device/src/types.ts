/** Translation keys for the device locale package. */
export type DeviceTranslationKey =
  | 'device.error.unauthorized'
  | 'device.error.badRequest'
  | 'device.error.notFound'

/** Translation record mapping device keys to translated strings. */
export type DeviceTranslations = Record<DeviceTranslationKey, string>
