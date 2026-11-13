import type { StatusBarTranslations } from './types.js'

/** StatusBar translations for af. */
export const af: Partial<StatusBarTranslations> = {
  'statusBar.error.noProvider':
    "@molecule/app-status-bar: Geen verskaffer gestel nie. Roep setProvider() met 'n StatusBarProvider-implementering (bv. vanaf @molecule/app-status-bar-react-native).",
  'statusBar.error.missingDependency': '`{{library}}` is vereis maar nie geïnstalleer nie.',
}
