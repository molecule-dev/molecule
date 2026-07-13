import type { IconsTranslations } from './types.js'

/** Icons translations for Lithuanian. */
export const lt: IconsTranslations = {
  'icons.error.noIconSet':
    'Nenustatytas joks IconSet. Iškvieskite setIconSet() paleidžiant programą su piktogramų biblioteka (pvz., @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Neprijungtas joks piktogramų rinkinys. Iškvieskite setIconSet() su IconSet (pvz., eksportas iš @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Piktograma "{{name}}" nerasta dabartiniame piktogramų rinkinyje.',
}
