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
    '`@molecule/app-battery` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation de `BatteryProvider` — Molecule ne fournit aucun fournisseur pour cette fonctionnalité ; implémentez l’interface dans votre environnement d’exécution natif et effectuez la liaison.',
}
