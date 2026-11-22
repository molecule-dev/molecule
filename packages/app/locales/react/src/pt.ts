import type { ReactTranslations } from './types.js'

/** React translations for Portuguese. */
export const pt: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Os componentes Accordion devem ser usados dentro de um Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient deve ser usado dentro de um AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider deve ser usado dentro de um ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider deve ser usado dentro de um EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient deve ser usado dentro de um HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider deve ser usado dentro de um LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider deve ser usado dentro de um PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Não há roteador aqui. Monte um componente de roteador do binding de roteamento do aplicativo (`BrowserRouter` de `@molecule/app-routing-react-router`), ou passe `router` para `MoleculeProvider`. Se o aplicativo já faz isso, seu binding de roteamento é mais antigo que este: atualize-o (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Esta vinculação de roteamento não possui uma visualização roteada para renderizar aqui: passe a página como filhos. Se o aplicativo roteia com `@molecule/app-routing-react-router`, essa vinculação é mais antiga que esta vinculação: atualize-a (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider deve ser usado dentro de um StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider deve ser usado dentro de um StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider deve ser usado dentro de um ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider deve ser usado dentro de um WorkspaceProvider',
  'react.error.unsupportedMethod': 'Método não suportado: {{method}}',
  'react.error.oauthFailed': 'Falha no login com OAuth',
}
