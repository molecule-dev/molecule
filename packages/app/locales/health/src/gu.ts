import type { HealthTranslations } from './types.js'

/** Health translations for Gujarati. */
export const gu: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ક {{minutes}}મિ',
  'health.durationMinutes': '{{minutes}}મિ',
  'health.error.noProvider':
    '`@molecule/app-health`: કોઈ આરોગ્ય પ્રદાતા બંધાયેલ નથી — તમારા મૂળ રનટાઇમ (Apple HealthKit / Android Health Connect / Google Fit) પર `HealthProvider` ઇન્ટરફેસ લાગુ કરો અને સ્ટાર્ટઅપ પર તેને `setProvider()` સાથે બોન્ડ કરો. કોઈ પ્રદાતા ફ્લીટ સાથે શિપ કરતું નથી. કૉલ કરતા પહેલા `hasProvider()` અથવા `getCapabilities().supported` સાથે Feature-detect — હેલ્થ રીડમાં કોઈ પ્રમાણિક ડિફોલ્ટ નથી, તેથી આ નકલી ડેટા પરત કરવાને બદલે ફેંકી દે છે.',
}
