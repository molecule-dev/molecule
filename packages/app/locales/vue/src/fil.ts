import type { VueTranslations } from './types.js'

/** Vue translations for Filipino. */
export const fil: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Walang router dito. I-wrap ang app sa `MoleculeRouterProvider` mula sa routing bond (`@molecule/app-routing-vue-router`), o ipasa ang `router` sa `moleculePlugin`. Kung ginagawa na ito ng app, ang routing bond nito ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Walang routed view na ire-render dito ang routing bond na ito: ipasa ang page bilang children sa halip. Kung ang app ay nagroute gamit ang `@molecule/app-routing-vue-router`, ang bond na iyon ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'Ang useStateProvider ay dapat gamitin sa loob ng StateProvider',
  'vue.error.useThemeOutsideProvider':
    'Ang useThemeProvider ay dapat gamitin sa loob ng ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'Ang useAuthClient ay dapat gamitin sa loob ng AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'Ang useStorageProvider ay dapat gamitin sa loob ng StorageProvider',
  'vue.error.useHttpOutsideProvider': 'Ang useHttpClient ay dapat gamitin sa loob ng HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'Ang useLoggerProvider ay dapat gamitin sa loob ng LoggerProvider',
  'vue.error.useToastOutsideProvider': 'Ang useToast ay dapat gamitin sa loob ng ToastProvider',
  'vue.error.unsupportedMethod': 'Hindi sinusuportahang paraan: {{method}}',
  'vue.error.useChatOutsideProvider':
    'Ang useChatProvider ay dapat gamitin sa loob ng ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'Dapat gamitin ang useEditorProvider sa loob ng isang EditorProvider',
  'vue.error.oauthFailed': 'Nabigo ang pag-login sa OAuth',
  'vue.error.usePreviewOutsideProvider':
    'Dapat gamitin ang usePreviewProvider sa loob ng isang PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'Dapat gamitin ang useWorkspaceProvider sa loob ng isang WorkspaceProvider',
}
