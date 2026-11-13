import type { HealthTranslations } from './types.js'

/** Health translations for Tamil. */
export const ta: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ம {{minutes}}நி',
  'health.durationMinutes': '{{minutes}}நி',
  'health.error.noProvider':
    '`@molecule/app-health`: எந்த ஹெல்த் புரொவைடரும் இணைக்கப்படவில்லை — உங்கள் நேட்டிவ் ரன்டைமில் (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` இடைமுகத்தைச் செயல்படுத்தி, தொடக்கத்தில் `setProvider()` மூலம் அதை இணைக்கவும். Molecule அதற்கான புரொவைடரை வழங்கவில்லை. அழைப்பதற்கு முன் `hasProvider()` அல்லது `getCapabilities().supported` மூலம் அம்சத்தைக் கண்டறியவும் — ஒரு ஹெல்த் ரீடிற்கு நேர்மையான இயல்புநிலை இல்லை, எனவே இது தவறான தரவைத் திருப்பித் தருவதற்குப் பதிலாகப் பிழையை ஏற்படுத்தும்.',
}
