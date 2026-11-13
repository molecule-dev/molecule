import type { HealthTranslations } from './types.js'

/** Health translations for fr. */
export const fr: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}} min',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} m',
  'health.error.noProvider':
    "`@molecule/app-health` : Aucun fournisseur de santé n'est associé. Implémentez l'interface `HealthProvider` dans votre environnement d'exécution natif (Apple HealthKit / Android Health Connect / Google Fit) et associez-la avec `setProvider()` au démarrage. Molecule ne fournit aucun fournisseur pour cette interface. Détectez les fonctionnalités avec `hasProvider()` ou `getCapabilities().supported` avant d'appeler la fonction : une lecture de données de santé n'a pas de valeur par défaut fiable, cette fonction lève donc une exception plutôt que de renvoyer des données erronées.",
}
