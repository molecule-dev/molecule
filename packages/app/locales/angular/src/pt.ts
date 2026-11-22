import type { AngularTranslations } from './types.js'

/** Angular translations for Portuguese. */
export const pt: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider deve ser usado dentro de um ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'O useAuthClient deve ser usado dentro de um AuthProvider.',
  'angular.error.oauthFailed': 'Falha no login OAuth',
  'angular.error.unsupportedMethod': 'Método não suportado: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider deve ser usado dentro de um StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider deve ser usado dentro de um EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient deve ser usado dentro de um HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider deve ser usado dentro de um LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider deve ser usado dentro de um PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Não há roteador aqui. Adicione `provideMoleculeRouter()` do binding de roteamento (`@molecule/app-routing-angular-router`) aos provedores do aplicativo, após `provideRouter(routes)` do Angular, ou passe `router` para `provideMolecule`. Se o aplicativo já faz isso, seu binding de roteamento é mais antigo que este: atualize-o (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Esta vinculação de roteamento não possui uma visualização roteada para renderizar aqui: passe a página como filhos. Se o aplicativo roteia com `@molecule/app-routing-angular-router`, essa vinculação é mais antiga que esta vinculação: atualize-a (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider deve ser usado dentro de um StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider deve ser usado dentro de um ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider deve ser usado dentro de um WorkspaceProvider',
}
