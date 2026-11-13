import type { HealthTranslations } from './types.js'

/** Health translations for Telugu. */
export const te: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}గం {{minutes}}ని',
  'health.durationMinutes': '{{minutes}}ని',
  'health.error.noProvider':
    '`@molecule/app-health`: ఏ ఆరోగ్య ప్రదాత కూడా అనుసంధానించబడలేదు — మీ నేటివ్ రన్‌టైమ్ (Apple HealthKit / Android Health Connect / Google Fit)లో `HealthProvider` ఇంటర్‌ఫేస్‌ను అమలు చేసి, ప్రారంభంలో `setProvider()` తో దానిని అనుసంధానించండి. ఈ యాప్‌తో ఏ ప్రదాత కూడా పంపబడదు. కాల్ చేయడానికి ముందు `hasProvider()` లేదా `getCapabilities().supported` తో ఫీచర్-డిటెక్ట్ చేయండి — ఆరోగ్య రీడ్‌కు నిజమైన డిఫాల్ట్ ఉండదు, కాబట్టి ఇది నకిలీ డేటాను తిరిగి ఇవ్వకుండా ఒక ఎర్రర్‌ను విసురుతుంది.',
}
