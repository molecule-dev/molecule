import type { HealthTranslations } from './types.js'

/** Health translations for Telugu. */
export const te: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}గం {{minutes}}ని',
  'health.durationMinutes': '{{minutes}}ని',
  'health.error.noProvider':
    '`@molecule/app-health`: ఏ హెల్త్ ప్రొవైడర్ కూడా బాండ్ చేయబడలేదు — మీ నేటివ్ రన్‌టైమ్‌లో (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` ఇంటర్‌ఫేస్‌ను ఇంప్లిమెంట్ చేసి, స్టార్టప్‌లో `setProvider()` తో దానిని బాండ్ చేయండి. మాలిక్యూల్ దీని కోసం ఏ ప్రొవైడర్‌ను అందించదు. కాల్ చేయడానికి ముందు `hasProvider()` లేదా `getCapabilities().supported` తో ఫీచర్-డిటెక్ట్ చేయండి — హెల్త్ రీడ్‌కు నిజమైన డిఫాల్ట్ ఉండదు, కాబట్టి ఇది నకిలీ డేటాను తిరిగి ఇవ్వకుండా ఎర్రర్‌ను చూపిస్తుంది.',
}
