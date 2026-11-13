import type { HealthTranslations } from './types.js'

/** Health translations for Yoruba. */
export const yo: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}wk {{minutes}}iṣ',
  'health.durationMinutes': '{{minutes}}iṣ',
  'health.error.noProvider':
    '`@molecule/app-health`: Kò sí olùpèsè ìlera tí a so pọ̀ mọ́ — ṣe àgbékalẹ̀ ìfọwọ́sowọ́pọ̀ `HealthProvider` ní àkókò ìṣiṣẹ́ rẹ (Apple HealthKit / Android Health Connect / Google Fit) kí o sì so ó pọ̀ mọ́ `setProvider()` ní ìbẹ̀rẹ̀. Kò sí olùpèsè tí ó ń bá àwọn ọkọ̀ ojú omi náà rìn. Ṣàwárí ẹ̀yà ara pẹ̀lú `hasProvider()` tàbí `getCapabilities().supported` kí o tó pè — kíkà ìlera kò ní àìṣeéyípadà òótọ́, nítorí náà èyí máa ń mú kí ó dà bí ìwífún èké padà.',
}
