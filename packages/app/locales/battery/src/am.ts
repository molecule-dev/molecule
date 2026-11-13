import type { BatteryTranslations } from './types.js'

/** Battery translations for Amharic. */
export const am: BatteryTranslations = {
  'battery.charging': 'በመሙላት ላይ',
  'battery.discharging': 'በባትሪ ላይ',
  'battery.full': 'ሙሉ በሙሉ ተሞልቷል',
  'battery.not-charging': 'እየሞላ አይደለም',
  'battery.unknown': 'ያልታወቀ',
  'battery.remainingUnknown': 'ያልታወቀ',
  'battery.remainingTime': '{{hours}}ሰ {{minutes}}ደ',
  'battery.remainingMinutes': '{{minutes}}ደ',
  'battery.error.noProvider':
    '`@molecule/app-battery`: ምንም አቅራቢ አልተዘጋጀም። `setProvider()`ን በ`BatteryProvider` ትግበራ ይጥሩ — Molecule ለዚህ አቅራቢ አያቀርብም፤ በመሣሪያዎ የአሂድ አካባቢ ላይ በይነገጹን ተግብረው ያገናኙት።',
}
