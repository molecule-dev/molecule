import type { BatteryTranslations } from './types.js'

/** Battery translations for fr. */
export const fr: Partial<BatteryTranslations> = {
  'battery.unknown': 'Inconnu',
  'battery.remainingUnknown': 'Inconnu',
  'battery.remainingMinutes': '{{minutes}} min',
  'battery.charging': 'Chargement',
  'battery.discharging': 'Sur batterie',
  'battery.full': 'Entièrement chargé',
  'battery.not-charging': 'Pas de facturation',
  'battery.remainingTime': '{{hours}} h {{minutes}} m',
  'battery.error.noProvider':
    "`@molecule/app-battery` : Aucun fournisseur n'est défini. Appelez `setProvider()` avec une implémentation de `BatteryProvider` — aucun fournisseur n'est fourni avec la flotte ; implémentez l'interface sur votre environnement d'exécution natif et associez-la.",
}
