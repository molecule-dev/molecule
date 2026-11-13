import type { HealthTranslations } from './types.js'

/** Health translations for Amharic. */
export const am: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ሰ {{minutes}}ደ',
  'health.durationMinutes': '{{minutes}}ደ',
  'health.error.noProvider':
    '`@molecule/app-health` ፡ የጤና አገልግሎት አቅራቢ አልተያያዘም — `HealthProvider` በይነገጽን በአገር ውስጥ በሚሰራበት ጊዜ (Apple HealthKit / Android Health Connect / Google Fit) ላይ ይተግብሩ እና ጅምር ላይ `setProvider()` ጋር ያገናኙት። ከአቅራቢው ጋር ምንም አይነት አገልግሎት አቅራቢ አይላክም። ከመደወልዎ በፊት `hasProvider()` ወይም `getCapabilities().supported` የሚለውን ባህሪ ያግኙ - የጤና ንባብ ምንም አይነት ትክክለኛ ነባሪ የለውም፣ ስለዚህ ይህ የውሸት ውሂብ ከመመለስ ይልቅ ይጥላል።',
}
