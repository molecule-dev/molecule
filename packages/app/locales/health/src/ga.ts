import type { HealthTranslations } from './types.js'

/** Health translations for Irish. */
export const ga: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}u {{minutes}}n',
  'health.durationMinutes': '{{minutes}}n',
  'health.error.noProvider':
    '`@molecule/app-health`: Gan aon soláthraí sláinte nasctha — cuir an comhéadan `HealthProvider` i bhfeidhm ar do rith-am dúchais (Apple HealthKit / Android Health Connect / Google Fit) agus ceangail é le `setProvider()` ag an am tosaithe. Ní sheoltar aon soláthraí leis an gcabhlach. Braith gnéithe le `hasProvider()` nó `getCapabilities().supported` sula nglaotar — níl aon réamhshocrú macánta ag léamh sláinte, mar sin caitheann sé seo sonraí bréige seachas iad a thabhairt ar ais.',
}
