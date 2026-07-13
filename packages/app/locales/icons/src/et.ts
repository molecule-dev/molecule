import type { IconsTranslations } from './types.js'

/** Icons translations for Estonian. */
export const et: IconsTranslations = {
  'icons.error.noIconSet':
    'Ühtegi IconSet pole seadistatud. Kutsuge rakenduse käivitamisel setIconSet() koos ikooniteegiga (nt @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Ühtegi ikoonikomplekti pole ühendatud. Kutsuge setIconSet() koos IconSet-iga (nt @molecule/app-icons-molecule eksport).',
  'icons.error.notFound': 'Ikooni "{{name}}" ei leitud praegusest ikoonikomplektist.',
}
