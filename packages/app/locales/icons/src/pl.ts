import type { IconsTranslations } from './types.js'

/** Icons translations for Polish. */
export const pl: IconsTranslations = {
  'icons.error.noIconSet':
    'Nie ustawiono IconSet. Wywołaj setIconSet() podczas uruchamiania aplikacji z biblioteką ikon (np. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nie podłączono żadnego zestawu ikon. Wywołaj setIconSet() z IconSet (np. eksportem z @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikona "{{name}}" nie została znaleziona w bieżącym zestawie ikon.',
}
