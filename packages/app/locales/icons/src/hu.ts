import type { IconsTranslations } from './types.js'

/** Icons translations for Hungarian. */
export const hu: IconsTranslations = {
  'icons.error.noIconSet':
    'Nincs beállítva IconSet. Hívja meg a setIconSet() függvényt az alkalmazás indításakor egy ikonkönyvtárral (pl. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nincs csatlakoztatva ikonkészlet. Hívja meg a setIconSet() függvényt egy IconSet értékkel (pl. a @molecule/app-icons-molecule exportjával).',
  'icons.error.notFound': 'Az ikon "{{name}}" nem található az aktuális ikoncsomagban.',
}
