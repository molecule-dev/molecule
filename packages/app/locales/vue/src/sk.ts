import type { VueTranslations } from './types.js'

/** Vue translations for Slovak. */
export const sk: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Žiadny smerovač tu nie je. Zabaľte aplikáciu do `MoleculeRouterProvider` z smerovacej väzby (`@molecule/app-routing-vue-router`) alebo odovzdajte `router` do `moleculePlugin`. Ak to aplikácia už robí, jej smerovacia väzba je staršia ako táto väzba: aktualizujte ju (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Toto smerovacie prepojenie nemá žiadny smerovaný pohľad na vykreslenie: namiesto toho odovzdajte stránku ako deti. Ak aplikácia smeruje s `@molecule/app-routing-vue-router`, toto prepojenie je staršie ako toto prepojenie: aktualizujte ho (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci ThemeProvider',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci StorageProvider',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci LoggerProvider',
  'vue.error.useToastOutsideProvider':
    'useToast sa mus\u00ed pou\u017e\u00edva\u0165 v r\u00e1mci ToastProvider',
  'vue.error.unsupportedMethod': 'Nepodporovan\u00e1 met\u00f3da: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider musí byť použitý vnútri ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider sa musí použiť v rámci EditorProvider',
  'vue.error.oauthFailed': 'Prihlásenie cez OAuth zlyhalo',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider sa musí použiť v rámci PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider sa musí použiť v rámci WorkspaceProvider',
}
