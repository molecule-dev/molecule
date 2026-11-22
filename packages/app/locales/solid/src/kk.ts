import type { SolidTranslations } from './types.js'

/** Solid translations for Kazakh. */
export const kk: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider MoleculeProvider ішінде конфигурацияланған пайдалану қажет күймен',
  'solid.error.authOutsideProvider':
    'getAuthClient MoleculeProvider ішінде конфигурацияланған пайдалану қажет аутентификациямен',
  'solid.error.themeOutsideProvider':
    'getThemeProvider MoleculeProvider ішінде конфигурацияланған пайдалану қажет тақырыппен',
  'solid.error.routerOutsideProvider':
    'getRouter MoleculeProvider ішінде конфигурацияланған пайдалану қажет роутермен',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider MoleculeProvider ішінде конфигурацияланған пайдалану қажет i18n-мен',
  'solid.error.httpOutsideProvider':
    'getHttpClient MoleculeProvider ішінде конфигурацияланған пайдалану қажет HTTP-мен',
  'solid.error.storageOutsideProvider':
    'getStorageProvider MoleculeProvider ішінде конфигурацияланған пайдалану қажет сақтаумен',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider MoleculeProvider ішінде конфигурацияланған пайдалану қажет логгермен',
  'solid.error.useAccordionOutsideProvider':
    'Accordion компоненттері Accordion ішінде пайдаланылуы керек',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider ішінде пайдаланылуы керек',
  'solid.error.useChatOutsideProvider': 'useChatProvider ChatProvider ішінде пайдаланылуы керек',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ішінде пайдаланылуы керек',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ішінде пайдаланылуы керек',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider бағдарламасы PreviewProvider ішінде пайдаланылуы керек',
  'solid.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ішінде пайдаланылуы керек',
  'solid.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ішінде пайдаланылуы керек',
  'solid.error.unsupportedMethod': 'Қолдау көрсетілмейтін әдіс: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ішінде пайдаланылуы керек',
  'solid.error.oauthFailed': 'OAuth кіру сәтсіз аяқталды',
  'solid.error.useRouterOutsideProvider':
    'Мұнда маршрутизатор жоқ. Маршрутизатордың `root` ретінде маршруттау байланысынан (`@molecule/app-routing-solid-router`) `MoleculeRouterProvider` пайдаланыңыз немесе `router` `MoleculeProvider`-ге беріңіз.',
  'solid.error.noRoutedView':
    'Мұнда маршрутталған көрініс жоқ. Solid Router маршруттың компонентіне өзінің ішкі маршрутын `props.children` ретінде береді: мұны маршруттың `component` ретінде пайдаланыңыз немесе бетті бала ретінде беріңіз.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider StateProvider ішінде пайдаланылуы керек',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ішінде пайдаланылуы керек',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider ішінде пайдаланылуы керек',
}
