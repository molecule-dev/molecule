import type { HealthTranslations } from './types.js'

/** Health translations for Nepali. */
export const ne: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}घण्टा {{minutes}}मि',
  'health.durationMinutes': '{{minutes}}मि',
  'health.error.noProvider':
    '`@molecule/app-health`: कुनै पनि स्वास्थ्य प्रदायक बन्डेड छैन — आफ्नो नेटिभ रनटाइम (Apple HealthKit / Android Health Connect / Google Fit) मा `HealthProvider` इन्टरफेस लागू गर्नुहोस् र स्टार्टअपमा `setProvider()` सँग बन्ड गर्नुहोस्। Molecule ले यसको लागि कुनै प्रदायक पठाउँदैन। कल गर्नु अघि `hasProvider()` वा `getCapabilities().supported` सँग Feature-detect — हेल्थ रिडमा कुनै इमानदार पूर्वनिर्धारित हुँदैन, त्यसैले यसले नक्कली डेटा फिर्ता गर्नुको सट्टा फ्याँक्छ।',
}
