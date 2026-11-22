import type { VueTranslations } from './types.js'

/** Vue translations for Swahili. */
export const sw: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Hakuna kipanga njia hapa. Funga programu katika `MoleculeRouterProvider` kutoka kwa dhamana ya uelekezaji (`@molecule/app-routing-vue-router`), au pitisha `router` hadi `moleculePlugin`. Ikiwa programu tayari imefanya hivi, dhamana yake ya uelekezaji ni ya zamani kuliko dhamana hii: isasishe (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Kifungo hiki cha uelekezaji hakina mwonekano wa kuelekeza hapa: pitisha ukurasa kama watoto badala yake. Ikiwa programu itaelekeza na `@molecule/app-routing-vue-router`, kifungo hicho ni cha zamani kuliko kiunganisho hiki: kisasishe (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider lazima itumike ndani ya StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider lazima itumike ndani ya ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient lazima itumike ndani ya AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider lazima itumike ndani ya StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient lazima itumike ndani ya HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider lazima itumike ndani ya LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast lazima itumike ndani ya ToastProvider',
  'vue.error.unsupportedMethod': 'Njia isiyoungwa mkono: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider lazima utumike ndani ya ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider lazima itumike ndani ya EditorProvider',
  'vue.error.oauthFailed': 'Kuingia kwa OAuth kumeshindwa',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider lazima itumike ndani ya PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'Mtoaji wa UseWorkspace lazima atumike ndani ya Mtoaji wa UseWorkspace',
}
