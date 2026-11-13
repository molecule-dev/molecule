import type { HealthTranslations } from './types.js'

/** Health translations for Albanian. */
export const sq: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}o {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Nuk ka ofrues të lidhur shëndetësor — implementoni ndërfaqen `HealthProvider` në kohën tuaj të ekzekutimit nativ (Apple HealthKit / Android Health Connect / Google Fit) dhe lidheni atë me `setProvider()` në fillim. Molecule nuk dërgon asnjë ofrues për të. Zbuloni veçoritë me `hasProvider()` ose `getCapabilities().supported` para thirrjes — një lexim shëndetësor nuk ka të dhëna të paracaktuara të ndershme, kështu që kjo hedh të dhëna të rreme në vend që të kthejë të dhëna të rreme.',
}
