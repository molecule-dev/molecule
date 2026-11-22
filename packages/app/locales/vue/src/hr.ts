import type { VueTranslations } from './types.js'

/** Vue translations for Croatian. */
export const hr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Ovdje nema usmjerivača. Omotajte aplikaciju u `MoleculeRouterProvider` iz veze usmjeravanja (`@molecule/app-routing-vue-router`) ili proslijedite `router` u `moleculePlugin`. Ako aplikacija to već radi, njena veza usmjeravanja je starija od ove veze: ažurirajte je (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Ova veza usmjeravanja nema usmjerni prikaz za prikaz ovdje: umjesto toga proslijedite stranicu kao djecu. Ako se aplikacija usmjerava s `@molecule/app-routing-vue-router`, ta je veza starija od ove veze: ažurirajte je (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider se mora koristiti unutar StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider se mora koristiti unutar ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient se mora koristiti unutar AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider se mora koristiti unutar StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient se mora koristiti unutar HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider se mora koristiti unutar LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast se mora koristiti unutar ToastProvider',
  'vue.error.unsupportedMethod': 'Nepodržana metoda: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider se mora koristiti unutar ChatProvider-a',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider se mora koristiti unutar EditorProvider-a',
  'vue.error.oauthFailed': 'Prijava putem OAuth-a nije uspjela',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora koristiti unutar PreviewProvider-a',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora koristiti unutar WorkspaceProvider-a',
}
