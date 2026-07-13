import type { IconsTranslations } from './types.js'

/** Icons translations for German. */
export const de: IconsTranslations = {
  'icons.error.noIconSet':
    'Es wurde kein IconSet festgelegt. Rufen Sie setIconSet() beim App-Start mit einer Icon-Bibliothek auf (z. B. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Kein Icon-Set angebunden. Rufen Sie setIconSet() mit einem IconSet auf (z. B. dem Export aus @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Symbol "{{name}}" wurde im aktuellen Icon-Set nicht gefunden.',
}
