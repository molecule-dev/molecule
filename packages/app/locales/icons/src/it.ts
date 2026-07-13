import type { IconsTranslations } from './types.js'

/** Icons translations for it. */
export const it: Partial<IconsTranslations> = {
  'icons.error.notFound': 'L\'icona "{{name}}" non è stata trovata nel set di icone corrente.',
  'icons.error.noIconSet':
    "Non è stato impostato alcun IconSet. Chiama setIconSet() all'avvio dell'app con una libreria di icone (ad esempio, @molecule/app-icons-molecule).",
  'icons.error.noProvider':
    "@molecule/app-icons: Nessun set di icone collegato. Chiama setIconSet() con un IconSet (ad esempio, l'export di @molecule/app-icons-molecule).",
}
