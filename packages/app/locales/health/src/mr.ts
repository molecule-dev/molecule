import type { HealthTranslations } from './types.js'

/** Health translations for Marathi. */
export const mr: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ता {{minutes}}मि',
  'health.durationMinutes': '{{minutes}}मि',
  'health.error.noProvider':
    '`@molecule/app-health`: कोणताही हेल्थ प्रोव्हायडर जोडलेला नाही — तुमच्या नेटिव्ह रनटाइमवर (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` इंटरफेस लागू करा आणि स्टार्टअपच्या वेळी `setProvider()` वापरून तो जोडा. मॉलिक्यूलमध्ये यासाठी कोणताही प्रोव्हायडर दिलेला नाही. कॉल करण्यापूर्वी `hasProvider()` किंवा `getCapabilities().supported` वापरून फीचर-डिटेक्ट करा — हेल्थ रीडमध्ये कोणतेही प्रामाणिक डिफॉल्ट नसते, त्यामुळे हे बनावट डेटा परत करण्याऐवजी एरर देते.',
}
