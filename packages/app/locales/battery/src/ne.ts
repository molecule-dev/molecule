import type { BatteryTranslations } from './types.js'

/** Battery translations for Nepali. */
export const ne: BatteryTranslations = {
  'battery.charging': 'चार्ज हुँदैछ',
  'battery.discharging': 'ब्याट्रीमा',
  'battery.full': 'पूर्ण चार्ज',
  'battery.not-charging': 'चार्ज भइरहेको छैन',
  'battery.unknown': 'अज्ञात',
  'battery.remainingUnknown': 'अज्ञात',
  'battery.remainingTime': '{{hours}}घण्टा {{minutes}}मि',
  'battery.remainingMinutes': '{{minutes}}मि',
  'battery.error.noProvider':
    '`@molecule/app-battery`: कुनै प्रदायक सेट गरिएको छैन। `BatteryProvider` कार्यान्वयनको साथ `setProvider()` कल गर्नुहोस् — Molecule ले यसको लागि कुनै प्रदायक पठाउँदैन; तपाईंको नेटिभ रनटाइममा इन्टरफेस लागू गर्नुहोस् र यसलाई बन्ड गर्नुहोस्।',
}
