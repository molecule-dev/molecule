import type { HealthTranslations } from './types.js'

/** Health translations for hi. */
export const hi: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}मि',
  'health.durationHoursMinutes': '{{hours}} एच {{minutes}} एम',
  'health.error.noProvider':
    '`@molecule/app-health`: कोई हेल्थ प्रोवाइडर बॉन्डेड नहीं है — अपने नेटिव रनटाइम (Apple HealthKit / Android Health Connect / Google Fit) पर `HealthProvider` इंटरफ़ेस को इम्प्लीमेंट करें और स्टार्टअप पर `setProvider()` का उपयोग करके इसे बॉन्ड करें। Molecule इसके लिए कोई प्रोवाइडर प्रदान नहीं करता है। कॉल करने से पहले `hasProvider()` या `getCapabilities().supported` का उपयोग करके फ़ीचर-डिटेक्ट करें — हेल्थ रीड का कोई वास्तविक डिफ़ॉल्ट मान नहीं होता है, इसलिए यह नकली डेटा लौटाने के बजाय त्रुटि उत्पन्न करता है।',
}
