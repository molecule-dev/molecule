import type { VersionTranslations } from './types.js'

/** Version translations for ca. */
export const ca: Partial<VersionTranslations> = {
  'version.error.fetchFailed': "No s'ha pogut obtenir la versió: {{status}}",
  'version.summary.features_one': '{{count}} funció nova',
  'version.summary.features_other': '{{count}} funcions noves',
  'version.summary.fixes_one': '{{count}} error corregit',
  'version.summary.fixes_other': '{{count}} errors corregits',
  'version.summary.performance': 'millores de rendiment',
  'version.summary.minor': 'Petites millores',
  'version.summary.featuresShort_one': '{{count}} funció',
  'version.summary.featuresShort_other': '{{count}} funcions',
  'version.summary.fixesShort_one': '{{count}} correcció',
  'version.summary.fixesShort_other': '{{count}} correccions',
  'version.summary.performanceShort': 'més ràpid',
}
