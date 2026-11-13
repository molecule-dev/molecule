import type { HealthTranslations } from './types.js'

/** Health translations for hi. */
export const hi: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}मि',
  'health.durationHoursMinutes': '{{hours}} एच {{minutes}} एम',
  'health.error.noProvider':
    '`@molecule/app-health`: कोई स्वास्थ्य प्रदाता संबद्ध नहीं है — अपने नेटिव रनटाइम (Apple HealthKit / Android Health Connect / Google Fit) पर `HealthProvider` इंटरफ़ेस लागू करें और स्टार्टअप पर `setProvider()` का उपयोग करके इसे संबद्ध करें। ऐप के साथ कोई प्रदाता संलग्न नहीं है। कॉल करने से पहले `hasProvider()` या `getCapabilities().supported` का उपयोग करके फ़ीचर का पता लगाएं — स्वास्थ्य डेटा पढ़ने का कोई सटीक डिफ़ॉल्ट मान नहीं होता है, इसलिए यह गलत डेटा लौटाने के बजाय त्रुटि उत्पन्न करता है।',
}
