import type { VueTranslations } from './types.js'

/** Vue translations for Finnish. */
export const fi: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance tulee käyttää RouterProvider sisällä',
  'vue.error.useStoreOutsideProvider': 'useStateProvider tulee käyttää StateProvider sisällä',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider tulee käyttää ThemeProvider sisällä',
  'vue.error.useAuthOutsideProvider': 'useAuthClient tulee käyttää AuthProvider sisällä',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider tulee käyttää StorageProvider sisällä',
  'vue.error.useHttpOutsideProvider': 'useHttpClient tulee käyttää HttpProvider sisällä',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider tulee käyttää LoggerProvider sisällä',
  'vue.error.useToastOutsideProvider': 'useToast tulee käyttää ToastProvider sisällä',
  'vue.error.unsupportedMethod': 'Ei-tuettu menetelmä: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider on käytettävä ChatProvider-komponentin sisällä',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider-muuttujaa on käytettävä EditorProvider-muuttujassa.',
  'vue.error.oauthFailed': 'OAuth-kirjautuminen epäonnistui',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider-parametria on käytettävä PreviewProvider-parametrin sisällä.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider-arvoa on käytettävä WorkspaceProvider-arvoa noudattaen.',
}
