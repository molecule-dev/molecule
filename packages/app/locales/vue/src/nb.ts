import type { VueTranslations } from './types.js'

/** Vue translations for Norwegian Bokmål. */
export const nb: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Ingen ruter her. Pakk appen inn i `MoleculeRouterProvider` fra rutingsbindingen (`@molecule/app-routing-vue-router`), eller send `router` til `moleculePlugin`. Hvis appen allerede gjør dette, er rutingsbindingen eldre enn denne bindingen: oppdater den (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Denne rutingsbindingen har ingen rutet visning å gjengi her: send siden som underordnede i stedet. Hvis appen ruter med `@molecule/app-routing-vue-router`, er den bindingen eldre enn denne bindingen: oppdater den (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider m\u00e5 brukes innenfor en StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider m\u00e5 brukes innenfor en ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient m\u00e5 brukes innenfor en AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider m\u00e5 brukes innenfor en StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient m\u00e5 brukes innenfor en HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider m\u00e5 brukes innenfor en LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast m\u00e5 brukes innenfor en ToastProvider',
  'vue.error.unsupportedMethod': 'Ikke-st\u00f8ttet metode: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider må brukes innenfor en ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider må brukes i en EditorProvider',
  'vue.error.oauthFailed': 'OAuth-pålogging mislyktes',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider må brukes i en PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider': 'useWorkspaceProvider må brukes i en WorkspaceProvider',
}
