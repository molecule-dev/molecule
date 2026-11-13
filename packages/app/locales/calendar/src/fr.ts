import type { CalendarTranslations } from './types.js'

/** Calendar translations for French. */
export const fr: CalendarTranslations = {
  'calendar.error.noProvider':
    "`@molecule/app-device-calendar` : Aucun fournisseur n'est défini. Appelez `setProvider()` avec une implémentation `CalendarProvider` — Molecule ne fournit aucun fournisseur pour cela ; implémentez l'interface dans votre environnement d'exécution natif et liez-la.",
}
