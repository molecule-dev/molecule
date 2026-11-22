import type { VueTranslations } from './types.js'

/** Vue translations for Portuguese. */
export const pt: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Não há roteador aqui. Envolva o aplicativo em `MoleculeRouterProvider` do binding de roteamento (`@molecule/app-routing-vue-router`), ou passe `router` para `moleculePlugin`. Se o aplicativo já faz isso, seu binding de roteamento é mais antigo que este: atualize-o (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Esta vinculação de roteamento não possui uma visualização roteada para renderizar aqui: passe a página como filhos. Se o aplicativo roteia com `@molecule/app-routing-vue-router`, essa vinculação é mais antiga que esta vinculação: atualize-a (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider deve ser usado dentro de um StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider deve ser usado dentro de um ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient deve ser usado dentro de um AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider deve ser usado dentro de um StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient deve ser usado dentro de um HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider deve ser usado dentro de um LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
  'vue.error.unsupportedMethod': 'M\u00e9todo n\u00e3o suportado: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider deve ser usado dentro de um ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'O parâmetro useEditorProvider deve ser usado dentro de um EditorProvider.',
  'vue.error.oauthFailed': 'Falha no login OAuth',
  'vue.error.usePreviewOutsideProvider':
    'O parâmetro usePreviewProvider deve ser usado dentro de um PreviewProvider.',
  'vue.error.useWorkspaceOutsideProvider':
    'O parâmetro useWorkspaceProvider deve ser usado dentro de um WorkspaceProvider.',
}
