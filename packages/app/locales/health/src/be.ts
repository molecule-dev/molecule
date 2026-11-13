import type { HealthTranslations } from './types.js'

/** Health translations for Belarusian. */
export const be: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}г {{minutes}}хв',
  'health.durationMinutes': '{{minutes}}хв',
  'health.error.noProvider':
    '`@molecule/app-health`: Няма прывязанага пастаўшчыка медыцынскіх паслуг — рэалізуйце інтэрфейс `HealthProvider` у вашым родным асяроддзі выканання (Apple HealthKit / Android Health Connect / Google Fit) і прывяжыце яго да `setProvider()` пры запуску. Molecule не пастаўляе для яго пастаўшчыка. Выяўленне функцый з дапамогай `hasProvider()` або `getCapabilities().supported` перад выклікам — чытанне стану здароўя не мае сумленных значэнняў па змаўчанні, таму гэта выкідвае, а не вяртае падробленыя дадзеныя.',
}
