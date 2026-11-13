import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for af. */
export const af: Partial<KeyboardTranslations> = {
  'keyboard.error.noProvider':
    "@molecule/app-sleutelbord: Geen verskaffer gestel nie. Roep setProvider() met 'n Sleutelbordverskaffer-implementering (bv. vanaf @molecule/app-sleutelbord-kondensator).",
  'keyboard.error.missingDependency': '`{{library}}` is vereis maar nie geïnstalleer nie.',
}
