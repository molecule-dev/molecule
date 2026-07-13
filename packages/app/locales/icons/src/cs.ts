import type { IconsTranslations } from './types.js'

/** Icons translations for Czech. */
export const cs: IconsTranslations = {
  'icons.error.noIconSet':
    'Nebyl nastaven žádný IconSet. Zavolejte setIconSet() při spuštění aplikace s knihovnou ikon (např. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Není připojena žádná sada ikon. Zavolejte setIconSet() s objektem IconSet (např. export z @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikona "{{name}}" nebyla nalezena v aktuální sadě ikon.',
}
