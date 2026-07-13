import type { IconsTranslations } from './types.js'

/** Icons translations for Slovak. */
export const sk: IconsTranslations = {
  'icons.error.noIconSet':
    'Nebol nastavený žiadny IconSet. Zavolajte setIconSet() pri spustení aplikácie s knižnicou ikon (napr. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nie je pripojená žiadna sada ikon. Zavolajte setIconSet() s objektom IconSet (napr. export z @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikona "{{name}}" sa nenašla v aktuálnej sade ikon.',
}
