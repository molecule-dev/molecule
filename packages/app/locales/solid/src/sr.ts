import type { SolidTranslations } from './types.js'

/** Solid translations for Serbian. */
export const sr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider мора се користити унутар MoleculeProvider-а са конфигурисаним стањем',
  'solid.error.authOutsideProvider':
    'getAuthClient мора се користити унутар MoleculeProvider-а са конфигурисаним аутентикацијом',
  'solid.error.themeOutsideProvider':
    'getThemeProvider мора се користити унутар MoleculeProvider-а са конфигурисаним темом',
  'solid.error.routerOutsideProvider':
    'getRouter мора се користити унутар MoleculeProvider-а са конфигурисаним рутером',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider мора се користити унутар MoleculeProvider-а са конфигурисаним i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient мора се користити унутар MoleculeProvider-а са конфигурисаним HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider мора се користити унутар MoleculeProvider-а са конфигурисаним складиштем',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider мора се користити унутар MoleculeProvider-а са конфигурисаним логером',
  'solid.error.useAccordionOutsideProvider':
    'Accordion компоненте морају се користити унутар Accordion-а',
  'solid.error.useToastOutsideProvider': 'useToast мора се користити унутар ToastProvider-а',
  'solid.error.useChatOutsideProvider': 'useChatProvider мора да се користи унутар ChatProvider-а',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора се користити унутар WorkspaceProvider-а',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider мора бити коришћен унутар EditorProvider-а',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider мора се користити унутар PreviewProvider-а',
  'solid.error.useAuthOutsideProvider': 'useAuthClient мора се користити унутар AuthProvider-а',
  'solid.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider-а',
  'solid.error.unsupportedMethod': 'Неподржана метода: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider мора се користити унутар LoggerProvider-а',
  'solid.error.oauthFailed': 'Пријављивање путем OAuth-а није успело',
  'solid.error.useRouterOutsideProvider':
    'Овде нема рутера. Користите `MoleculeRouterProvider` из везе рутирања (`@molecule/app-routing-solid-router`) као `root` рутера или проследите `router` `MoleculeProvider`. Ако апликација већ ово ради, њена веза рутирања је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Овде нема усмереног приказа. Solid Router даје компоненти руте њену угнежђену руту као `props.children`: користите ово као `component` руте или проследите страницу као децу.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider мора се користити унутар StateProvider-а',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider мора се користити унутар StorageProvider-а',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider мора се користити унутар ThemeProvider-а',
}
