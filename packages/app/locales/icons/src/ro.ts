import type { IconsTranslations } from './types.js'

/** Icons translations for Romanian. */
export const ro: IconsTranslations = {
  'icons.error.noIconSet':
    'Nu a fost setat niciun IconSet. Apelați setIconSet() la pornirea aplicației cu o bibliotecă de pictograme (de ex., @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Niciun set de pictograme nu este conectat. Apelați setIconSet() cu un IconSet (de ex., exportul din @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Pictograma "{{name}}" nu a fost găsită în setul de pictograme curent.',
}
