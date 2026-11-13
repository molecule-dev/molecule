import type { HealthTranslations } from './types.js'

/** Health translations for Malayalam. */
export const ml: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}മ {{minutes}}മി',
  'health.durationMinutes': '{{minutes}}മി',
  'health.error.noProvider':
    '`@molecule/app-health`: ആരോഗ്യ ദാതാവിനെ ബന്ധിപ്പിച്ചിട്ടില്ല — നിങ്ങളുടെ നേറ്റീവ് റൺടൈമിൽ (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` ഇന്റർഫേസ് നടപ്പിലാക്കുകയും സ്റ്റാർട്ടപ്പിൽ തന്നെ `setProvider()` എന്നതുമായി അതിനെ ബന്ധിപ്പിക്കുകയും ചെയ്യുക. ഒരു ദാതാവും ഫ്ലീറ്റുമായി അയയ്ക്കുന്നില്ല. വിളിക്കുന്നതിന് മുമ്പ് `hasProvider()` അല്ലെങ്കിൽ `getCapabilities().supported` ഉപയോഗിച്ച് ഫീച്ചർ-ഡിറ്റക്റ്റ് ചെയ്യുക — ഒരു ആരോഗ്യ റീഡിന് സത്യസന്ധമായ ഡിഫോൾട്ട് ഇല്ല, അതിനാൽ ഇത് വ്യാജ ഡാറ്റ തിരികെ നൽകുന്നതിന് പകരം എറിയുന്നു.',
}
