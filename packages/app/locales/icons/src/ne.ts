import type { IconsTranslations } from './types.js'

/** Icons translations for Nepali. */
export const ne: IconsTranslations = {
  'icons.error.noIconSet':
    'कुनै IconSet सेट गरिएको छैन। एप सुरु हुँदा आइकन लाइब्रेरीसँग setIconSet() कल गर्नुहोस् (जस्तै, @molecule/app-icons-molecule)।',
  'icons.error.noProvider':
    '@molecule/app-icons: कुनै आइकन सेट जोडिएको छैन। IconSet सँग setIconSet() कल गर्नुहोस् (जस्तै, @molecule/app-icons-molecule बाट एक्सपोर्ट)।',
  'icons.error.notFound': 'आइकन "{{name}}" हालको आइकन सेटमा फेला परेन।',
}
