import type { SolidTranslations } from './types.js'

/** Solid translations for Portuguese. */
export const pt: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider deve ser usado dentro de um MoleculeProvider com estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient deve ser usado dentro de um MoleculeProvider com autenticação configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider deve ser usado dentro de um MoleculeProvider com tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter deve ser usado dentro de um MoleculeProvider com roteador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider deve ser usado dentro de um MoleculeProvider com i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient deve ser usado dentro de um MoleculeProvider com HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider deve ser usado dentro de um MoleculeProvider com armazenamento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider deve ser usado dentro de um MoleculeProvider com log configurado',
  'solid.error.useAccordionOutsideProvider':
    'Os componentes Accordion devem ser usados dentro de um Accordion',
  'solid.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider deve ser usado dentro de um ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'O parâmetro useWorkspaceProvider deve ser usado dentro de um WorkspaceProvider.',
  'solid.error.useEditorOutsideProvider':
    'O parâmetro useEditorProvider deve ser usado dentro de um EditorProvider.',
  'solid.error.usePreviewOutsideProvider':
    'O parâmetro usePreviewProvider deve ser usado dentro de um PreviewProvider.',
  'solid.error.useAuthOutsideProvider': 'O useAuthClient deve ser usado dentro de um AuthProvider.',
  'solid.error.useHttpOutsideProvider':
    'O método useHttpClient deve ser usado dentro de um HttpProvider.',
  'solid.error.unsupportedMethod': 'Método não suportado: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'O parâmetro useLoggerProvider deve ser usado dentro de um LoggerProvider.',
  'solid.error.oauthFailed': 'Falha no login OAuth',
  'solid.error.useRouterOutsideProvider':
    'O método useRouterInstance deve ser usado dentro de um RouterProvider.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider deve ser usado dentro de um StateProvider.',
  'solid.error.useStorageOutsideProvider':
    'O parâmetro useStorageProvider deve ser usado dentro de um StorageProvider.',
  'solid.error.useThemeOutsideProvider':
    'O parâmetro useThemeProvider deve ser usado dentro de um ThemeProvider.',
}
