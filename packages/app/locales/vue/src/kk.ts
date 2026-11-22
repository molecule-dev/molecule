import type { VueTranslations } from './types.js'

/** Vue translations for Kazakh. */
export const kk: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Мұнда маршрутизатор жоқ. Қолданбаны маршруттау байланысынан (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider` ішіне ораңыз немесе `router` `moleculePlugin` қызметіне жіберіңіз. Егер қолданба мұны бұрыннан жасаса, оның маршруттау байланысы осы байланыстан ескі: оны жаңартыңыз (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Бұл бағыттау байланысының мұнда көрсетуге арналған бағыттау көрінісі жоқ: оның орнына бетті бала ретінде беріңіз. Егер қолданба `@molecule/app-routing-vue-router` арқылы бағыттаса, бұл байланыс осы байланыстырудан ескірек: оны жаңартыңыз (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider StateProvider ішінде пайдаланылуы керек',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider ішінде пайдаланылуы керек',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ішінде пайдаланылуы керек',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ішінде пайдаланылуы керек',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ішінде пайдаланылуы керек',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ішінде пайдаланылуы керек',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider ішінде пайдаланылуы керек',
  'vue.error.unsupportedMethod': 'Қолдау көрсетілмейтін әдіс: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider ішінде пайдаланылуы керек',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ішінде пайдаланылуы керек',
  'vue.error.oauthFailed': 'OAuth кіру сәтсіз аяқталды',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider бағдарламасы PreviewProvider ішінде пайдаланылуы керек',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ішінде пайдаланылуы керек',
}
