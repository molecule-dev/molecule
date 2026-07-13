import type { IconsTranslations } from './types.js'

/** Icons translations for Norwegian Bokmål. */
export const nb: IconsTranslations = {
  'icons.error.noIconSet':
    'Ingen IconSet er satt. Kall setIconSet() ved appoppstart med et ikonbibliotek (f.eks. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Ingen ikonsett er tilkoblet. Kall setIconSet() med et IconSet (f.eks. eksporten fra @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikonet "{{name}}" ble ikke funnet i gjeldende ikonsett.',
}
