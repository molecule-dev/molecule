/** Translation keys for the battery locale package. */
export type BatteryTranslationKey =
  | 'battery.charging'
  | 'battery.discharging'
  | 'battery.full'
  | 'battery.not-charging'
  | 'battery.unknown'
  | 'battery.remainingUnknown'
  | 'battery.remainingTime'
  | 'battery.remainingMinutes'
  | 'battery.error.noProvider'

/** Translation record mapping battery keys to translated strings. */
export type BatteryTranslations = Record<BatteryTranslationKey, string>
