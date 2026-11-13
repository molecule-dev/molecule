import type { BatteryTranslations } from './types.js'

/** Battery translations for cy. */
export const cy: Partial<BatteryTranslations> = {
  'battery.charging': 'Yn Gwefru',
  'battery.discharging': 'Ar Fatri',
  'battery.not-charging': 'Ddim yn Gwefru',
  'battery.unknown': 'Anhysbys',
  'battery.remainingUnknown': 'Anhysbys',
  'battery.remainingTime': '{{hours}}a {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.full': "Wedi'i wefru'n llawn",
  'battery.error.noProvider':
    "`@molecule/app-battery`: Dim darparwr wedi'i osod. Ffoniwch `setProvider()` gyda gweithrediad `BatteryProvider` — does dim darparwr yn dod gyda'r fflyd; gweithredwch y rhyngwyneb ar eich amser rhedeg brodorol a'i fondio.",
}
