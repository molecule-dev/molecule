import type { HealthTranslations } from './types.js'

/** Health translations for Sinhala. */
export const si: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}පැ {{minutes}}මි',
  'health.durationMinutes': '{{minutes}}මි',
  'health.error.noProvider':
    '`@molecule/app-health`: සෞඛ්‍ය සැපයුම්කරුවෙකු බන්ධනය කර නැත — ඔබේ ස්වදේශීය ධාවන කාලය (Apple HealthKit / Android Health Connect / Google Fit) මත `HealthProvider` අතුරුමුහුණත ක්‍රියාත්මක කර ආරම්භයේදී එය `setProvider()` සමඟ බන්ධනය කරන්න. කිසිදු සැපයුම්කරුවෙකු බලඇණිය සමඟ නැව්ගත නොකරයි. ඇමතීමට පෙර `hasProvider()` හෝ `getCapabilities().supported` සමඟ විශේෂාංග-අනාවරණය — සෞඛ්‍ය කියවීමකට අවංක පෙරනිමියක් නොමැත, එබැවින් මෙය ව්‍යාජ දත්ත ආපසු ලබා දීමට වඩා විසි කරයි.',
}
