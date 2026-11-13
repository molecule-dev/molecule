import type { HealthTranslations } from './types.js'

/** Health translations for Hungarian. */
export const hu: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ó {{minutes}}p',
  'health.durationMinutes': '{{minutes}}p',
  'health.error.noProvider':
    '`@molecule/app-health`: Nincs egészségügyi szolgáltató kötve — implementáld a `HealthProvider` felületet a natív futtatókörnyezeteden (Apple HealthKit / Android Health Connect / Google Fit), és indításkor kösd össze `setProvider()` függvénnyel. A Molecule nem szállít szolgáltatót hozzá. Jellemzőket kell észlelni `hasProvider()` vagy `getCapabilities().supported` függvénnyel a hívás előtt — az egészségügyi olvasatnak nincs valódi alapértelmezett értéke, így ez hamis adatokat dob, nem pedig ad vissza.',
}
